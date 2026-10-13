// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 The AERION Authors
#include <aerion/core/error.hpp>
#include <aerion/core/parallel.hpp>

#if defined(AERION_HAVE_OPENMP)
#include <omp.h>
#endif

namespace aerion {

bool openmp_enabled() noexcept {
#if defined(AERION_HAVE_OPENMP)
    return true;
#else
    return false;
#endif
}

int max_threads() noexcept {
#if defined(AERION_HAVE_OPENMP)
    return omp_get_max_threads();
#else
    return 1;
#endif
}

void set_num_threads(int threads) {
    require(threads >= 1, "number of threads must be >= 1");
#if defined(AERION_HAVE_OPENMP)
    omp_set_num_threads(threads);
#endif
}

}  // namespace aerion
