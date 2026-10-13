// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 The AERION Authors
//
// pybind11 bindings of the AERION engine: the extension module aerion._core.
//
// Array convention: cell fields are exchanged as NumPy arrays of shape
// (nx, ny) indexed [i, j] ("ij" indexing, i along x). Data are copied at the
// boundary; the GIL is released while the engine computes.
#include <aerion/core/build_info.hpp>
#include <aerion/core/error.hpp>
#include <aerion/core/logger.hpp>
#include <aerion/core/parallel.hpp>
#include <aerion/field/array2d.hpp>
#include <aerion/io/writers.hpp>
#include <aerion/mesh/spacing.hpp>
#include <aerion/mesh/structured_grid_2d.hpp>
#include <aerion/solvers/poisson_2d.hpp>

#include <pybind11/numpy.h>
#include <pybind11/pybind11.h>
#include <pybind11/stl.h>
#include <pybind11/stl/filesystem.h>

#include <algorithm>
#include <exception>
#include <filesystem>
#include <optional>
#include <span>
#include <sstream>
#include <string>
#include <tuple>
#include <utility>
#include <vector>

namespace py = pybind11;
using namespace pybind11::literals;

namespace {

using aerion::Index;
using aerion::Real;
using aerion::ScalarField2D;
using aerion::mesh::StructuredGrid2D;
namespace solvers = aerion::solvers;
namespace linalg = aerion::linalg;

using InputArray = py::array_t<Real, py::array::forcecast>;

// ---------------------------------------------------------------------------
// Array conversion helpers
// ---------------------------------------------------------------------------
std::vector<Real> to_vector(const InputArray& a, const char* name) {
    if (a.ndim() != 1) {
        throw aerion::InvalidArgument(std::string(name) + ": expected a 1-D array");
    }
    const auto r = a.unchecked<1>();
    std::vector<Real> v(static_cast<std::size_t>(r.shape(0)));
    for (py::ssize_t k = 0; k < r.shape(0); ++k) {
        v[static_cast<std::size_t>(k)] = r(k);
    }
    return v;
}

py::array_t<Real> to_numpy(std::span<const Real> v) {
    py::array_t<Real> out(static_cast<py::ssize_t>(v.size()));
    std::copy(v.begin(), v.end(), out.mutable_data());
    return out;
}

ScalarField2D to_cell_field(const InputArray& a, const StructuredGrid2D& g, const char* name) {
    if (a.ndim() != 2 || a.shape(0) != g.nx() || a.shape(1) != g.ny()) {
        std::ostringstream os;
        os << name << ": expected an array of shape (nx, ny) = (" << g.nx() << ", " << g.ny()
           << ")";
        if (a.ndim() == 2) {
            os << ", got (" << a.shape(0) << ", " << a.shape(1) << ")";
        } else {
            os << ", got a " << a.ndim() << "-D array";
        }
        throw aerion::InvalidArgument(os.str());
    }
    const auto r = a.unchecked<2>();
    ScalarField2D f(g.nx(), g.ny());
    for (Index j = 0; j < g.ny(); ++j) {
        for (Index i = 0; i < g.nx(); ++i) {
            f(i, j) = r(i, j);
        }
    }
    return f;
}

/// (ni, nj) Fortran-ordered copy: the memory layout of Array2D (i fastest).
py::array_t<Real> to_numpy(const ScalarField2D& f) {
    py::array_t<Real, py::array::f_style> out({f.ni(), f.nj()});
    std::copy(f.data(), f.data() + f.size(), out.mutable_data());
    return out;
}

py::array_t<Real> vector_to_field_array(const std::vector<Real>& v, Index nx, Index ny) {
    py::array_t<Real, py::array::f_style> out({nx, ny});
    std::copy(v.begin(), v.end(), out.mutable_data());
    return out;
}

// ---------------------------------------------------------------------------
// Exceptions: AerionError (RuntimeError) is the base of all engine errors;
// the specific ones also derive from the matching built-in exception.
// ---------------------------------------------------------------------------
PyObject* g_aerion_error = nullptr;
PyObject* g_invalid_argument = nullptr;
PyObject* g_numerical_error = nullptr;
PyObject* g_io_error = nullptr;

PyObject* new_exception(py::module_& m, const char* name, PyObject* bases, const char* doc) {
    const std::string qualified = std::string("aerion._core.") + name;
    PyObject* type = PyErr_NewExceptionWithDoc(qualified.c_str(), doc, bases, nullptr);
    if (type == nullptr) {
        throw py::error_already_set();
    }
    m.attr(name) = py::handle(type);  // the module keeps a reference
    return type;
}

void register_exceptions(py::module_& m) {
    g_aerion_error = new_exception(m, "AerionError", PyExc_RuntimeError,
                                   "Base class of all errors raised by the AERION engine.");
    const py::tuple invalid_bases = py::make_tuple(py::handle(g_aerion_error),
                                                   py::handle(PyExc_ValueError));
    g_invalid_argument = new_exception(m, "InvalidArgumentError", invalid_bases.ptr(),
                                       "Invalid input (bad mesh size, mismatched shapes...).");
    const py::tuple numerical_bases = py::make_tuple(py::handle(g_aerion_error),
                                                     py::handle(PyExc_ArithmeticError));
    g_numerical_error = new_exception(m, "NumericalError", numerical_bases.ptr(),
                                      "A numerical failure (NaN, divergence...).");
    const py::tuple io_bases = py::make_tuple(py::handle(g_aerion_error),
                                              py::handle(PyExc_OSError));
    g_io_error = new_exception(m, "AerionIOError", io_bases.ptr(),
                               "Reading or writing a file failed.");

    py::register_exception_translator([](std::exception_ptr p) {
        try {
            if (p) {
                std::rethrow_exception(p);
            }
        } catch (const aerion::InvalidArgument& e) {
            PyErr_SetString(g_invalid_argument, e.what());
        } catch (const aerion::NumericalError& e) {
            PyErr_SetString(g_numerical_error, e.what());
        } catch (const aerion::IOError& e) {
            PyErr_SetString(g_io_error, e.what());
        } catch (const aerion::Error& e) {
            PyErr_SetString(g_aerion_error, e.what());
        }
    });
}

// ---------------------------------------------------------------------------
// Logging: forward engine messages to Python's logging module.
// ---------------------------------------------------------------------------
void install_python_log_sink() {
    aerion::set_log_sink([](aerion::LogLevel level, std::string_view message) {
        const py::gil_scoped_acquire gil;
        static const int levels[] = {10, 20, 30, 40, 50};  // logging.DEBUG..CRITICAL
        try {
            py::module_::import("logging")
                .attr("getLogger")("aerion.engine")
                .attr("log")(levels[static_cast<int>(level)], std::string(message));
        } catch (const py::error_already_set&) {
            // Never let a logging failure propagate into the numerical engine.
        }
    });
}

std::string repr_grid(const StructuredGrid2D& g) {
    std::ostringstream os;
    os << "StructuredGrid2D(nx=" << g.nx() << ", ny=" << g.ny() << ", x=[" << g.x_min() << ", "
       << g.x_max() << "], y=[" << g.y_min() << ", " << g.y_max() << "], "
       << (g.is_uniform() ? "uniform" : "stretched") << ")";
    return os.str();
}

std::string repr_bc(const solvers::BoundaryCondition& bc) {
    std::ostringstream os;
    os << "BoundaryCondition."
       << (bc.type == solvers::BoundaryType::Dirichlet ? "dirichlet(" : "neumann(");
    if (bc.values.size() == 1) {
        os << bc.values.front();
    } else {
        os << "<" << bc.values.size() << " face values>";
    }
    os << ")";
    return os.str();
}

}  // namespace

PYBIND11_MODULE(_core, m) {
    m.doc() = "AERION computational engine (C++20). Engineering the Invisible.";
    m.attr("__version__") = std::string(aerion::build_info().version);

    register_exceptions(m);

    // ----------------------------------------------------------------- core
    py::enum_<aerion::LogLevel>(m, "LogLevel")
        .value("DEBUG", aerion::LogLevel::Debug)
        .value("INFO", aerion::LogLevel::Info)
        .value("WARNING", aerion::LogLevel::Warning)
        .value("ERROR", aerion::LogLevel::Error)
        .value("OFF", aerion::LogLevel::Off);

    m.def("set_log_level", &aerion::set_log_level, "level"_a,
          "Minimum level of engine messages forwarded to the 'aerion.engine' logger.");
    m.def("log_level", &aerion::log_level);
    m.def("_install_python_log_sink", &install_python_log_sink);
    m.def("build_info", [] {
        const auto info = aerion::build_info();
        py::dict d;
        d["version"] = info.version;
        d["git_revision"] = info.git_revision;
        d["compiler"] = info.compiler;
        d["build_type"] = info.build_type;
        d["cxx_standard"] = info.cxx_standard;
        d["openmp"] = info.openmp;
        d["max_threads"] = info.max_threads;
        d["cuda"] = info.cuda;
        d["bounds_checking"] = info.bounds_checking;
        return d;
    });
    m.def("build_summary", &aerion::build_summary);
    m.def("openmp_enabled", &aerion::openmp_enabled);
    m.def("max_threads", &aerion::max_threads);
    m.def("set_num_threads", &aerion::set_num_threads, "threads"_a);

    // ----------------------------------------------------------------- mesh
    m.def(
        "uniform_faces",
        [](Index n, Real a, Real b) { return to_numpy(aerion::mesh::uniform_faces(n, a, b)); },
        "n"_a, "a"_a, "b"_a, "Face coordinates of n equal cells on [a, b] (n + 1 values).");
    m.def(
        "tanh_clustered_faces",
        [](Index n, Real a, Real b, Real beta) {
            return to_numpy(aerion::mesh::tanh_clustered_faces(n, a, b, beta));
        },
        "n"_a, "a"_a, "b"_a, "beta"_a,
        "Face coordinates of n cells on [a, b] clustered towards both ends (beta > 0).");

    py::class_<StructuredGrid2D>(m, "StructuredGrid2D",
                                 "2D rectilinear grid defined by its face coordinates.")
        .def(py::init([](const InputArray& x_faces, const InputArray& y_faces) {
                 return StructuredGrid2D(to_vector(x_faces, "x_faces"),
                                         to_vector(y_faces, "y_faces"));
             }),
             "x_faces"_a, "y_faces"_a)
        .def_static("uniform", &StructuredGrid2D::uniform, "nx"_a, "ny"_a, "x_min"_a, "x_max"_a,
                    "y_min"_a, "y_max"_a)
        .def_property_readonly("nx", &StructuredGrid2D::nx)
        .def_property_readonly("ny", &StructuredGrid2D::ny)
        .def_property_readonly("shape",
                               [](const StructuredGrid2D& g) { return py::make_tuple(g.nx(), g.ny()); })
        .def_property_readonly("num_cells", &StructuredGrid2D::num_cells)
        .def_property_readonly("x_min", &StructuredGrid2D::x_min)
        .def_property_readonly("x_max", &StructuredGrid2D::x_max)
        .def_property_readonly("y_min", &StructuredGrid2D::y_min)
        .def_property_readonly("y_max", &StructuredGrid2D::y_max)
        .def_property_readonly("length_x", &StructuredGrid2D::length_x)
        .def_property_readonly("length_y", &StructuredGrid2D::length_y)
        .def_property_readonly("x_faces",
                               [](const StructuredGrid2D& g) { return to_numpy(g.x_faces()); })
        .def_property_readonly("y_faces",
                               [](const StructuredGrid2D& g) { return to_numpy(g.y_faces()); })
        .def_property_readonly("x_centers",
                               [](const StructuredGrid2D& g) { return to_numpy(g.x_centers()); })
        .def_property_readonly("y_centers",
                               [](const StructuredGrid2D& g) { return to_numpy(g.y_centers()); })
        .def_property_readonly("dx",
                               [](const StructuredGrid2D& g) {
                                   std::vector<Real> v;
                                   for (Index i = 0; i < g.nx(); ++i) {
                                       v.push_back(g.dx(i));
                                   }
                                   return to_numpy(v);
                               })
        .def_property_readonly("dy",
                               [](const StructuredGrid2D& g) {
                                   std::vector<Real> v;
                                   for (Index j = 0; j < g.ny(); ++j) {
                                       v.push_back(g.dy(j));
                                   }
                                   return to_numpy(v);
                               })
        .def("cell_volumes",
             [](const StructuredGrid2D& g) {
                 ScalarField2D v(g.nx(), g.ny());
                 for (Index j = 0; j < g.ny(); ++j) {
                     for (Index i = 0; i < g.nx(); ++i) {
                         v(i, j) = g.volume(i, j);
                     }
                 }
                 return to_numpy(v);
             },
             "Cell areas (volume per unit depth) as an (nx, ny) array.")
        .def("cell_centers",
             [](const StructuredGrid2D& g) {
                 ScalarField2D x(g.nx(), g.ny());
                 ScalarField2D y(g.nx(), g.ny());
                 for (Index j = 0; j < g.ny(); ++j) {
                     for (Index i = 0; i < g.nx(); ++i) {
                         x(i, j) = g.xc(i);
                         y(i, j) = g.yc(j);
                     }
                 }
                 return py::make_tuple(to_numpy(x), to_numpy(y));
             },
             "Cell-centre coordinates (X, Y), each of shape (nx, ny).")
        .def_property_readonly("total_volume", &StructuredGrid2D::total_volume)
        .def_property_readonly("min_spacing", &StructuredGrid2D::min_spacing)
        .def_property_readonly("max_expansion_ratio", &StructuredGrid2D::max_expansion_ratio)
        .def("is_uniform", &StructuredGrid2D::is_uniform, "rel_tol"_a = 1e-12)
        .def("__repr__", &repr_grid);

    // ------------------------------------------------------------ boundary
    py::enum_<solvers::BoundarySide>(m, "BoundarySide")
        .value("WEST", solvers::BoundarySide::West)
        .value("EAST", solvers::BoundarySide::East)
        .value("SOUTH", solvers::BoundarySide::South)
        .value("NORTH", solvers::BoundarySide::North);

    py::enum_<solvers::BoundaryType>(m, "BoundaryType")
        .value("DIRICHLET", solvers::BoundaryType::Dirichlet)
        .value("NEUMANN", solvers::BoundaryType::Neumann);

    py::class_<solvers::BoundaryCondition>(
        m, "BoundaryCondition",
        "Scalar boundary condition on one side. Neumann values are derivatives along the "
        "OUTWARD normal. Values: one (uniform) or one per boundary face.")
        .def(py::init([](solvers::BoundaryType type, std::vector<Real> values) {
                 return solvers::BoundaryCondition{type, std::move(values)};
             }),
             "type"_a, "values"_a)
        .def_static("dirichlet", py::overload_cast<Real>(&solvers::BoundaryCondition::dirichlet),
                    "value"_a)
        .def_static("dirichlet",
                    py::overload_cast<std::vector<Real>>(&solvers::BoundaryCondition::dirichlet),
                    "values"_a)
        .def_static("neumann", py::overload_cast<Real>(&solvers::BoundaryCondition::neumann),
                    "outward_gradient"_a)
        .def_static("neumann",
                    py::overload_cast<std::vector<Real>>(&solvers::BoundaryCondition::neumann),
                    "outward_gradients"_a)
        .def_readwrite("type", &solvers::BoundaryCondition::type)
        .def_property(
            "values",
            [](const solvers::BoundaryCondition& bc) { return to_numpy(bc.values); },
            [](solvers::BoundaryCondition& bc, std::vector<Real> v) { bc.values = std::move(v); })
        .def("__repr__", &repr_bc);

    py::class_<solvers::BoundaryConditions2D>(m, "BoundaryConditions2D")
        .def(py::init([](solvers::BoundaryCondition west, solvers::BoundaryCondition east,
                         solvers::BoundaryCondition south, solvers::BoundaryCondition north) {
                 return solvers::BoundaryConditions2D{std::move(west), std::move(east),
                                                      std::move(south), std::move(north)};
             }),
             "west"_a, "east"_a, "south"_a, "north"_a)
        .def_static("all", &solvers::BoundaryConditions2D::all, "bc"_a,
                    "The same condition on all four sides.")
        .def_readwrite("west", &solvers::BoundaryConditions2D::west)
        .def_readwrite("east", &solvers::BoundaryConditions2D::east)
        .def_readwrite("south", &solvers::BoundaryConditions2D::south)
        .def_readwrite("north", &solvers::BoundaryConditions2D::north)
        .def("__getitem__",
             [](const solvers::BoundaryConditions2D& b, solvers::BoundarySide s) { return b[s]; })
        .def("all_neumann", &solvers::BoundaryConditions2D::all_neumann)
        .def("__repr__", [](const solvers::BoundaryConditions2D& b) {
            return "BoundaryConditions2D(west=" + repr_bc(b.west) + ", east=" + repr_bc(b.east) +
                   ", south=" + repr_bc(b.south) + ", north=" + repr_bc(b.north) + ")";
        });

    // -------------------------------------------------------- linear solvers
    py::enum_<linalg::SolverStatus>(m, "SolverStatus")
        .value("CONVERGED", linalg::SolverStatus::Converged)
        .value("MAX_ITERATIONS_REACHED", linalg::SolverStatus::MaxIterationsReached)
        .value("BREAKDOWN", linalg::SolverStatus::Breakdown)
        .value("DIVERGED", linalg::SolverStatus::Diverged);

    py::enum_<linalg::Preconditioner>(m, "Preconditioner")
        .value("NONE", linalg::Preconditioner::None)
        .value("JACOBI", linalg::Preconditioner::Jacobi);

    py::enum_<solvers::LinearSolverKind>(m, "LinearSolverKind")
        .value("CG", solvers::LinearSolverKind::ConjugateGradient)
        .value("SOR", solvers::LinearSolverKind::SOR);

    py::class_<linalg::SolverStats>(m, "SolverStats", "Outcome of an iterative linear solve.")
        .def_readonly("method", &linalg::SolverStats::method)
        .def_readonly("status", &linalg::SolverStats::status)
        .def_readonly("iterations", &linalg::SolverStats::iterations)
        .def_readonly("rhs_norm", &linalg::SolverStats::rhs_norm)
        .def_readonly("initial_residual_norm", &linalg::SolverStats::initial_residual_norm)
        .def_readonly("final_residual_norm", &linalg::SolverStats::final_residual_norm)
        .def_readonly("tolerance", &linalg::SolverStats::tolerance)
        .def_property_readonly("residual_history",
                               [](const linalg::SolverStats& s) {
                                   return to_numpy(s.residual_history);
                               })
        .def_property_readonly("converged", &linalg::SolverStats::converged)
        .def("__repr__", [](const linalg::SolverStats& s) {
            std::ostringstream os;
            os << "SolverStats(method='" << s.method << "', status=" << linalg::to_string(s.status)
               << ", iterations=" << s.iterations << ", residual=" << s.final_residual_norm
               << ", tolerance=" << s.tolerance << ")";
            return os.str();
        });

    py::class_<solvers::PoissonOptions>(m, "PoissonOptions")
        .def(py::init([](solvers::LinearSolverKind solver, Real relative_tolerance,
                         Real absolute_tolerance, int max_iterations,
                         linalg::Preconditioner preconditioner, Real sor_omega,
                         bool record_history, Real compatibility_tolerance) {
                 solvers::PoissonOptions o;
                 o.solver = solver;
                 o.control.relative_tolerance = relative_tolerance;
                 o.control.absolute_tolerance = absolute_tolerance;
                 o.control.max_iterations = max_iterations;
                 o.control.record_history = record_history;
                 o.preconditioner = preconditioner;
                 o.sor_omega = sor_omega;
                 o.compatibility_tolerance = compatibility_tolerance;
                 return o;
             }),
             "solver"_a = solvers::LinearSolverKind::ConjugateGradient,
             "relative_tolerance"_a = 1e-10, "absolute_tolerance"_a = 0.0,
             "max_iterations"_a = 10000, "preconditioner"_a = linalg::Preconditioner::Jacobi,
             "sor_omega"_a = 0.0, "record_history"_a = true, "compatibility_tolerance"_a = 1e-8)
        .def_readwrite("solver", &solvers::PoissonOptions::solver)
        .def_readwrite("preconditioner", &solvers::PoissonOptions::preconditioner)
        .def_readwrite("sor_omega", &solvers::PoissonOptions::sor_omega)
        .def_readwrite("compatibility_tolerance", &solvers::PoissonOptions::compatibility_tolerance)
        .def_property(
            "relative_tolerance",
            [](const solvers::PoissonOptions& o) { return o.control.relative_tolerance; },
            [](solvers::PoissonOptions& o, Real v) { o.control.relative_tolerance = v; })
        .def_property(
            "absolute_tolerance",
            [](const solvers::PoissonOptions& o) { return o.control.absolute_tolerance; },
            [](solvers::PoissonOptions& o, Real v) { o.control.absolute_tolerance = v; })
        .def_property(
            "max_iterations", [](const solvers::PoissonOptions& o) { return o.control.max_iterations; },
            [](solvers::PoissonOptions& o, int v) { o.control.max_iterations = v; })
        .def_property(
            "record_history", [](const solvers::PoissonOptions& o) { return o.control.record_history; },
            [](solvers::PoissonOptions& o, bool v) { o.control.record_history = v; });

    py::class_<solvers::PoissonReport>(m, "PoissonReport", "Diagnostics of one Poisson solve.")
        .def_readonly("solver", &solvers::PoissonReport::solver)
        .def_readonly("singular", &solvers::PoissonReport::singular)
        .def_readonly("compatibility_defect", &solvers::PoissonReport::compatibility_defect)
        .def_readonly("conservation_error", &solvers::PoissonReport::conservation_error)
        .def_property_readonly("converged",
                               [](const solvers::PoissonReport& r) { return r.solver.converged(); })
        .def("__repr__", [](const solvers::PoissonReport& r) {
            std::ostringstream os;
            os << "PoissonReport(converged=" << (r.solver.converged() ? "True" : "False")
               << ", iterations=" << r.solver.iterations << ", singular="
               << (r.singular ? "True" : "False")
               << ", conservation_error=" << r.conservation_error << ")";
            return os.str();
        });

    py::class_<solvers::PoissonSolution>(m, "PoissonSolution")
        .def_property_readonly("phi",
                               [](const solvers::PoissonSolution& s) { return to_numpy(s.phi); })
        .def_readonly("report", &solvers::PoissonSolution::report);

    py::class_<solvers::PoissonSolver2D>(
        m, "PoissonSolver2D",
        "Cell-centred finite-volume solver for laplacian(phi) = f. The matrix is assembled "
        "once and reused for every right-hand side.")
        .def(py::init<StructuredGrid2D, solvers::BoundaryConditions2D, solvers::PoissonOptions>(),
             "grid"_a, "boundary_conditions"_a, "options"_a = solvers::PoissonOptions{})
        .def_property_readonly("grid", &solvers::PoissonSolver2D::grid)
        .def_property_readonly("boundary_conditions",
                               &solvers::PoissonSolver2D::boundary_conditions)
        .def_property_readonly("is_singular", &solvers::PoissonSolver2D::is_singular)
        .def("set_boundary_condition", &solvers::PoissonSolver2D::set_boundary_condition, "side"_a,
             "bc"_a)
        .def(
            "solve",
            [](const solvers::PoissonSolver2D& self, const InputArray& source,
               const std::optional<InputArray>& initial_guess) {
                const auto& g = self.grid();
                const ScalarField2D f = to_cell_field(source, g, "source");
                solvers::PoissonSolution out{
                    initial_guess ? to_cell_field(*initial_guess, g, "initial_guess")
                                  : ScalarField2D(g.nx(), g.ny()),
                    {}};
                {
                    const py::gil_scoped_release release;
                    out.report = self.solve(f, out.phi);
                }
                return out;
            },
            "source"_a, "initial_guess"_a = py::none(),
            "Solve laplacian(phi) = source; returns a PoissonSolution (phi, report).")
        .def(
            "assemble_rhs",
            [](const solvers::PoissonSolver2D& self, const InputArray& source) {
                const auto& g = self.grid();
                return vector_to_field_array(self.assemble_rhs(to_cell_field(source, g, "source")),
                                             g.nx(), g.ny());
            },
            "source"_a)
        .def(
            "matrix_properties",
            [](const solvers::PoissonSolver2D& self) {
                py::dict d;
                d["rows"] = self.matrix().rows();
                d["symmetric"] = self.matrix().is_symmetric();
                d["diagonally_dominant"] = self.matrix().is_diagonally_dominant();
                return d;
            })
        .def(
            "boundary_fluxes",
            [](const solvers::PoissonSolver2D& self, const InputArray& phi) {
                const auto fluxes =
                    self.boundary_fluxes(to_cell_field(phi, self.grid(), "phi"));
                py::dict d;
                for (const auto side : solvers::all_sides) {
                    d[py::str(std::string(solvers::to_string(side)))] =
                        fluxes[static_cast<std::size_t>(side)];
                }
                return d;
            },
            "phi"_a, "Net outward flux of grad(phi) through each side.");

    m.def(
        "solve_poisson",
        [](const StructuredGrid2D& grid, const InputArray& source,
           const solvers::BoundaryConditions2D& bcs, const solvers::PoissonOptions& options) {
            const ScalarField2D f = to_cell_field(source, grid, "source");
            const py::gil_scoped_release release;
            return solvers::solve_poisson(grid, f, bcs, options);
        },
        "grid"_a, "source"_a, "boundary_conditions"_a, "options"_a = solvers::PoissonOptions{},
        "Solve laplacian(phi) = source from a zero initial guess.");

    // ------------------------------------------------------------------- io
    m.def(
        "write_vtk",
        [](const std::filesystem::path& path, const StructuredGrid2D& grid, const py::dict& scalars,
           const py::dict& vectors, const std::string& title) {
            std::vector<std::pair<std::string, ScalarField2D>> sdata;
            for (const auto& [key, value] : scalars) {
                const auto name = py::cast<std::string>(key);
                sdata.emplace_back(name, to_cell_field(py::cast<InputArray>(value), grid, name.c_str()));
            }
            std::vector<std::tuple<std::string, ScalarField2D, ScalarField2D>> vdata;
            for (const auto& [key, value] : vectors) {
                const auto name = py::cast<std::string>(key);
                const auto pair = py::cast<py::sequence>(value);
                if (pair.size() != 2) {
                    throw aerion::InvalidArgument("vector field '" + name +
                                                  "' must be a (u, v) pair of arrays");
                }
                vdata.emplace_back(name,
                                   to_cell_field(py::cast<InputArray>(pair[0]), grid, name.c_str()),
                                   to_cell_field(py::cast<InputArray>(pair[1]), grid, name.c_str()));
            }
            std::vector<aerion::io::CellScalar> s;
            for (const auto& [name, f] : sdata) {
                s.push_back({name, f});
            }
            std::vector<aerion::io::CellVector> v;
            for (const auto& [name, u, w] : vdata) {
                v.push_back({name, u, w});
            }
            aerion::io::write_vtk_rectilinear(path, grid, s, v, title);
        },
        "path"_a, "grid"_a, "scalars"_a, "vectors"_a = py::dict(), "title"_a = "AERION",
        "Write cell fields ({name: (nx, ny) array}) as a legacy VTK rectilinear grid.");

    m.def(
        "write_csv",
        [](const std::filesystem::path& path, const StructuredGrid2D& grid, const py::dict& scalars) {
            std::vector<std::pair<std::string, ScalarField2D>> sdata;
            for (const auto& [key, value] : scalars) {
                const auto name = py::cast<std::string>(key);
                sdata.emplace_back(name, to_cell_field(py::cast<InputArray>(value), grid, name.c_str()));
            }
            std::vector<aerion::io::CellScalar> s;
            for (const auto& [name, f] : sdata) {
                s.push_back({name, f});
            }
            aerion::io::write_cell_csv(path, grid, s);
        },
        "path"_a, "grid"_a, "scalars"_a, "Write cell fields as CSV (i, j, x, y, fields...).");
}
