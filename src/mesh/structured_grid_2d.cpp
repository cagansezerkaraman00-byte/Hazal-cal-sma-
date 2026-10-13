// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 The AERION Authors
#include <algorithm>
#include <cmath>
#include <string>
#include <utility>

#include <aerion/core/error.hpp>
#include <aerion/mesh/spacing.hpp>
#include <aerion/mesh/structured_grid_2d.hpp>

namespace aerion::mesh {

namespace {

void validate_faces(const std::vector<Real>& faces, const char* axis) {
    const std::string name(axis);
    require(faces.size() >= 2, name + "-faces: at least 2 coordinates (1 cell) are required");
    for (const Real f : faces) {
        require(std::isfinite(f), name + "-faces: coordinates must be finite");
    }
    for (std::size_t k = 1; k < faces.size(); ++k) {
        require(faces[k] > faces[k - 1], name + "-faces: coordinates must be strictly increasing");
    }
}

void derive(const std::vector<Real>& faces, std::vector<Real>& centers, std::vector<Real>& widths) {
    const std::size_t n = faces.size() - 1;
    centers.resize(n);
    widths.resize(n);
    for (std::size_t k = 0; k < n; ++k) {
        centers[k] = 0.5 * (faces[k] + faces[k + 1]);
        widths[k] = faces[k + 1] - faces[k];
    }
}

Real max_ratio(const std::vector<Real>& widths) {
    Real r = 1.0;
    for (std::size_t k = 1; k < widths.size(); ++k) {
        const Real a = widths[k - 1];
        const Real b = widths[k];
        r = std::max(r, std::max(a / b, b / a));
    }
    return r;
}

bool all_equal(const std::vector<Real>& widths, Real rel_tol) {
    const auto [lo, hi] = std::minmax_element(widths.begin(), widths.end());
    return (*hi - *lo) <= rel_tol * *hi;
}

}  // namespace

StructuredGrid2D::StructuredGrid2D(std::vector<Real> x_faces, std::vector<Real> y_faces)
    : xf_(std::move(x_faces)), yf_(std::move(y_faces)) {
    validate_faces(xf_, "x");
    validate_faces(yf_, "y");
    nx_ = static_cast<Index>(xf_.size()) - 1;
    ny_ = static_cast<Index>(yf_.size()) - 1;
    derive(xf_, xc_, dx_);
    derive(yf_, yc_, dy_);
}

StructuredGrid2D StructuredGrid2D::uniform(Index nx, Index ny, Real x_min, Real x_max, Real y_min,
                                           Real y_max) {
    return {uniform_faces(nx, x_min, x_max), uniform_faces(ny, y_min, y_max)};
}

Real StructuredGrid2D::min_spacing() const noexcept {
    return std::min(*std::min_element(dx_.begin(), dx_.end()),
                    *std::min_element(dy_.begin(), dy_.end()));
}

Real StructuredGrid2D::max_expansion_ratio() const noexcept {
    return std::max(max_ratio(dx_), max_ratio(dy_));
}

bool StructuredGrid2D::is_uniform(Real rel_tol) const noexcept {
    return all_equal(dx_, rel_tol) && all_equal(dy_, rel_tol);
}

}  // namespace aerion::mesh
