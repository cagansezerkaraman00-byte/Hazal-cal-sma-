// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 The AERION Authors
#pragma once

#include <chrono>

namespace aerion {

/// Monotonic wall-clock stopwatch (std::chrono::steady_clock).
class WallTimer {
public:
    using Clock = std::chrono::steady_clock;

    WallTimer() noexcept : start_(Clock::now()) {}

    void restart() noexcept { start_ = Clock::now(); }

    /// Seconds elapsed since construction or the last `restart()`.
    [[nodiscard]] double elapsed_seconds() const noexcept {
        return std::chrono::duration<double>(Clock::now() - start_).count();
    }

private:
    Clock::time_point start_;
};

}  // namespace aerion
