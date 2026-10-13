// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 The AERION Authors
#include <aerion/core/error.hpp>
#include <aerion/core/parallel.hpp>
#include <aerion/linalg/vector_ops.hpp>

#include <algorithm>
#include <cmath>

namespace aerion::linalg {

namespace {
Index length(std::span<const Real> a) { return static_cast<Index>(a.size()); }
}  // namespace

Real dot(std::span<const Real> a, std::span<const Real> b) {
    require(a.size() == b.size(), "dot: vector sizes differ");
    const Index n = length(a);
    const Real* pa = a.data();
    const Real* pb = b.data();
    Real s = 0.0;
    AERION_OMP(parallel for reduction(+ : s) if (n > omp_min_parallel_size))
    for (Index k = 0; k < n; ++k) {
        s += pa[k] * pb[k];
    }
    return s;
}

Real norm2(std::span<const Real> a) { return std::sqrt(dot(a, a)); }

Real norm_inf(std::span<const Real> a) {
    // Serial on purpose: MSVC implements OpenMP 2.0, which has no max-reduction,
    // and this norm is only used for diagnostics.
    Real m = 0.0;
    for (const Real v : a) {
        m = std::max(m, std::abs(v));
    }
    return m;
}

Real sum(std::span<const Real> a) {
    const Index n = length(a);
    const Real* pa = a.data();
    Real s = 0.0;
    AERION_OMP(parallel for reduction(+ : s) if (n > omp_min_parallel_size))
    for (Index k = 0; k < n; ++k) {
        s += pa[k];
    }
    return s;
}

void axpy(Real alpha, std::span<const Real> x, std::span<Real> y) {
    require(x.size() == y.size(), "axpy: vector sizes differ");
    const Index n = length(x);
    const Real* px = x.data();
    Real* py = y.data();
    AERION_OMP(parallel for if (n > omp_min_parallel_size))
    for (Index k = 0; k < n; ++k) {
        py[k] += alpha * px[k];
    }
}

void xpby(std::span<const Real> x, Real beta, std::span<Real> y) {
    require(x.size() == y.size(), "xpby: vector sizes differ");
    const Index n = length(x);
    const Real* px = x.data();
    Real* py = y.data();
    AERION_OMP(parallel for if (n > omp_min_parallel_size))
    for (Index k = 0; k < n; ++k) {
        py[k] = px[k] + beta * py[k];
    }
}

void remove_mean(std::span<Real> a) {
    if (a.empty()) {
        return;
    }
    const Index n = static_cast<Index>(a.size());
    const Real mean = sum(a) / static_cast<Real>(n);
    Real* pa = a.data();
    AERION_OMP(parallel for if (n > omp_min_parallel_size))
    for (Index k = 0; k < n; ++k) {
        pa[k] -= mean;
    }
}

bool all_finite(std::span<const Real> a) {
    return std::all_of(a.begin(), a.end(), [](Real v) { return std::isfinite(v); });
}

}  // namespace aerion::linalg
