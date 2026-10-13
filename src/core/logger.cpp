// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 The AERION Authors
#include <atomic>
#include <iostream>
#include <mutex>
#include <utility>

#include <aerion/core/logger.hpp>

namespace aerion {

namespace {

struct LoggerState {
    std::atomic<LogLevel> level{LogLevel::Warning};
    std::mutex mutex;
    LogSink sink;
};

LoggerState& state() {
    static LoggerState instance;
    return instance;
}

void default_sink(LogLevel level, std::string_view message) {
    std::cerr << "[aerion:" << to_string(level) << "] " << message << '\n';
}

}  // namespace

void set_log_level(LogLevel level) noexcept {
    state().level.store(level);
}

LogLevel log_level() noexcept {
    return state().level.load();
}

void set_log_sink(LogSink sink) {
    auto& s = state();
    const std::lock_guard lock(s.mutex);
    s.sink = std::move(sink);
}

void log(LogLevel level, std::string_view message) {
    auto& s = state();
    if (level == LogLevel::Off || level < s.level.load()) {
        return;
    }
    const std::lock_guard lock(s.mutex);
    if (s.sink) {
        s.sink(level, message);
    } else {
        default_sink(level, message);
    }
}

std::string_view to_string(LogLevel level) noexcept {
    switch (level) {
        case LogLevel::Debug:
            return "debug";
        case LogLevel::Info:
            return "info";
        case LogLevel::Warning:
            return "warning";
        case LogLevel::Error:
            return "error";
        case LogLevel::Off:
            return "off";
    }
    return "unknown";
}

}  // namespace aerion
