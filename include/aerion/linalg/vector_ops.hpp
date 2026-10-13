// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 The AERION Authors
#pragma once

#include <aerion/core/types.hpp>

#include <span>

/// BLAS-1 style kernels on contiguous vectors. Parallelised with OpenMP for
/// long vectors; note that OpenMP reductions sum in a thread-count dependent
/// order, so results agree across thread counts only to round-off.
namespace aerion::linalg {

[[nodiscard]] Real dot(std::span<const Real> a, std::span<const Real> b);
[[nodiscard]] Real norm2(std::span<const Real> a);
[[nodiscard]] Real norm_inf(std::span<const Real> a);
[[nodiscard]] Real sum(std::span<const Real> a);

/// y <- alpha * x + y
void axpy(Real alpha, std::span<const Real> x, std::span<Real> y);
/// y <- x + beta * y
void xpby(std::span<const Real> x, Real beta, std::span<Real> y);
/// Subtracts the arithmetic mean, i.e. projects onto the complement of the
/// constant vector (the null space of pure-Neumann operators).
void remove_mean(std::span<Real> a);
/// False if any entry is NaN or infinite.
[[nodiscard]] bool all_finite(std::span<const Real> a);

}  // namespace aerion::linalg
