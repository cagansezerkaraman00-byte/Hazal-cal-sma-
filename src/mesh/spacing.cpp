// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 The AERION Authors
#include <aerion/core/error.hpp>
#include <aerion/mesh/spacing.hpp>

#include <cmath>
#include <cstddef>

namespace aerion::mesh {

namespace {
void check_interval(Index n, Real a, Real b) {
    require(n >= 1, "number of cells must be >= 1");
    require(std::isfinite(a) && std::isfinite(b), "interval bounds must be finite");
    require(b > a, "interval must satisfy b > a");
}
}  // namespace

std::vector<Real> uniform_faces(Index n, Real a, Real b) {
    check_interval(n, a, b);
    std::vector<Real> faces(static_cast<std::size_t>(n + 1));
    const Real h = (b - a) / static_cast<Real>(n);
    for (Index k = 0; k <= n; ++k) {
        faces[static_cast<std::size_t>(k)] = a + static_cast<Real>(k) * h;
    }
    faces.back() = b;  // exact end point, free of round-off
    return faces;
}

std::vector<Real> tanh_clustered_faces(Index n, Real a, Real b, Real beta) {
    check_interval(n, a, b);
    require(std::isfinite(beta) && beta >= 0.0, "clustering parameter beta must be >= 0");
    if (beta == 0.0) {
        return uniform_faces(n, a, b);
    }
    std::vector<Real> faces(static_cast<std::size_t>(n + 1));
    const Real denom = std::tanh(0.5 * beta);
    for (Index k = 0; k <= n; ++k) {
        const Real s = static_cast<Real>(k) / static_cast<Real>(n);
        const Real t = 0.5 * (1.0 + std::tanh(beta * (s - 0.5)) / denom);
        faces[static_cast<std::size_t>(k)] = a + (b - a) * t;
    }
    faces.front() = a;
    faces.back() = b;
    return faces;
}

}  // namespace aerion::mesh
