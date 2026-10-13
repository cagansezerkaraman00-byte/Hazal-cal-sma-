// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 The AERION Authors
#pragma once

#include <aerion/core/types.hpp>
#include <aerion/field/array2d.hpp>
#include <aerion/linalg/linear_solvers.hpp>
#include <aerion/linalg/stencil_matrix_2d.hpp>
#include <aerion/mesh/structured_grid_2d.hpp>
#include <aerion/solvers/boundary.hpp>

#include <array>
#include <vector>

namespace aerion::solvers {

enum class LinearSolverKind { ConjugateGradient, SOR };

struct PoissonOptions {
    LinearSolverKind solver = LinearSolverKind::ConjugateGradient;
    linalg::SolverControl control{};
    linalg::Preconditioner preconditioner = linalg::Preconditioner::Jacobi;
    /// SOR relaxation factor; <= 0 selects the model-problem optimum.
    Real sor_omega = 0.0;
    /// Relative compatibility defect of pure-Neumann data above which a
    /// warning is logged (see PoissonReport::compatibility_defect).
    Real compatibility_tolerance = 1e-8;
};

/// Diagnostics of one Poisson solve.
struct PoissonReport {
    linalg::SolverStats solver;
    /// Pure-Neumann problem: phi is unique only up to a constant, which is
    /// fixed by requiring a zero volume-weighted mean.
    bool singular = false;
    /// Pure-Neumann only: relative violation of the solvability condition
    ///   int_Omega f dV = oint_dOmega (d phi/dn) dA,
    /// i.e. |int f dV - oint g dA| / (int |f| dV + oint |g| dA). Incompatible
    /// data is projected onto the nearest solvable problem before solving.
    Real compatibility_defect = 0.0;
    /// Relative global conservation error evaluated from the computed phi:
    ///   |sum of discrete boundary fluxes - int f dV| / (flux and source scale).
    /// Finite-volume schemes conserve exactly, so this equals the residual sum
    /// of the linear solve (or the compatibility defect for pure Neumann).
    Real conservation_error = 0.0;
};

/// Cell-centred finite-volume solver for the Poisson equation
///
///     laplacian(phi) = f   in Omega = [x_min, x_max] x [y_min, y_max],
///
/// with Dirichlet or Neumann conditions on each side, on uniform or
/// stretched rectilinear grids. Integrating over cell P and applying the
/// divergence theorem gives the exact balance sum_faces (d phi/dn)_f A_f =
/// int_P f dV, which is approximated with
///
///   interior face : (d phi/dn)_f ~ (phi_nb - phi_P) / |x_nb - x_P|
///   Dirichlet face: (d phi/dn)_f ~ (phi_b - phi_P) / |x_f - x_P|
///   Neumann face  : (d phi/dn)_f = g (given)
///   source        : int_P f dV ~ f(x_P) V_P
///
/// The resulting matrix (assembled as -laplacian * V) is symmetric, weakly
/// diagonally dominant and positive definite when at least one side is of
/// Dirichlet type, positive semi-definite with the constants as null space
/// otherwise. The scheme is second-order accurate; this is verified with
/// manufactured solutions in the test-suite.
///
/// The matrix depends only on the grid and on the boundary *types*, so one
/// solver instance is assembled once and reused for many right-hand sides
/// (e.g. the pressure equation at every time step).
class PoissonSolver2D {
public:
    PoissonSolver2D(mesh::StructuredGrid2D grid, BoundaryConditions2D bcs,
                    PoissonOptions options = {});

    [[nodiscard]] const mesh::StructuredGrid2D& grid() const noexcept { return grid_; }
    [[nodiscard]] const BoundaryConditions2D& boundary_conditions() const noexcept { return bcs_; }
    [[nodiscard]] const PoissonOptions& options() const noexcept { return options_; }
    [[nodiscard]] PoissonOptions& options() noexcept { return options_; }
    [[nodiscard]] const linalg::StencilMatrix2D& matrix() const noexcept { return matrix_; }
    [[nodiscard]] bool is_singular() const noexcept { return bcs_.all_neumann(); }

    /// Replaces the condition on one side; re-assembles the matrix only if the
    /// boundary type changed (new values only affect the right-hand side).
    void set_boundary_condition(BoundarySide side, BoundaryCondition bc);

    /// Right-hand side b of A phi = b for source f (boundary data included).
    [[nodiscard]] std::vector<Real> assemble_rhs(const ScalarField2D& source) const;

    /// Solves laplacian(phi) = source. `phi` must be a cell field; its content
    /// is used as the initial guess and replaced by the solution.
    PoissonReport solve(const ScalarField2D& source, ScalarField2D& phi) const;

    /// Net outward flux  sum_faces (d phi/dn) A  through each side
    /// (order: west, east, south, north), evaluated from `phi` with exactly
    /// the face formulas used by the discretisation.
    [[nodiscard]] std::array<Real, 4> boundary_fluxes(const ScalarField2D& phi) const;

private:
    void assemble_matrix();

    mesh::StructuredGrid2D grid_;
    BoundaryConditions2D bcs_;
    PoissonOptions options_;
    linalg::StencilMatrix2D matrix_;
};

struct PoissonSolution {
    ScalarField2D phi;
    PoissonReport report;
};

/// Convenience wrapper: assemble, solve from a zero initial guess, return.
[[nodiscard]] PoissonSolution solve_poisson(const mesh::StructuredGrid2D& grid,
                                            const ScalarField2D& source,
                                            const BoundaryConditions2D& bcs,
                                            const PoissonOptions& options = {});

}  // namespace aerion::solvers
