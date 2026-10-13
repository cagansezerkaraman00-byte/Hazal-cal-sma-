// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 The AERION Authors
#pragma once

#include <aerion/core/types.hpp>
#include <aerion/field/array2d.hpp>
#include <aerion/mesh/structured_grid_2d.hpp>

#include <functional>

namespace aerion {

/// Cell-centred scalar field on `grid` (index range [0,nx) x [0,ny)).
[[nodiscard]] ScalarField2D make_cell_field(const mesh::StructuredGrid2D& grid, Real value = 0.0);

/// Samples f(x, y) at the cell centres of `grid`.
[[nodiscard]] ScalarField2D sample_cell_centers(const mesh::StructuredGrid2D& grid,
                                                const std::function<Real(Real, Real)>& f);

/// Throws InvalidArgument unless `field` is a cell field of `grid`.
void require_cell_field(const mesh::StructuredGrid2D& grid, const ScalarField2D& field,
                        const char* name);

/// Volume-weighted root-mean-square norm  sqrt( sum(f^2 V) / sum(V) ),
/// the discrete counterpart of the continuous L2 norm normalised by area.
[[nodiscard]] Real norm_l2(const mesh::StructuredGrid2D& grid, const ScalarField2D& field);

/// Maximum absolute value over the cells.
[[nodiscard]] Real norm_linf(const mesh::StructuredGrid2D& grid, const ScalarField2D& field);

/// Volume-weighted mean  sum(f V) / sum(V).
[[nodiscard]] Real volume_average(const mesh::StructuredGrid2D& grid, const ScalarField2D& field);

/// Volume integral  sum(f V).
[[nodiscard]] Real volume_integral(const mesh::StructuredGrid2D& grid, const ScalarField2D& field);

}  // namespace aerion
