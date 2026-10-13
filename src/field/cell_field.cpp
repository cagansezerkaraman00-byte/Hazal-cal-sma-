// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 The AERION Authors
#include <algorithm>
#include <cmath>
#include <string>

#include <aerion/core/error.hpp>
#include <aerion/field/cell_field.hpp>

namespace aerion {

using mesh::StructuredGrid2D;

ScalarField2D make_cell_field(const StructuredGrid2D& grid, Real value) {
    return {grid.nx(), grid.ny(), value};
}

ScalarField2D sample_cell_centers(const StructuredGrid2D& grid,
                                  const std::function<Real(Real, Real)>& f) {
    require(static_cast<bool>(f), "sample_cell_centers: empty function");
    ScalarField2D out = make_cell_field(grid);
    for (Index j = 0; j < grid.ny(); ++j) {
        for (Index i = 0; i < grid.nx(); ++i) {
            out(i, j) = f(grid.xc(i), grid.yc(j));
        }
    }
    return out;
}

void require_cell_field(const StructuredGrid2D& grid, const ScalarField2D& field,
                        const char* name) {
    const bool ok =
        field.i_range() == IndexRange{0, grid.nx()} && field.j_range() == IndexRange{0, grid.ny()};
    require(ok, std::string(name) + ": expected a cell field of shape (" +
                    std::to_string(grid.nx()) + ", " + std::to_string(grid.ny()) + "), got (" +
                    std::to_string(field.ni()) + ", " + std::to_string(field.nj()) + ")");
}

Real norm_l2(const StructuredGrid2D& grid, const ScalarField2D& field) {
    require_cell_field(grid, field, "norm_l2");
    Real sum = 0.0;
    for (Index j = 0; j < grid.ny(); ++j) {
        for (Index i = 0; i < grid.nx(); ++i) {
            sum += field(i, j) * field(i, j) * grid.volume(i, j);
        }
    }
    return std::sqrt(sum / grid.total_volume());
}

Real norm_linf(const StructuredGrid2D& grid, const ScalarField2D& field) {
    require_cell_field(grid, field, "norm_linf");
    Real m = 0.0;
    for (const Real v : field.values()) {
        m = std::max(m, std::abs(v));
    }
    return m;
}

Real volume_integral(const StructuredGrid2D& grid, const ScalarField2D& field) {
    require_cell_field(grid, field, "volume_integral");
    Real sum = 0.0;
    for (Index j = 0; j < grid.ny(); ++j) {
        for (Index i = 0; i < grid.nx(); ++i) {
            sum += field(i, j) * grid.volume(i, j);
        }
    }
    return sum;
}

Real volume_average(const StructuredGrid2D& grid, const ScalarField2D& field) {
    return volume_integral(grid, field) / grid.total_volume();
}

}  // namespace aerion
