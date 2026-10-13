// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 The AERION Authors
#pragma once

#include <aerion/core/types.hpp>

#include <cstddef>
#include <span>
#include <vector>

namespace aerion::mesh {

/// Two-dimensional rectilinear (tensor-product) grid of `nx * ny` cells.
///
/// The grid is defined by strictly increasing face coordinates x_0 < ... < x_nx
/// and y_0 < ... < y_ny. Cell (i, j) occupies [x_i, x_{i+1}] x [y_j, y_{j+1}];
/// its centre is the midpoint of that rectangle. Spacing may be non-uniform
/// (e.g. clustered towards walls), which the finite-volume operators support.
///
/// Cells are numbered with i running fastest: k = i + nx * j. All "volumes"
/// are areas per unit depth in the third direction, i.e. the usual 2D
/// finite-volume convention.
class StructuredGrid2D {
public:
    /// Builds the grid from face coordinates (at least 2 per direction).
    StructuredGrid2D(std::vector<Real> x_faces, std::vector<Real> y_faces);

    /// Uniform grid of nx * ny cells on [x_min, x_max] x [y_min, y_max].
    [[nodiscard]] static StructuredGrid2D uniform(Index nx, Index ny, Real x_min, Real x_max,
                                                  Real y_min, Real y_max);

    [[nodiscard]] Index nx() const noexcept { return nx_; }
    [[nodiscard]] Index ny() const noexcept { return ny_; }
    [[nodiscard]] Index num_cells() const noexcept { return nx_ * ny_; }

    [[nodiscard]] Real x_min() const noexcept { return xf_.front(); }
    [[nodiscard]] Real x_max() const noexcept { return xf_.back(); }
    [[nodiscard]] Real y_min() const noexcept { return yf_.front(); }
    [[nodiscard]] Real y_max() const noexcept { return yf_.back(); }
    [[nodiscard]] Real length_x() const noexcept { return x_max() - x_min(); }
    [[nodiscard]] Real length_y() const noexcept { return y_max() - y_min(); }

    /// Face coordinate, i in [0, nx].
    [[nodiscard]] Real xf(Index i) const noexcept { return xf_[at(i)]; }
    /// Face coordinate, j in [0, ny].
    [[nodiscard]] Real yf(Index j) const noexcept { return yf_[at(j)]; }
    /// Cell-centre coordinate, i in [0, nx).
    [[nodiscard]] Real xc(Index i) const noexcept { return xc_[at(i)]; }
    /// Cell-centre coordinate, j in [0, ny).
    [[nodiscard]] Real yc(Index j) const noexcept { return yc_[at(j)]; }
    /// Cell width, i in [0, nx).
    [[nodiscard]] Real dx(Index i) const noexcept { return dx_[at(i)]; }
    /// Cell height, j in [0, ny).
    [[nodiscard]] Real dy(Index j) const noexcept { return dy_[at(j)]; }
    /// Cell area (volume per unit depth).
    [[nodiscard]] Real volume(Index i, Index j) const noexcept { return dx(i) * dy(j); }
    [[nodiscard]] Real total_volume() const noexcept { return length_x() * length_y(); }

    /// Linear cell index k = i + nx * j.
    [[nodiscard]] Index cell_index(Index i, Index j) const noexcept { return i + nx_ * j; }

    /// Smallest cell width/height; governs explicit time-step limits.
    [[nodiscard]] Real min_spacing() const noexcept;
    /// Largest ratio of adjacent cell sizes (1 for uniform grids). Values much
    /// above ~1.2 degrade the accuracy of the finite-volume flux approximation.
    [[nodiscard]] Real max_expansion_ratio() const noexcept;
    /// True when all cells have the same width and the same height.
    [[nodiscard]] bool is_uniform(Real rel_tol = 1e-12) const noexcept;

    [[nodiscard]] std::span<const Real> x_faces() const noexcept { return xf_; }
    [[nodiscard]] std::span<const Real> y_faces() const noexcept { return yf_; }
    [[nodiscard]] std::span<const Real> x_centers() const noexcept { return xc_; }
    [[nodiscard]] std::span<const Real> y_centers() const noexcept { return yc_; }

private:
    static std::size_t at(Index i) noexcept { return static_cast<std::size_t>(i); }

    Index nx_ = 0;
    Index ny_ = 0;
    std::vector<Real> xf_, yf_;  // faces
    std::vector<Real> xc_, yc_;  // centres
    std::vector<Real> dx_, dy_;  // widths
};

}  // namespace aerion::mesh
