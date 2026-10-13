// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 The AERION Authors
#pragma once

#include <aerion/core/types.hpp>
#include <aerion/linalg/stencil_matrix_2d.hpp>

#include <span>
#include <string>
#include <string_view>
#include <vector>

namespace aerion::linalg {

enum class SolverStatus {
    Converged,             ///< Residual criterion satisfied.
    MaxIterationsReached,  ///< Stopped at max_iterations without converging.
    Breakdown,             ///< Algorithmic breakdown (e.g. p^T A p <= 0 in CG).
    Diverged,              ///< Residual became non-finite or grew by > 1e10.
    /// The true residual stopped decreasing above the target: the requested
    /// tolerance lies below the floating-point floor of evaluating b - A x for
    /// this problem. The iterate is as accurate as round-off permits; use a
    /// looser tolerance rather than more iterations.
    Stagnated,
};

[[nodiscard]] std::string_view to_string(SolverStatus status) noexcept;

/// Stopping criteria shared by all iterative solvers.
///
/// Convergence is declared when the *true* residual satisfies
///
///     ||b - A x||_2 <= max(relative_tolerance * ||b||_2, absolute_tolerance),
///
/// with ||b||_2 replaced by the initial residual norm when b == 0. Measuring
/// against ||b|| (not the initial residual) makes the criterion independent
/// of the initial guess, which matters when warm-starting from the previous
/// time step.
struct SolverControl {
    int max_iterations = 10000;
    Real relative_tolerance = 1e-10;
    Real absolute_tolerance = 0.0;
    /// Record ||r||_2 after every iteration in SolverStats::residual_history.
    bool record_history = true;
    /// Treat the system as singular with the constant vector as null space
    /// (pure-Neumann problems): residuals are projected onto mean-zero vectors.
    bool constant_nullspace = false;
};

/// Outcome of an iterative solve. `residual_history[0]` is the initial
/// residual and entry m the residual after iteration m (for CG the
/// recursively updated residual, equal to b - A x up to round-off).
/// `final_residual_norm` is always recomputed explicitly as ||b - A x||_2.
struct SolverStats {
    std::string method;
    SolverStatus status = SolverStatus::MaxIterationsReached;
    int iterations = 0;
    Real rhs_norm = 0.0;
    Real initial_residual_norm = 0.0;
    Real final_residual_norm = 0.0;
    Real tolerance = 0.0;  ///< Absolute residual target that was applied.
    std::vector<Real> residual_history;

    [[nodiscard]] bool converged() const noexcept { return status == SolverStatus::Converged; }
};

enum class Preconditioner { None, Jacobi };

/// Preconditioned conjugate gradient method (Hestenes & Stiefel, 1952).
///
/// Requires A symmetric positive definite, or positive semi-definite with
/// `control.constant_nullspace` and a consistent right-hand side (sum b = 0).
/// `x` holds the initial guess on entry and the solution on exit.
/// In exact arithmetic CG converges in at most rows() iterations; for the
/// 2D Poisson matrix the iteration count grows like O(n) for an n x n grid.
SolverStats conjugate_gradient(const StencilMatrix2D& a, std::span<const Real> b,
                               std::span<Real> x, const SolverControl& control,
                               Preconditioner preconditioner = Preconditioner::Jacobi);

/// Successive over-relaxation with red-black (checkerboard) ordering.
///
/// Red-black ordering makes each half-sweep embarrassingly parallel for the
/// five-point stencil. Converges for symmetric positive definite matrices
/// when 0 < omega < 2; omega = 1 is Gauss-Seidel. Pass omega <= 0 to use the
/// optimum for the model Poisson problem, 2 / (1 + sin(pi / max(nx, ny))).
SolverStats sor(const StencilMatrix2D& a, std::span<const Real> b, std::span<Real> x,
                const SolverControl& control, Real omega = 0.0);

/// Optimal SOR factor of the model Dirichlet Poisson problem on an
/// nx x ny grid (Young, 1954); a good heuristic for related problems.
[[nodiscard]] Real model_problem_sor_omega(Index nx, Index ny) noexcept;

}  // namespace aerion::linalg
