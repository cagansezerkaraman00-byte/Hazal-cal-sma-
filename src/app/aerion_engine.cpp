// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 The AERION Authors
//
// aerion-engine: command-line front end of the C++ engine.
#include <cmath>
#include <cstdio>
#include <exception>
#include <iostream>
#include <map>
#include <sstream>
#include <string>
#include <string_view>
#include <vector>

#include <aerion/core/build_info.hpp>
#include <aerion/core/error.hpp>
#include <aerion/core/parallel.hpp>
#include <aerion/core/timer.hpp>
#include <aerion/field/cell_field.hpp>
#include <aerion/io/writers.hpp>
#include <aerion/solvers/poisson_2d.hpp>
#include <aerion/verification/manufactured.hpp>

namespace {

using aerion::Index;
using aerion::Real;

constexpr std::string_view kUsage = R"(usage: aerion-engine <command> [options]

commands:
  info          print version and build configuration
  version       print the version number
  poisson-mms   solve a manufactured-solution Poisson problem and report the
                discretisation error (code verification)
  help          show this message

poisson-mms options:
  --case NAME       sine-dirichlet | cosine-neumann | exp-mixed  (default sine-dirichlet)
  --levels N[,N..]  cells per unit length, one run per level      (default 32)
  --beta B          tanh wall-clustering strength, 0 = uniform     (default 0)
  --solver S        cg | sor                                       (default cg)
  --rtol R          relative residual tolerance                    (default 1e-10)
  --threads T       OpenMP threads (ignored in serial builds)
  --vtk FILE        write phi, exact solution, error and source of the finest level
  --csv FILE        same fields as CSV

Exit status of poisson-mms is 0 only if every linear solve converged.
)";

/// Minimal "--key value" option parser (all options take one value).
std::map<std::string, std::string> parse_options(const std::vector<std::string>& args,
                                                 std::size_t first) {
    std::map<std::string, std::string> opts;
    for (std::size_t k = first; k < args.size(); k += 2) {
        const std::string& key = args[k];
        aerion::require(key.rfind("--", 0) == 0, "unexpected argument '" + key + "'");
        aerion::require(k + 1 < args.size(), "option '" + key + "' needs a value");
        opts[key.substr(2)] = args[k + 1];
    }
    return opts;
}

std::string take(std::map<std::string, std::string>& opts, const std::string& key,
                 const std::string& fallback) {
    const auto it = opts.find(key);
    if (it == opts.end()) {
        return fallback;
    }
    std::string value = it->second;
    opts.erase(it);
    return value;
}

Real to_real(const std::string& text, const char* what) {
    std::size_t used = 0;
    double value = 0.0;
    try {
        value = std::stod(text, &used);
    } catch (const std::exception&) {
        used = 0;
    }
    aerion::require(used == text.size() && !text.empty(),
                    std::string("invalid number for ") + what + ": '" + text + "'");
    return value;
}

Index to_index(const std::string& text, const char* what) {
    const Real v = to_real(text, what);
    aerion::require(v == std::floor(v) && v >= 1 && v <= 1e6,
                    std::string("invalid integer for ") + what + ": '" + text + "'");
    return static_cast<Index>(v);
}

int run_poisson_mms(const std::vector<std::string>& args) {
    namespace av = aerion::verification;
    namespace as = aerion::solvers;

    auto opts = parse_options(args, 1);
    const std::string case_name = take(opts, "case", "sine-dirichlet");
    const Real beta = to_real(take(opts, "beta", "0"), "--beta");
    const std::string solver_name = take(opts, "solver", "cg");
    const Real rtol = to_real(take(opts, "rtol", "1e-10"), "--rtol");
    const std::string threads = take(opts, "threads", "");
    const std::string vtk_path = take(opts, "vtk", "");
    const std::string csv_path = take(opts, "csv", "");
    std::vector<Index> levels;
    {
        std::stringstream ss(take(opts, "levels", "32"));
        std::string item;
        while (std::getline(ss, item, ',')) {
            levels.push_back(to_index(item, "--levels"));
        }
    }
    aerion::require(opts.empty(),
                    "unknown option '--" + (opts.empty() ? "" : opts.begin()->first) + "'");
    aerion::require(!levels.empty(), "--levels must list at least one resolution");
    aerion::require(solver_name == "cg" || solver_name == "sor", "--solver must be cg or sor");
    if (!threads.empty()) {
        aerion::set_num_threads(static_cast<int>(to_index(threads, "--threads")));
    }

    av::ManufacturedSolution2D ms;
    bool found = false;
    for (const auto& candidate : av::all_manufactured_solutions()) {
        if (candidate.name == case_name) {
            ms = candidate;
            found = true;
        }
    }
    aerion::require(found, "unknown case '" + case_name + "'");

    as::PoissonOptions options;
    options.solver =
        solver_name == "cg" ? as::LinearSolverKind::ConjugateGradient : as::LinearSolverKind::SOR;
    options.control.relative_tolerance = rtol;
    options.control.max_iterations = 200000;
    options.control.record_history = false;

    std::cout << "AERION " << aerion::build_info().version << " | Poisson MMS verification\n"
              << "case " << ms.name << " on [" << ms.x_min << ", " << ms.x_max << "] x ["
              << ms.y_min << ", " << ms.y_max << "], beta = " << beta << ", solver " << solver_name
              << ", " << aerion::max_threads() << " thread(s)\n\n";
    std::printf("%8s %8s %10s %13s %7s %13s %7s %8s %11s %10s %9s\n", "nx", "ny", "h_max",
                "L2 error", "order", "Linf error", "order", "iters", "residual", "conserv.",
                "time[s]");

    bool all_converged = true;
    Real prev_l2 = 0.0;
    Real prev_inf = 0.0;
    Real prev_h = 0.0;
    for (std::size_t k = 0; k < levels.size(); ++k) {
        const Index n = levels[k];
        const auto nx =
            static_cast<Index>(std::lround(static_cast<Real>(n) * (ms.x_max - ms.x_min)));
        const auto ny =
            static_cast<Index>(std::lround(static_cast<Real>(n) * (ms.y_max - ms.y_min)));
        const auto grid = av::make_grid(ms, std::max<Index>(nx, 1), std::max<Index>(ny, 1), beta);
        const auto source = av::source_field(ms, grid);
        aerion::WallTimer timer;
        const auto sol =
            as::solve_poisson(grid, source, av::boundary_conditions(ms, grid), options);
        const double seconds = timer.elapsed_seconds();
        const auto err = av::error_norms(ms, grid, sol.phi, sol.report.singular);
        all_converged = all_converged && sol.report.solver.converged();

        Real h = 0.0;
        for (Index i = 0; i < grid.nx(); ++i) {
            h = std::max(h, grid.dx(i));
        }
        for (Index j = 0; j < grid.ny(); ++j) {
            h = std::max(h, grid.dy(j));
        }
        char order_l2[16] = "-";
        char order_inf[16] = "-";
        if (k > 0) {
            std::snprintf(order_l2, sizeof order_l2, "%.3f",
                          std::log(prev_l2 / err.l2) / std::log(prev_h / h));
            std::snprintf(order_inf, sizeof order_inf, "%.3f",
                          std::log(prev_inf / err.linf) / std::log(prev_h / h));
        }
        std::printf("%8td %8td %10.3e %13.6e %7s %13.6e %7s %8d %11.3e %10.2e %9.3f%s\n", grid.nx(),
                    grid.ny(), h, err.l2, order_l2, err.linf, order_inf,
                    sol.report.solver.iterations, sol.report.solver.final_residual_norm,
                    sol.report.conservation_error, seconds,
                    sol.report.solver.converged() ? "" : "  NOT CONVERGED");
        prev_l2 = err.l2;
        prev_inf = err.linf;
        prev_h = h;

        if (k + 1 == levels.size() && (!vtk_path.empty() || !csv_path.empty())) {
            const auto exact = aerion::sample_cell_centers(grid, ms.phi);
            auto error = exact;
            for (Index j = 0; j < grid.ny(); ++j) {
                for (Index i = 0; i < grid.nx(); ++i) {
                    error(i, j) = sol.phi(i, j) - exact(i, j);
                }
            }
            const aerion::io::CellScalar fields[] = {
                {"phi", sol.phi}, {"phi_exact", exact}, {"error", error}, {"source", source}};
            if (!vtk_path.empty()) {
                aerion::io::write_vtk_rectilinear(vtk_path, grid, fields, {},
                                                  "AERION Poisson MMS " + ms.name);
                std::cout << "wrote " << vtk_path << '\n';
            }
            if (!csv_path.empty()) {
                aerion::io::write_cell_csv(csv_path, grid, fields);
                std::cout << "wrote " << csv_path << '\n';
            }
        }
    }
    if (!all_converged) {
        std::cerr << "aerion-engine: at least one linear solve did not converge\n";
        return 3;
    }
    return 0;
}

int run(const std::vector<std::string>& args) {
    if (args.empty() || args[0] == "help" || args[0] == "--help" || args[0] == "-h") {
        std::cout << kUsage;
        return args.empty() ? 1 : 0;
    }
    const std::string& command = args[0];
    if (command == "version" || command == "--version") {
        std::cout << aerion::build_info().version << '\n';
        return 0;
    }
    if (command == "info") {
        std::cout << aerion::build_summary();
        return 0;
    }
    if (command == "poisson-mms") {
        return run_poisson_mms(args);
    }
    std::cerr << "aerion-engine: unknown command '" << command << "'\n\n" << kUsage;
    return 2;
}

}  // namespace

int main(int argc, char** argv) {
    try {
        return run(std::vector<std::string>(argv + 1, argv + argc));
    } catch (const aerion::Error& e) {
        std::cerr << "aerion-engine: error: " << e.what() << '\n';
    } catch (const std::exception& e) {
        std::cerr << "aerion-engine: unexpected error: " << e.what() << '\n';
    }
    return 1;
}
