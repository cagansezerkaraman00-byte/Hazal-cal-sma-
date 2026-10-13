// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 The AERION Authors
#pragma once

#include <string>

namespace aerion {

/// Facts about how this copy of the engine was built. Reported by the CLI and
/// the Python package so that every result can be traced to a build.
struct BuildInfo {
    std::string version;       ///< Semantic version, e.g. "0.1.0".
    std::string git_revision;  ///< `git describe` at configure time, or "unknown".
    std::string compiler;      ///< Compiler identification and version.
    std::string build_type;    ///< CMake build type (Release, Debug...).
    long cxx_standard;         ///< Value of __cplusplus (MSVC: _MSVC_LANG).
    bool openmp;               ///< Compiled with OpenMP.
    int max_threads;           ///< Threads available to OpenMP regions.
    bool cuda;                 ///< Compiled with the CUDA backend (not yet available).
    bool bounds_checking;      ///< Array2D accessors are bounds-checked.
};

[[nodiscard]] BuildInfo build_info();

/// Multi-line, human-readable rendering of `build_info()`.
[[nodiscard]] std::string build_summary();

}  // namespace aerion
