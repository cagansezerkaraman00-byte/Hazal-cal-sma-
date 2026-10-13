// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 The AERION Authors
#pragma once

#include <aerion/core/types.hpp>

#include <vector>

namespace aerion::mesh {

/// Face coordinates of `n` equal cells on [a, b] (returns n + 1 values).
[[nodiscard]] std::vector<Real> uniform_faces(Index n, Real a, Real b);

/// Face coordinates of `n` cells on [a, b] clustered symmetrically towards both
/// ends with the hyperbolic-tangent mapping
///
///     x(s) = a + (b - a) * [1 + tanh(beta (s - 1/2)) / tanh(beta / 2)] / 2,
///     s = k / n,  k = 0..n.
///
/// `beta` > 0 controls the clustering strength; beta -> 0 recovers a uniform
/// grid (beta == 0 is accepted and returns `uniform_faces`). Because the
/// mapping is smooth and fixed, refining `n` at constant `beta` preserves the
/// formal order of accuracy of the discretisation. Typical use: wall-bounded
/// flows (lid-driven cavity, channel), where boundary layers form at both walls.
[[nodiscard]] std::vector<Real> tanh_clustered_faces(Index n, Real a, Real b, Real beta);

}  // namespace aerion::mesh
