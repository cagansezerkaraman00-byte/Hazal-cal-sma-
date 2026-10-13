// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 The AERION Authors
//
// Verification of the finite-volume Poisson solver:
//  * algebraic properties of the assembled operator,
//  * exact reproduction of linear fields (consistency / "patch" test),
//  * observed order of accuracy with manufactured solutions on uniform and
//    stretched grids, for Dirichlet, Neumann and mixed boundary conditions,
//  * global conservation and pure-Neumann solvability handling.
#include <aerion/core/error.hpp>
#include <aerion/core/logger.hpp>
#include <aerion/field/cell_field.hpp>
#include <aerion/mesh/spacing.hpp>
#include <aerion/solvers/poisson_2d.hpp>
#include <aerion/verification/manufactured.hpp>

#include <gtest/gtest.h>

#include <cmath>
#include <string>
#include <vector>

namespace aerion::solvers {
namespace {

using mesh::StructuredGrid2D;
using verification::ManufacturedSolution2D;

PoissonOptions tight_options(LinearSolverKind kind = LinearSolverKind::ConjugateGradient) {
    PoissonOptions o;
    o.solver = kind;
    o.control.relative_tolerance = 1e-12;
    o.control.max_iterations = 50000;
    return o;
}

struct MmsResult {
    verification::ErrorNorms error;
    PoissonReport report;
};

MmsResult run_mms(const ManufacturedSolution2D& ms, Index n, Real beta,
                  LinearSolverKind kind = LinearSolverKind::ConjugateGradient) {
    // Aspect-ratio-preserving resolution: dx == dy on uniform grids.
    const auto nx = static_cast<Index>(std::lround(static_cast<Real>(n) * (ms.x_max - ms.x_min)));
    const auto ny = static_cast<Index>(std::lround(static_cast<Real>(n) * (ms.y_max - ms.y_min)));
    const auto grid = verification::make_grid(ms, nx, ny, beta);
    const auto sol = solve_poisson(grid, verification::source_field(ms, grid),
                                   verification::boundary_conditions(ms, grid),
                                   tight_options(kind));
    return {verification::error_norms(ms, grid, sol.phi, sol.report.singular), sol.report};
}

TEST(PoissonAssembly, OperatorIsSymmetricAndDiagonallyDominant) {
    const StructuredGrid2D grid(mesh::tanh_clustered_faces(12, 0.0, 2.0, 2.0),
                                mesh::tanh_clustered_faces(7, -1.0, 1.0, 1.0));
    for (const auto type : {BoundaryType::Dirichlet, BoundaryType::Neumann}) {
        const PoissonSolver2D solver(grid, BoundaryConditions2D::all({type, {0.0}}));
        const auto& a = solver.matrix();
        EXPECT_NO_THROW(a.validate());
        EXPECT_TRUE(a.is_symmetric(1e-13));
        EXPECT_TRUE(a.is_diagonally_dominant());
        // Pure Neumann: every row sums to zero (constants are the null space).
        if (type == BoundaryType::Neumann) {
            std::vector<Real> ones(static_cast<std::size_t>(a.rows()), 1.0);
            std::vector<Real> y(ones.size());
            a.multiply(ones, y);
            for (const Real v : y) {
                EXPECT_NEAR(v, 0.0, 1e-12);
            }
        }
    }
}

TEST(PoissonAssembly, OneDimensionalStencilMatchesHandDerivation) {
    // 4 x 1 uniform cells of width h = 0.25 and height dy = 1, Dirichlet
    // west/east, Neumann south/north (so the problem is 1D). The face
    // conductance is dy/h = 4, and the half-cell Dirichlet conductance is
    // dy/(h/2) = 8:
    //   interior row: 4 * [-1, 2, -1],
    //   boundary row: diagonal 4 + 8 = 12, off-diagonal -4.
    const auto grid = StructuredGrid2D::uniform(4, 1, 0.0, 1.0, 0.0, 1.0);
    BoundaryConditions2D bcs;
    bcs.west = BoundaryCondition::dirichlet(1.0);
    bcs.east = BoundaryCondition::dirichlet(2.0);
    bcs.south = BoundaryCondition::neumann(0.0);
    bcs.north = BoundaryCondition::neumann(0.0);
    const PoissonSolver2D solver(grid, bcs);
    const auto dense = solver.matrix().to_dense();
    const std::vector<Real> expected = {12, -4, 0, 0, -4, 8, -4, 0, 0, -4, 8, -4, 0, 0, -4, 12};
    ASSERT_EQ(dense.size(), expected.size());
    for (std::size_t k = 0; k < dense.size(); ++k) {
        EXPECT_NEAR(dense[k], expected[k], 1e-14) << "entry " << k;
    }
    // RHS for f = 0: Dirichlet contribution 8 * phi_b in the boundary rows.
    const auto b = solver.assemble_rhs(make_cell_field(grid, 0.0));
    EXPECT_NEAR(b[0], 8.0, 1e-14);
    EXPECT_NEAR(b[1], 0.0, 1e-14);
    EXPECT_NEAR(b[3], 16.0, 1e-14);
}

TEST(PoissonConsistency, LinearFieldIsReproducedExactlyOnStretchedGrid) {
    // phi = 1 + 2x - 3y has zero Laplacian, and every face-flux formula of the
    // scheme is exact for linear fields, so the discrete solution must equal
    // phi to solver tolerance on any rectilinear grid.
    const StructuredGrid2D grid(mesh::tanh_clustered_faces(20, 0.0, 1.5, 3.0),
                                mesh::tanh_clustered_faces(13, 0.0, 1.0, 2.0));
    auto exact = [](Real x, Real y) { return 1.0 + 2.0 * x - 3.0 * y; };
    BoundaryConditions2D bcs;
    std::vector<Real> west, east, south;
    for (Index j = 0; j < grid.ny(); ++j) {
        west.push_back(exact(grid.x_min(), grid.yc(j)));
        east.push_back(exact(grid.x_max(), grid.yc(j)));
    }
    for (Index i = 0; i < grid.nx(); ++i) {
        south.push_back(exact(grid.xc(i), grid.y_min()));
    }
    bcs.west = BoundaryCondition::dirichlet(west);
    bcs.east = BoundaryCondition::dirichlet(east);
    bcs.south = BoundaryCondition::dirichlet(south);
    bcs.north = BoundaryCondition::neumann(-3.0);  // outward normal +y: dphi/dy = -3

    for (const auto kind : {LinearSolverKind::ConjugateGradient, LinearSolverKind::SOR}) {
        const auto sol = solve_poisson(grid, make_cell_field(grid, 0.0), bcs, tight_options(kind));
        ASSERT_TRUE(sol.report.solver.converged());
        Real max_err = 0.0;
        for (Index j = 0; j < grid.ny(); ++j) {
            for (Index i = 0; i < grid.nx(); ++i) {
                max_err = std::max(max_err, std::abs(sol.phi(i, j) - exact(grid.xc(i), grid.yc(j))));
            }
        }
        EXPECT_LT(max_err, 1e-9) << sol.report.solver.method;
    }
}

struct ConvergenceCase {
    const char* name;
    Real beta;
};

class PoissonConvergence : public ::testing::TestWithParam<ConvergenceCase> {};

TEST_P(PoissonConvergence, SecondOrderAccuracy) {
    const auto param = GetParam();
    ManufacturedSolution2D ms;
    for (const auto& candidate : verification::all_manufactured_solutions()) {
        if (candidate.name == param.name) {
            ms = candidate;
        }
    }
    ASSERT_EQ(ms.name, param.name);

    const std::vector<Index> levels = {16, 32, 64, 128};
    std::vector<MmsResult> results;
    for (const Index n : levels) {
        results.push_back(run_mms(ms, n, param.beta));
        ASSERT_TRUE(results.back().report.solver.converged());
        EXPECT_LT(results.back().report.conservation_error, 1e-9);
    }
    for (std::size_t k = 1; k < results.size(); ++k) {
        const Real p_l2 = std::log2(results[k - 1].error.l2 / results[k].error.l2);
        const Real p_inf = std::log2(results[k - 1].error.linf / results[k].error.linf);
        SCOPED_TRACE("levels " + std::to_string(levels[k - 1]) + " -> " +
                     std::to_string(levels[k]));
        EXPECT_GT(p_l2, 1.9);
        EXPECT_LT(p_l2, 2.2);
        EXPECT_GT(p_inf, 1.8);
    }
    // Absolute accuracy on the finest grid (guards against an O(1) error that
    // would still "converge" at second order towards the wrong answer).
    EXPECT_LT(results.back().error.l2, 2e-4);
}

INSTANTIATE_TEST_SUITE_P(
    ManufacturedSolutions, PoissonConvergence,
    ::testing::Values(ConvergenceCase{"sine-dirichlet", 0.0}, ConvergenceCase{"sine-dirichlet", 2.0},
                      ConvergenceCase{"cosine-neumann", 0.0}, ConvergenceCase{"cosine-neumann", 2.0},
                      ConvergenceCase{"exp-mixed", 0.0}, ConvergenceCase{"exp-mixed", 2.0}),
    [](const ::testing::TestParamInfo<ConvergenceCase>& param_info) {
        std::string name = param_info.param.name;
        for (auto& ch : name) {
            if (ch == '-') {
                ch = '_';
            }
        }
        return name + (param_info.param.beta > 0.0 ? "_stretched" : "_uniform");
    });

TEST(PoissonSolvers, SorAgreesWithConjugateGradient) {
    const auto ms = verification::exp_mixed();
    const auto cg = run_mms(ms, 32, 1.5, LinearSolverKind::ConjugateGradient);
    const auto sr = run_mms(ms, 32, 1.5, LinearSolverKind::SOR);
    ASSERT_TRUE(sr.report.solver.converged());
    EXPECT_NEAR(cg.error.l2, sr.error.l2, 1e-9);
}

TEST(PoissonSolver2D, ReusesMatrixAndWarmStarts) {
    const auto ms = verification::sine_dirichlet();
    const auto grid = verification::make_grid(ms, 32, 32);
    PoissonSolver2D solver(grid, verification::boundary_conditions(ms, grid), tight_options());
    const auto f = verification::source_field(ms, grid);
    auto phi = make_cell_field(grid);
    const auto first = solver.solve(f, phi);
    ASSERT_TRUE(first.solver.converged());
    EXPECT_GT(first.solver.iterations, 0);
    const auto second = solver.solve(f, phi);  // converged field as initial guess
    EXPECT_TRUE(second.solver.converged());
    EXPECT_EQ(second.solver.iterations, 0);
}

TEST(PoissonSolver2D, BoundaryFluxesBalanceTheSource) {
    const auto ms = verification::exp_mixed();
    const auto grid = verification::make_grid(ms, 64, 32, 1.0);
    const auto f = verification::source_field(ms, grid);
    const auto sol = solve_poisson(grid, f, verification::boundary_conditions(ms, grid),
                                   tight_options());
    const PoissonSolver2D solver(grid, verification::boundary_conditions(ms, grid));
    const auto flux = solver.boundary_fluxes(sol.phi);
    const Real net = flux[0] + flux[1] + flux[2] + flux[3];
    EXPECT_NEAR(net, volume_integral(grid, f), 1e-9 * std::abs(volume_integral(grid, f)));
}

TEST(PoissonSolver2D, ChangingBoundaryValuesKeepsMatrix) {
    const auto grid = StructuredGrid2D::uniform(8, 8, 0.0, 1.0, 0.0, 1.0);
    PoissonSolver2D solver(grid, BoundaryConditions2D::all(BoundaryCondition::dirichlet(0.0)),
                           tight_options());
    const auto before = solver.matrix().to_dense();
    solver.set_boundary_condition(BoundarySide::North, BoundaryCondition::dirichlet(1.0));
    EXPECT_EQ(solver.matrix().to_dense(), before);
    solver.set_boundary_condition(BoundarySide::North, BoundaryCondition::neumann(0.0));
    EXPECT_NE(solver.matrix().to_dense(), before);
    EXPECT_THROW(solver.set_boundary_condition(BoundarySide::West,
                                               BoundaryCondition::dirichlet({1.0, 2.0})),
                 InvalidArgument);
}

TEST(PoissonSolver2D, IncompatibleNeumannDataIsDetectedAndProjected) {
    // f = 1 with zero-flux boundaries has no solution (int f dV = 1 != 0).
    const auto grid = StructuredGrid2D::uniform(16, 16, 0.0, 1.0, 0.0, 1.0);
    std::vector<std::string> warnings;
    set_log_sink([&](LogLevel level, std::string_view msg) {
        if (level == LogLevel::Warning) {
            warnings.emplace_back(msg);
        }
    });
    const auto sol = solve_poisson(grid, make_cell_field(grid, 1.0),
                                   BoundaryConditions2D::all(BoundaryCondition::neumann(0.0)));
    set_log_sink({});
    EXPECT_TRUE(sol.report.singular);
    EXPECT_NEAR(sol.report.compatibility_defect, 1.0, 1e-12);
    EXPECT_TRUE(sol.report.solver.converged());
    ASSERT_FALSE(warnings.empty());
    EXPECT_NE(warnings.front().find("solvability"), std::string::npos);
    // The projected problem has f = 0 -> phi = const = 0 (zero-mean gauge).
    EXPECT_LT(norm_linf(grid, sol.phi), 1e-10);
}

TEST(PoissonSolver2D, CompatibleNeumannProblemHasZeroMeanSolution) {
    const auto ms = verification::cosine_neumann();
    const auto grid = verification::make_grid(ms, 24, 24);
    const auto sol = solve_poisson(grid, verification::source_field(ms, grid),
                                   verification::boundary_conditions(ms, grid), tight_options());
    EXPECT_TRUE(sol.report.singular);
    EXPECT_LT(sol.report.compatibility_defect, 1e-12);
    EXPECT_NEAR(volume_average(grid, sol.phi), 0.0, 1e-13);
}

TEST(PoissonSolver2D, RejectsInvalidInput) {
    const auto grid = StructuredGrid2D::uniform(4, 4, 0.0, 1.0, 0.0, 1.0);
    const auto bcs = BoundaryConditions2D::all(BoundaryCondition::dirichlet(0.0));
    const PoissonSolver2D solver(grid, bcs);
    auto phi = make_cell_field(grid);
    EXPECT_THROW((void)solver.solve(ScalarField2D(5, 4), phi), InvalidArgument);
    auto bad_source = make_cell_field(grid);
    bad_source(1, 1) = std::nan("");
    EXPECT_THROW((void)solver.solve(bad_source, phi), InvalidArgument);
    auto wrong_phi = ScalarField2D::with_ghosts(4, 4, 1);
    EXPECT_THROW((void)solver.solve(make_cell_field(grid), wrong_phi), InvalidArgument);
    EXPECT_THROW(PoissonSolver2D(grid, BoundaryConditions2D::all(
                                           BoundaryCondition::neumann({1.0, 2.0, 3.0}))),
                 InvalidArgument);
}

TEST(PoissonSolver2D, NonConvergenceIsReportedNotHidden) {
    const auto ms = verification::sine_dirichlet();
    const auto grid = verification::make_grid(ms, 64, 64);
    PoissonOptions options;
    options.control.max_iterations = 5;
    set_log_level(LogLevel::Off);
    const auto sol = solve_poisson(grid, verification::source_field(ms, grid),
                                   verification::boundary_conditions(ms, grid), options);
    set_log_level(LogLevel::Warning);
    EXPECT_FALSE(sol.report.solver.converged());
    EXPECT_EQ(sol.report.solver.status, linalg::SolverStatus::MaxIterationsReached);
    EXPECT_GT(sol.report.conservation_error, 1e-6);
}

}  // namespace
}  // namespace aerion::solvers
