// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 The AERION Authors
#include <aerion/core/error.hpp>
#include <aerion/linalg/linear_solvers.hpp>
#include <aerion/linalg/stencil_matrix_2d.hpp>
#include <aerion/linalg/vector_ops.hpp>

#include <gtest/gtest.h>

#include <cmath>
#include <random>
#include <vector>

namespace aerion::linalg {
namespace {

/// Random symmetric, strictly diagonally dominant (hence SPD) 5-point matrix.
StencilMatrix2D random_spd(Index nx, Index ny, unsigned seed) {
    std::mt19937 rng(seed);
    std::uniform_real_distribution<Real> dist(0.1, 1.0);
    StencilMatrix2D a(nx, ny);
    auto c = a.center();
    auto e = a.east();
    auto w = a.west();
    auto n = a.north();
    auto s = a.south();
    for (Index j = 0; j < ny; ++j) {
        for (Index i = 0; i < nx; ++i) {
            const auto k = static_cast<std::size_t>(a.index(i, j));
            if (i + 1 < nx) {
                const Real v = -dist(rng);
                e[k] = v;
                w[k + 1] = v;
            }
            if (j + 1 < ny) {
                const Real v = -dist(rng);
                n[k] = v;
                s[k + static_cast<std::size_t>(nx)] = v;
            }
        }
    }
    for (std::size_t k = 0; k < c.size(); ++k) {
        c[k] = 0.05 + std::abs(e[k]) + std::abs(w[k]) + std::abs(n[k]) + std::abs(s[k]);
    }
    return a;
}

std::vector<Real> random_vector(std::size_t n, unsigned seed) {
    std::mt19937 rng(seed);
    std::uniform_real_distribution<Real> dist(-1.0, 1.0);
    std::vector<Real> v(n);
    for (auto& x : v) {
        x = dist(rng);
    }
    return v;
}

Real max_abs_diff(const std::vector<Real>& a, const std::vector<Real>& b) {
    Real m = 0.0;
    for (std::size_t k = 0; k < a.size(); ++k) {
        m = std::max(m, std::abs(a[k] - b[k]));
    }
    return m;
}

TEST(VectorOps, Basics) {
    std::vector<Real> a{1.0, -2.0, 3.0};
    std::vector<Real> b{4.0, 5.0, -6.0};
    EXPECT_DOUBLE_EQ(dot(a, b), 4.0 - 10.0 - 18.0);
    EXPECT_DOUBLE_EQ(norm2(a), std::sqrt(14.0));
    EXPECT_DOUBLE_EQ(norm_inf(b), 6.0);
    EXPECT_DOUBLE_EQ(sum(a), 2.0);
    axpy(2.0, a, b);  // b = 2a + b
    EXPECT_EQ(b, (std::vector<Real>{6.0, 1.0, 0.0}));
    xpby(a, -1.0, b);  // b = a - b
    EXPECT_EQ(b, (std::vector<Real>{-5.0, -3.0, 3.0}));
    remove_mean(a);
    EXPECT_NEAR(sum(a), 0.0, 1e-15);
    EXPECT_TRUE(all_finite(a));
    a[1] = std::nan("");
    EXPECT_FALSE(all_finite(a));
    EXPECT_THROW((void)dot(a, std::vector<Real>{1.0}), InvalidArgument);
}

TEST(VectorOps, LongVectorsMatchSerialReference) {
    // Exercises the OpenMP code path (n > omp_min_parallel_size).
    const auto x = random_vector(100000, 1);
    const auto y = random_vector(100000, 2);
    Real ref = 0.0;
    for (std::size_t k = 0; k < x.size(); ++k) {
        ref += x[k] * y[k];
    }
    EXPECT_NEAR(dot(x, y), ref, 1e-10 * std::abs(ref) + 1e-12);
}

TEST(StencilMatrix2D, MultiplyMatchesDense) {
    const auto a = random_spd(5, 4, 7);
    const auto x = random_vector(20, 3);
    std::vector<Real> y(20);
    a.multiply(x, y);
    const auto dense = a.to_dense();
    for (std::size_t r = 0; r < 20; ++r) {
        Real ref = 0.0;
        for (std::size_t col = 0; col < 20; ++col) {
            ref += dense[r * 20 + col] * x[col];
        }
        EXPECT_NEAR(y[r], ref, 1e-14);
    }
    EXPECT_TRUE(a.is_symmetric());
    EXPECT_TRUE(a.is_diagonally_dominant());
    EXPECT_NO_THROW(a.validate());
}

TEST(StencilMatrix2D, ValidateRejectsBrokenStructure) {
    StencilMatrix2D a(3, 3);
    for (auto& c : a.center()) {
        c = 1.0;
    }
    EXPECT_NO_THROW(a.validate());
    a.west()[0] = -1.0;  // cell (0,0) has no west neighbour
    EXPECT_THROW(a.validate(), InvalidArgument);
    a.west()[0] = 0.0;
    a.center()[4] = 0.0;
    EXPECT_THROW(a.validate(), InvalidArgument);
    a.center()[4] = 1.0;
    a.east()[1] = 0.5;
    EXPECT_FALSE(a.is_symmetric());
}

class SolverTest : public ::testing::TestWithParam<int> {};

TEST_P(SolverTest, CgAndSorRecoverKnownSolution) {
    const auto seed = static_cast<unsigned>(GetParam());
    const auto a = random_spd(12, 9, seed);
    const auto x_true = random_vector(108, seed + 100);
    std::vector<Real> b(108);
    a.multiply(x_true, b);

    SolverControl control;
    control.relative_tolerance = 1e-12;

    for (const auto pre : {Preconditioner::None, Preconditioner::Jacobi}) {
        std::vector<Real> x(108, 0.0);
        const auto stats = conjugate_gradient(a, b, x, control, pre);
        ASSERT_TRUE(stats.converged()) << to_string(stats.status);
        EXPECT_LE(stats.final_residual_norm, stats.tolerance);
        EXPECT_LT(max_abs_diff(x, x_true), 1e-9);
        EXPECT_EQ(stats.residual_history.size(), static_cast<std::size_t>(stats.iterations) + 1);
    }
    std::vector<Real> x(108, 0.0);
    const auto stats = sor(a, b, x, control, 1.2);
    ASSERT_TRUE(stats.converged()) << to_string(stats.status);
    EXPECT_LT(max_abs_diff(x, x_true), 1e-9);
}

INSTANTIATE_TEST_SUITE_P(RandomSpd, SolverTest, ::testing::Values(1, 2, 3, 4));

TEST(ConjugateGradient, FiniteTerminationOnSmallSystem) {
    // 1D Laplacian [-1 2 -1] of size 10: CG must converge within n iterations.
    StencilMatrix2D a(10, 1);
    for (Index i = 0; i < 10; ++i) {
        a.center()[static_cast<std::size_t>(i)] = 2.0;
        if (i > 0) {
            a.west()[static_cast<std::size_t>(i)] = -1.0;
        }
        if (i < 9) {
            a.east()[static_cast<std::size_t>(i)] = -1.0;
        }
    }
    const std::vector<Real> b(10, 1.0);
    std::vector<Real> x(10, 0.0);
    SolverControl control;
    control.relative_tolerance = 1e-12;
    const auto stats = conjugate_gradient(a, b, x, control, Preconditioner::None);
    ASSERT_TRUE(stats.converged());
    EXPECT_LE(stats.iterations, 10);
    // Exact solution of  -x'' = 1  on the discrete grid: x_i = (i+1)(10-i)/2.
    for (Index i = 0; i < 10; ++i) {
        EXPECT_NEAR(x[static_cast<std::size_t>(i)], 0.5 * static_cast<Real>((i + 1) * (10 - i)),
                    1e-10);
    }
}

TEST(ConjugateGradient, WarmStartFromSolutionTakesZeroIterations) {
    const auto a = random_spd(6, 6, 11);
    const auto x_true = random_vector(36, 12);
    std::vector<Real> b(36);
    a.multiply(x_true, b);
    auto x = x_true;
    const auto stats = conjugate_gradient(a, b, x, SolverControl{});
    EXPECT_TRUE(stats.converged());
    EXPECT_EQ(stats.iterations, 0);
}

TEST(ConjugateGradient, ReportsBreakdownOnNegativeDefiniteMatrix) {
    StencilMatrix2D a(4, 4);
    for (auto& c : a.center()) {
        c = -1.0;
    }
    const std::vector<Real> b(16, 1.0);
    std::vector<Real> x(16, 0.0);
    const auto stats = conjugate_gradient(a, b, x, SolverControl{}, Preconditioner::None);
    EXPECT_EQ(stats.status, SolverStatus::Breakdown);
    EXPECT_THROW((void)conjugate_gradient(a, b, x, SolverControl{}, Preconditioner::Jacobi),
                 InvalidArgument);
}

TEST(IterativeSolvers, ReportNonConvergenceHonestly) {
    const auto a = random_spd(30, 30, 5);
    const auto b = random_vector(900, 6);
    std::vector<Real> x(900, 0.0);
    SolverControl control;
    control.max_iterations = 3;
    const auto cg = conjugate_gradient(a, b, x, control);
    EXPECT_EQ(cg.status, SolverStatus::MaxIterationsReached);
    EXPECT_FALSE(cg.converged());
    EXPECT_EQ(cg.iterations, 3);
    EXPECT_GT(cg.final_residual_norm, cg.tolerance);
    std::fill(x.begin(), x.end(), 0.0);
    const auto gs = sor(a, b, x, control, 1.0);
    EXPECT_EQ(gs.status, SolverStatus::MaxIterationsReached);
}

TEST(IterativeSolvers, RejectInvalidInput) {
    const auto a = random_spd(3, 3, 1);
    std::vector<Real> b(9, 1.0);
    std::vector<Real> x(9, 0.0);
    std::vector<Real> short_x(4, 0.0);
    EXPECT_THROW((void)conjugate_gradient(a, b, short_x, SolverControl{}), InvalidArgument);
    EXPECT_THROW((void)sor(a, b, x, SolverControl{}, 2.0), InvalidArgument);
    b[2] = std::nan("");
    EXPECT_THROW((void)sor(a, b, x, SolverControl{}, 1.0), InvalidArgument);
}

TEST(IterativeSolvers, ModelProblemOmega) {
    EXPECT_DOUBLE_EQ(model_problem_sor_omega(1, 1), 1.0);
    const Real w = model_problem_sor_omega(64, 32);
    EXPECT_GT(w, 1.9);
    EXPECT_LT(w, 2.0);
}

}  // namespace
}  // namespace aerion::linalg
