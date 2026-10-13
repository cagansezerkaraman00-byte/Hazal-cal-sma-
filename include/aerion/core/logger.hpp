// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 The AERION Authors
#pragma once

#include <functional>
#include <string_view>

namespace aerion {

enum class LogLevel : int { Debug = 0, Info = 1, Warning = 2, Error = 3, Off = 4 };

/// Receives every message that passes the level filter. Sinks may be called
/// from several threads; the logger serialises calls with a mutex.
using LogSink = std::function<void(LogLevel, std::string_view)>;

/// Messages below this level are discarded. Default: `LogLevel::Warning`, so
/// that library users are not flooded with progress output.
void set_log_level(LogLevel level) noexcept;
[[nodiscard]] LogLevel log_level() noexcept;

/// Replaces the output sink. Passing an empty function restores the default
/// sink, which writes "[aerion:<level>] message" lines to stderr.
void set_log_sink(LogSink sink);

void log(LogLevel level, std::string_view message);

inline void log_debug(std::string_view message) {
    log(LogLevel::Debug, message);
}
inline void log_info(std::string_view message) {
    log(LogLevel::Info, message);
}
inline void log_warning(std::string_view message) {
    log(LogLevel::Warning, message);
}
inline void log_error(std::string_view message) {
    log(LogLevel::Error, message);
}

[[nodiscard]] std::string_view to_string(LogLevel level) noexcept;

}  // namespace aerion
