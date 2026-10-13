// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 The AERION Authors
#pragma once

#include <cstddef>

namespace aerion {

/// Floating-point type used for every physical quantity in the engine.
///
/// Double precision is a deliberate requirement: the verification suite
/// demonstrates second-order convergence down to discretisation errors of
/// ~1e-6, and the iterative solvers are converged to relative residuals of
/// 1e-10, both of which are out of reach in single precision.
using Real = double;

/// Signed index type for array extents and loop counters.
///
/// Signed so that ghost cells can be addressed with negative indices and so
/// that loops satisfy the OpenMP canonical loop form on every compiler.
using Index = std::ptrdiff_t;

}  // namespace aerion
