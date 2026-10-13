// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 The AERION Authors
#pragma once

#include <array>
#include <functional>
#include <string>
#include <vector>

#include <aerion/core/types.hpp>
#include <aerion/field/array2d.hpp>
#include <aerion/mesh/structured_grid_2d.hpp>
#include <aerion/solvers/boundary.hpp>

/// Method of Manufactured Solutions (MMS) for code verification.
///
/// A smooth function phi_e(x, y) is chosen, the source f = laplacian(phi_e)
/// is derived analytically, and the boundary data are sampled from phi_e. The
/// discrete solution must then converge to phi_e at the formal order of the
/// scheme (2 here) as the grid is refined. See Roache, "Code Verification by
/// the Method of Manufactured Solutions", J. Fluids Eng. 124 (2002) 4-10.
namespace aerion::verification {

using ScalarFunction = std::function<Real(Real, Real)>;

struct ManufacturedSolution2D {
    std::string name;
    ScalarFunction phi;        ///< Exact solution.
    ScalarFunction laplacian;  ///< Its Laplacian (the source term f).
    ScalarFunction dphi_dx;
    ScalarFunction dphi_dy;
    Real x_min, x_max, y_min, y_max;  ///< Domain on which it is intended to be used.
    /// Boundary types (west, east, south, north) the case is designed for.
    std::array<solvers::BoundaryType, 4> boundary_types;
};

/// phi = sin(pi x) sin(pi y) on [0,1]^2, homogeneous Dirichlet on all sides.
[[nodiscard]] ManufacturedSolution2D sine_dirichlet();

/// phi = cos(pi x) cos(pi y) on [0,1]^2, homogeneous Neumann on all sides
/// (singular problem, exact solution has zero mean).
[[nodiscard]] ManufacturedSolution2D cosine_neumann();

/// phi = exp(x) sin(2y) + x^2 y on [0,2] x [0,1] with non-homogeneous
/// Dirichlet data on west/east and Neumann data on south/north. Non-square
/// and non-symmetric on purpose, to expose any dx/dy or sign mix-up.
[[nodiscard]] ManufacturedSolution2D exp_mixed();

[[nodiscard]] std::vector<ManufacturedSolution2D> all_manufactured_solutions();

/// Grid on the solution's domain with nx x ny cells, uniform (beta = 0) or
/// tanh-clustered towards all walls with strength beta.
[[nodiscard]] mesh::StructuredGrid2D make_grid(const ManufacturedSolution2D& ms, Index nx, Index ny,
                                               Real beta = 0.0);

/// Source field f = laplacian(phi_e) sampled at cell centres.
[[nodiscard]] ScalarField2D source_field(const ManufacturedSolution2D& ms,
                                         const mesh::StructuredGrid2D& grid);

/// Boundary conditions of the case's types with values sampled from phi_e at
/// the boundary face centres (outward normal derivatives for Neumann sides).
[[nodiscard]] solvers::BoundaryConditions2D boundary_conditions(const ManufacturedSolution2D& ms,
                                                                const mesh::StructuredGrid2D& grid);

struct ErrorNorms {
    Real l2;    ///< Volume-weighted RMS of the error.
    Real linf;  ///< Maximum absolute error.
};

/// Error of `phi` against phi_e at the cell centres. For singular
/// (pure-Neumann) problems pass remove_mean = true: the solution is only
/// defined up to a constant, so the volume-mean of the error is removed.
[[nodiscard]] ErrorNorms error_norms(const ManufacturedSolution2D& ms,
                                     const mesh::StructuredGrid2D& grid, const ScalarField2D& phi,
                                     bool remove_mean);

}  // namespace aerion::verification
