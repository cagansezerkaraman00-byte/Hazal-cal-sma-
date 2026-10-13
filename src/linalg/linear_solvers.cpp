// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 The AERION Authors
#include <aerion/core/error.hpp>
#include <aerion/core/parallel.hpp>
#include <aerion/linalg/linear_solvers.hpp>
#include <aerion/linalg/vector_ops.hpp>

#include <algorithm>
#include <cmath>
#include <numbers>
#include <sstream>

namespace aerion::linalg {

std::string_view to_string(SolverStatus status) noexcept {
    switch (status) {
        case SolverStatus::Converged:
            return "converged";
        case SolverStatus::MaxIterationsReached:
            return "max-iterations-reached";
        case SolverStatus::Breakdown:
            return "breakdown";
        case SolverStatus::Diverged:
            return "diverged";
    }
    return "unknown";
}

Real model_problem_sor_omega(Index nx, Index ny) noexcept {
    const Index m = std::max(nx, ny);
    if (m < 2) {
        return 1.0;
    }
    return 2.0 / (1.0 + std::sin(std::numbers::pi / static_cast<Real>(m)));
}

namespace {

constexpr Real kDivergenceFactor = 1e10;

void check_inputs(const StencilMatrix2D& a, std::span<const Real> b, std::span<Real> x,
                  const SolverControl& control) {
    require(static_cast<Index>(b.size()) == a.rows(), "linear solver: size of b != matrix rows");
    require(static_cast<Index>(x.size()) == a.rows(), "linear solver: size of x != matrix rows");
    require(control.max_iterations >= 0, "linear solver: max_iterations must be >= 0");
    require(control.relative_tolerance >= 0.0 && control.absolute_tolerance >= 0.0,
            "linear solver: tolerances must be >= 0");
    require(all_finite(b), "linear solver: right-hand side contains NaN/Inf");
    require(all_finite(x), "linear solver: initial guess contains NaN/Inf");
}

/// Sets up the residual bookkeeping; returns the absolute tolerance.
Real start(SolverStats& stats, const SolverControl& control, std::span<const Real> b,
           Real r0) {
    stats.rhs_norm = norm2(b);
    stats.initial_residual_norm = r0;
    stats.final_residual_norm = r0;
    const Real reference = stats.rhs_norm > 0.0 ? stats.rhs_norm : r0;
    stats.tolerance = std::max(control.relative_tolerance * reference, control.absolute_tolerance);
    if (control.record_history) {
        stats.residual_history.reserve(static_cast<std::size_t>(control.max_iterations) + 1);
        stats.residual_history.push_back(r0);
    }
    return stats.tolerance;
}

bool diverging(Real rnorm, const SolverStats& stats) {
    const Real scale = std::max(stats.initial_residual_norm, stats.rhs_norm);
    return !std::isfinite(rnorm) || rnorm > kDivergenceFactor * scale;
}

Real true_residual(const StencilMatrix2D& a, std::span<const Real> b, std::span<const Real> x,
                   std::span<Real> r, bool project) {
    a.residual(b, x, r);
    if (project) {
        remove_mean(r);
    }
    return norm2(r);
}

void apply_preconditioner(const std::vector<Real>& inv_diag, std::span<const Real> r,
                          std::span<Real> z) {
    const Index n = static_cast<Index>(r.size());
    if (inv_diag.empty()) {
        std::copy(r.begin(), r.end(), z.begin());
        return;
    }
    const Real* pr = r.data();
    const Real* pd = inv_diag.data();
    Real* pz = z.data();
    AERION_OMP(parallel for if (n > omp_min_parallel_size))
    for (Index k = 0; k < n; ++k) {
        pz[k] = pd[k] * pr[k];
    }
}

}  // namespace

SolverStats conjugate_gradient(const StencilMatrix2D& a, std::span<const Real> b,
                               std::span<Real> x, const SolverControl& control,
                               Preconditioner preconditioner) {
    check_inputs(a, b, x, control);
    const auto n = static_cast<std::size_t>(a.rows());
    const bool project = control.constant_nullspace;

    SolverStats stats;
    stats.method = preconditioner == Preconditioner::Jacobi ? "pcg-jacobi" : "cg";

    std::vector<Real> inv_diag;
    if (preconditioner == Preconditioner::Jacobi) {
        inv_diag.resize(n);
        const auto c = a.center();
        for (std::size_t k = 0; k < n; ++k) {
            require(c[k] > 0.0, "conjugate_gradient: Jacobi preconditioning needs a positive "
                                "diagonal (is the matrix symmetric positive definite?)");
            inv_diag[k] = 1.0 / c[k];
        }
    }

    std::vector<Real> r(n), z(n), p(n), q(n);
    Real rnorm = true_residual(a, b, x, r, project);
    const Real tol = start(stats, control, b, rnorm);
    if (rnorm <= tol) {
        stats.status = SolverStatus::Converged;
        return stats;
    }

    apply_preconditioner(inv_diag, r, z);
    std::copy(z.begin(), z.end(), p.begin());
    Real rz = dot(r, z);

    stats.status = SolverStatus::MaxIterationsReached;
    for (int it = 1; it <= control.max_iterations; ++it) {
        a.multiply(p, q);
        const Real pq = dot(p, q);
        if (!std::isfinite(pq)) {
            stats.status = SolverStatus::Diverged;
            break;
        }
        if (pq <= 0.0) {
            stats.status = SolverStatus::Breakdown;
            break;
        }
        const Real alpha = rz / pq;
        axpy(alpha, p, x);
        axpy(-alpha, q, r);
        if (project) {
            remove_mean(r);
        }
        rnorm = norm2(r);
        stats.iterations = it;
        if (control.record_history) {
            stats.residual_history.push_back(rnorm);
        }
        if (diverging(rnorm, stats)) {
            stats.status = SolverStatus::Diverged;
            break;
        }
        if (rnorm <= tol) {
            // The recursively updated residual drifts from b - A x by round-off;
            // accept convergence only if the true residual agrees, otherwise
            // restart the Krylov space from the true residual.
            rnorm = true_residual(a, b, x, r, project);
            if (rnorm <= tol) {
                stats.status = SolverStatus::Converged;
                break;
            }
            apply_preconditioner(inv_diag, r, z);
            std::copy(z.begin(), z.end(), p.begin());
            rz = dot(r, z);
            continue;
        }
        apply_preconditioner(inv_diag, r, z);
        const Real rz_new = dot(r, z);
        const Real beta = rz_new / rz;
        rz = rz_new;
        xpby(z, beta, p);
    }
    stats.final_residual_norm = true_residual(a, b, x, r, project);
    return stats;
}

SolverStats sor(const StencilMatrix2D& a, std::span<const Real> b, std::span<Real> x,
                const SolverControl& control, Real omega) {
    check_inputs(a, b, x, control);
    a.validate();
    if (omega <= 0.0) {
        omega = model_problem_sor_omega(a.nx(), a.ny());
    }
    require(omega < 2.0, "sor: relaxation factor must satisfy 0 < omega < 2");
    const bool project = control.constant_nullspace;

    SolverStats stats;
    {
        std::ostringstream os;
        os << "sor-redblack(omega=" << omega << ')';
        stats.method = os.str();
    }

    const auto n = static_cast<std::size_t>(a.rows());
    std::vector<Real> r(n);
    Real rnorm = true_residual(a, b, x, r, project);
    const Real tol = start(stats, control, b, rnorm);
    if (rnorm <= tol) {
        stats.status = SolverStatus::Converged;
        return stats;
    }

    const Index nx = a.nx();
    const Index ny = a.ny();
    const Real* c = a.center().data();
    const Real* e = a.east().data();
    const Real* w = a.west().data();
    const Real* no = a.north().data();
    const Real* so = a.south().data();
    const Real* pb = b.data();
    Real* px = x.data();

    stats.status = SolverStatus::MaxIterationsReached;
    for (int it = 1; it <= control.max_iterations; ++it) {
        for (Index color = 0; color < 2; ++color) {
            // Cells of one colour only depend on cells of the other colour, so
            // every row of a half-sweep can be updated concurrently.
            AERION_OMP(parallel for if (nx * ny > omp_min_parallel_size))
            for (Index j = 0; j < ny; ++j) {
                for (Index i = (j + color) % 2; i < nx; i += 2) {
                    const Index k = i + nx * j;
                    Real sigma = pb[k];
                    if (i > 0) {
                        sigma -= w[k] * px[k - 1];
                    }
                    if (i < nx - 1) {
                        sigma -= e[k] * px[k + 1];
                    }
                    if (j > 0) {
                        sigma -= so[k] * px[k - nx];
                    }
                    if (j < ny - 1) {
                        sigma -= no[k] * px[k + nx];
                    }
                    px[k] += omega * (sigma / c[k] - px[k]);
                }
            }
        }
        rnorm = true_residual(a, b, x, r, project);
        stats.iterations = it;
        if (control.record_history) {
            stats.residual_history.push_back(rnorm);
        }
        if (diverging(rnorm, stats)) {
            stats.status = SolverStatus::Diverged;
            break;
        }
        if (rnorm <= tol) {
            stats.status = SolverStatus::Converged;
            break;
        }
    }
    stats.final_residual_norm = rnorm;
    return stats;
}

}  // namespace aerion::linalg
