// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 The AERION Authors
#pragma once

#include <aerion/core/types.hpp>

/// AERION_OMP(directive) expands to `#pragma omp directive` when the engine is
/// built with OpenMP and to nothing otherwise, so serial builds compile without
/// "unknown pragma" warnings. Do not put top-level commas in `directive`.
#if defined(AERION_HAVE_OPENMP)
#if defined(_MSC_VER) && !defined(__clang__)
#define AERION_PRAGMA(x) __pragma(x)
#else
#define AERION_PRAGMA(x) _Pragma(#x)
#endif
#define AERION_OMP(directive) AERION_PRAGMA(omp directive)
#else
#define AERION_OMP(directive)
#endif

namespace aerion {

/// Loops shorter than this run serially, because for small vectors waking the
/// thread team costs more than the arithmetic. Heuristic starting value; it
/// is to be tuned with benchmarks/ on the target hardware.
inline constexpr Index omp_min_parallel_size = 16384;

/// True when the engine was compiled with OpenMP support.
[[nodiscard]] bool openmp_enabled() noexcept;

/// Number of threads OpenMP regions will use (1 for serial builds).
[[nodiscard]] int max_threads() noexcept;

/// Sets the number of OpenMP threads; ignored in serial builds.
void set_num_threads(int threads);

}  // namespace aerion
