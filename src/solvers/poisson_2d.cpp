// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 The AERION Authors
#include <algorithm>
#include <cmath>
#include <sstream>
#include <utility>

#include <aerion/core/error.hpp>
#include <aerion/core/logger.hpp>
#include <aerion/field/cell_field.hpp>
#include <aerion/linalg/vector_ops.hpp>
#include <aerion/solvers/poisson_2d.hpp>

namespace aerion::solvers {

namespace {

using mesh::StructuredGrid2D;

/// Geometry of boundary face `m` on `side`: owning cell, face area and the
/// distance from the owning cell centre to the face centre.
struct BoundaryFace {
    Index i;
    Index j;
    Real area;
    Real distance;
};

BoundaryFace boundary_face(const StructuredGrid2D& g, BoundarySide side, Index m) {
    switch (side) {
        case BoundarySide::West:
            return {0, m, g.dy(m), g.xc(0) - g.xf(0)};
        case BoundarySide::East:
            return {g.nx() - 1, m, g.dy(m), g.xf(g.nx()) - g.xc(g.nx() - 1)};
        case BoundarySide::South:
            return {m, 0, g.dx(m), g.yc(0) - g.yf(0)};
        case BoundarySide::North:
            break;
    }
    return {m, g.ny() - 1, g.dx(m), g.yf(g.ny()) - g.yc(g.ny() - 1)};
}

std::size_t at(Index k) noexcept {
    return static_cast<std::size_t>(k);
}

}  // namespace

PoissonSolver2D::PoissonSolver2D(StructuredGrid2D grid, BoundaryConditions2D bcs,
                                 PoissonOptions options)
    : grid_(std::move(grid)),
      bcs_(std::move(bcs)),
      options_(std::move(options)),
      matrix_(grid_.nx(), grid_.ny()) {
    bcs_.validate(grid_);
    assemble_matrix();
}

void PoissonSolver2D::set_boundary_condition(BoundarySide side, BoundaryCondition bc) {
    BoundaryConditions2D updated = bcs_;
    const bool type_changed = updated[side].type != bc.type;
    updated[side] = std::move(bc);
    updated.validate(grid_);
    bcs_ = std::move(updated);
    if (type_changed) {
        assemble_matrix();
    }
}

void PoissonSolver2D::assemble_matrix() {
    const Index nx = grid_.nx();
    const Index ny = grid_.ny();
    linalg::StencilMatrix2D a(nx, ny);
    auto c = a.center();
    auto e = a.east();
    auto w = a.west();
    auto n = a.north();
    auto s = a.south();

    // Interior faces: conductance A_f / |x_nb - x_P|, added symmetrically.
    for (Index j = 0; j < ny; ++j) {
        for (Index i = 0; i + 1 < nx; ++i) {
            const Index k = a.index(i, j);
            const Real coeff = grid_.dy(j) / (grid_.xc(i + 1) - grid_.xc(i));
            e[at(k)] = -coeff;
            w[at(k + 1)] = -coeff;
            c[at(k)] += coeff;
            c[at(k + 1)] += coeff;
        }
    }
    for (Index j = 0; j + 1 < ny; ++j) {
        for (Index i = 0; i < nx; ++i) {
            const Index k = a.index(i, j);
            const Real coeff = grid_.dx(i) / (grid_.yc(j + 1) - grid_.yc(j));
            n[at(k)] = -coeff;
            s[at(k + nx)] = -coeff;
            c[at(k)] += coeff;
            c[at(k + nx)] += coeff;
        }
    }
    // Dirichlet faces contribute to the diagonal; Neumann faces only to b.
    for (const auto side : all_sides) {
        if (bcs_[side].type != BoundaryType::Dirichlet) {
            continue;
        }
        for (Index m = 0; m < boundary_face_count(grid_, side); ++m) {
            const auto f = boundary_face(grid_, side, m);
            c[at(a.index(f.i, f.j))] += f.area / f.distance;
        }
    }
    matrix_ = std::move(a);
}

std::vector<Real> PoissonSolver2D::assemble_rhs(const ScalarField2D& source) const {
    require_cell_field(grid_, source, "Poisson source");
    require(linalg::all_finite(source.values()), "Poisson source contains NaN/Inf");
    std::vector<Real> b(at(grid_.num_cells()));
    for (Index j = 0; j < grid_.ny(); ++j) {
        for (Index i = 0; i < grid_.nx(); ++i) {
            b[at(grid_.cell_index(i, j))] = -source(i, j) * grid_.volume(i, j);
        }
    }
    for (const auto side : all_sides) {
        const auto& bc = bcs_[side];
        for (Index m = 0; m < boundary_face_count(grid_, side); ++m) {
            const auto f = boundary_face(grid_, side, m);
            const Real contribution = bc.type == BoundaryType::Dirichlet
                                          ? f.area / f.distance * bc.value(m)
                                          : f.area * bc.value(m);
            b[at(grid_.cell_index(f.i, f.j))] += contribution;
        }
    }
    return b;
}

std::array<Real, 4> PoissonSolver2D::boundary_fluxes(const ScalarField2D& phi) const {
    require_cell_field(grid_, phi, "phi");
    std::array<Real, 4> flux{};
    for (const auto side : all_sides) {
        const auto& bc = bcs_[side];
        Real total = 0.0;
        for (Index m = 0; m < boundary_face_count(grid_, side); ++m) {
            const auto f = boundary_face(grid_, side, m);
            total += bc.type == BoundaryType::Dirichlet
                         ? f.area * (bc.value(m) - phi(f.i, f.j)) / f.distance
                         : f.area * bc.value(m);
        }
        flux[static_cast<std::size_t>(side)] = total;
    }
    return flux;
}

PoissonReport PoissonSolver2D::solve(const ScalarField2D& source, ScalarField2D& phi) const {
    require_cell_field(grid_, phi, "phi");
    require(linalg::all_finite(phi.values()), "Poisson initial guess contains NaN/Inf");
    std::vector<Real> b = assemble_rhs(source);

    PoissonReport report;
    report.singular = is_singular();

    // Scale for relative measures: total magnitude of sources and boundary fluxes.
    Real source_scale = 0.0;
    for (Index j = 0; j < grid_.ny(); ++j) {
        for (Index i = 0; i < grid_.nx(); ++i) {
            source_scale += std::abs(source(i, j)) * grid_.volume(i, j);
        }
    }

    linalg::SolverControl control = options_.control;
    if (report.singular) {
        // Solvability: sum(b) = -int f dV + oint g dA must vanish.
        Real neumann_scale = 0.0;
        for (const auto side : all_sides) {
            for (Index m = 0; m < boundary_face_count(grid_, side); ++m) {
                neumann_scale += std::abs(bcs_[side].value(m)) * boundary_face(grid_, side, m).area;
            }
        }
        const Real scale = source_scale + neumann_scale;
        const Real defect = linalg::sum(b);
        report.compatibility_defect = scale > 0.0 ? std::abs(defect) / scale : 0.0;
        if (report.compatibility_defect > options_.compatibility_tolerance) {
            std::ostringstream os;
            os << "pure-Neumann Poisson problem violates the solvability condition "
                  "int f dV = oint dphi/dn dA (relative defect "
               << report.compatibility_defect
               << "); solving the nearest compatible problem instead";
            log_warning(os.str());
        }
        linalg::remove_mean(b);
        control.constant_nullspace = true;
    }

    auto x = phi.values();
    if (options_.solver == LinearSolverKind::ConjugateGradient) {
        report.solver = linalg::conjugate_gradient(matrix_, b, x, control, options_.preconditioner);
    } else {
        report.solver = linalg::sor(matrix_, b, x, control, options_.sor_omega);
    }

    if (report.singular) {
        const Real mean = volume_average(grid_, phi);
        for (Real& v : phi.values()) {
            v -= mean;
        }
    }

    // Global conservation check from the computed field.
    const auto fluxes = boundary_fluxes(phi);
    Real net_flux = 0.0;
    Real flux_scale = 0.0;
    for (const Real f : fluxes) {
        net_flux += f;
        flux_scale += std::abs(f);
    }
    const Real total_source = volume_integral(grid_, source);
    const Real scale = std::max(source_scale, flux_scale);
    report.conservation_error = scale > 0.0 ? std::abs(net_flux - total_source) / scale : 0.0;

    if (!report.solver.converged()) {
        std::ostringstream os;
        os << "Poisson solve did not converge (" << report.solver.method << ": "
           << linalg::to_string(report.solver.status) << " after " << report.solver.iterations
           << " iterations, residual " << report.solver.final_residual_norm << " > target "
           << report.solver.tolerance << ")";
        log_warning(os.str());
    }
    return report;
}

PoissonSolution solve_poisson(const StructuredGrid2D& grid, const ScalarField2D& source,
                              const BoundaryConditions2D& bcs, const PoissonOptions& options) {
    const PoissonSolver2D solver(grid, bcs, options);
    PoissonSolution out{make_cell_field(grid), {}};
    out.report = solver.solve(source, out.phi);
    return out;
}

}  // namespace aerion::solvers
