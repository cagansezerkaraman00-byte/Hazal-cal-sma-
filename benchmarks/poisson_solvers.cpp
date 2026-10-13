// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 The AERION Authors
//
// aerion-bench-poisson: wall-clock cost of the Poisson linear solvers.
//
// Solves the sine-dirichlet manufactured problem on uniform n x n grids from
// a zero initial guess and reports iterations, time and the discretisation
// error (to show that every timed solve produced a correct answer).
#include <aerion/core/build_info.hpp>
#include <aerion/core/error.hpp>
#include <aerion/core/parallel.hpp>
#include <aerion/core/timer.hpp>
#include <aerion/field/cell_field.hpp>
#include <aerion/solvers/poisson_2d.hpp>
#include <aerion/verification/manufactured.hpp>

#include <algorithm>
#include <cstdio>
#include <cstdlib>
#include <exception>
#include <fstream>
#include <iostream>
#include <string>
#include <vector>

namespace {

using aerion::Index;
using aerion::Real;
namespace as = aerion::solvers;
namespace av = aerion::verification;

struct Row {
    Index n;
    std::string solver;
    int threads;
    int iterations;
    double seconds;
    double ns_per_cell_iteration;
    Real l2_error;
    bool converged;
};

Row run(Index n, as::LinearSolverKind kind, Real rtol, int repeats) {
    const auto ms = av::sine_dirichlet();
    const auto grid = av::make_grid(ms, n, n);
    as::PoissonOptions options;
    options.solver = kind;
    options.control.relative_tolerance = rtol;
    options.control.max_iterations = 1000000;
    options.control.record_history = false;
    const as::PoissonSolver2D solver(grid, av::boundary_conditions(ms, grid), options);
    const auto f = av::source_field(ms, grid);

    std::vector<double> times;
    as::PoissonReport report;
    auto phi = aerion::make_cell_field(grid);
    for (int r = 0; r < repeats; ++r) {
        phi.fill(0.0);
        aerion::WallTimer timer;
        report = solver.solve(f, phi);
        times.push_back(timer.elapsed_seconds());
    }
    std::sort(times.begin(), times.end());
    const double t = times[times.size() / 2];  // median
    const int it = std::max(report.solver.iterations, 1);
    return {n,
            report.solver.method,
            aerion::max_threads(),
            report.solver.iterations,
            t,
            1e9 * t / (static_cast<double>(it) * static_cast<double>(n * n)),
            av::error_norms(ms, grid, phi, false).l2,
            report.solver.converged()};
}

}  // namespace

int main(int argc, char** argv) {
    try {
        Index max_n = 512;
        std::string csv;
        Real rtol = 1e-8;
        for (int k = 1; k + 1 < argc; k += 2) {
            const std::string key = argv[k];
            const std::string value = argv[k + 1];
            if (key == "--max-n") {
                max_n = std::stol(value);
            } else if (key == "--threads") {
                aerion::set_num_threads(std::stoi(value));
            } else if (key == "--csv") {
                csv = value;
            } else if (key == "--rtol") {
                rtol = std::stod(value);
            } else {
                throw aerion::InvalidArgument("unknown option " + key);
            }
        }
        std::cout << aerion::build_summary() << "\nrelative tolerance " << rtol << "\n\n";
        std::printf("%6s %-30s %7s %8s %10s %14s %12s %5s\n", "n", "solver", "threads", "iters",
                    "time[s]", "ns/(cell*it)", "L2 error", "conv");
        std::vector<Row> rows;
        for (Index n = 64; n <= max_n; n *= 2) {
            for (const auto kind : {as::LinearSolverKind::ConjugateGradient, as::LinearSolverKind::SOR}) {
                const int repeats = n <= 256 ? 5 : 3;
                const Row r = run(n, kind, rtol, repeats);
                std::printf("%6td %-30s %7d %8d %10.4f %14.2f %12.4e %5s\n", r.n, r.solver.c_str(),
                            r.threads, r.iterations, r.seconds, r.ns_per_cell_iteration, r.l2_error,
                            r.converged ? "yes" : "NO");
                std::fflush(stdout);
                rows.push_back(r);
            }
        }
        if (!csv.empty()) {
            std::ofstream out(csv);
            out << "n,solver,threads,iterations,seconds,ns_per_cell_iteration,l2_error,converged\n";
            for (const auto& r : rows) {
                out << r.n << ',' << r.solver << ',' << r.threads << ',' << r.iterations << ','
                    << r.seconds << ',' << r.ns_per_cell_iteration << ',' << r.l2_error << ','
                    << (r.converged ? 1 : 0) << '\n';
            }
        }
        const bool ok = std::all_of(rows.begin(), rows.end(), [](const Row& r) { return r.converged; });
        return ok ? EXIT_SUCCESS : EXIT_FAILURE;
    } catch (const std::exception& e) {
        std::cerr << "aerion-bench-poisson: " << e.what() << '\n';
        return EXIT_FAILURE;
    }
}
