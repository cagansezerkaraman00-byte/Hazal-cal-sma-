// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 The AERION Authors
#include <sstream>

#include <aerion/core/build_info.hpp>
#include <aerion/core/parallel.hpp>
#include <aerion/core/version.hpp>

#ifndef AERION_BUILD_TYPE
#define AERION_BUILD_TYPE "unknown"
#endif

namespace aerion {

namespace {

std::string compiler_id() {
    std::ostringstream os;
#if defined(__clang__)
    os << "Clang " << __clang_major__ << '.' << __clang_minor__ << '.' << __clang_patchlevel__;
#elif defined(__GNUC__)
    os << "GCC " << __GNUC__ << '.' << __GNUC_MINOR__ << '.' << __GNUC_PATCHLEVEL__;
#elif defined(_MSC_VER)
    os << "MSVC " << _MSC_FULL_VER;
#else
    os << "unknown compiler";
#endif
    return os.str();
}

long cxx_standard() {
#if defined(_MSVC_LANG)
    return static_cast<long>(_MSVC_LANG);
#else
    return static_cast<long>(__cplusplus);
#endif
}

}  // namespace

BuildInfo build_info() {
    BuildInfo info{};
    info.version = std::string(version_string);
    info.git_revision = std::string(git_revision);
    info.compiler = compiler_id();
    info.build_type = AERION_BUILD_TYPE;
    info.cxx_standard = cxx_standard();
    info.openmp = openmp_enabled();
    info.max_threads = max_threads();
    info.cuda = false;
#if defined(AERION_BOUNDS_CHECK)
    info.bounds_checking = true;
#else
    info.bounds_checking = false;
#endif
    return info;
}

std::string build_summary() {
    const BuildInfo info = build_info();
    std::ostringstream os;
    os << "AERION " << info.version << " -- Engineering the Invisible.\n"
       << "  revision       : " << info.git_revision << '\n'
       << "  compiler       : " << info.compiler << " (C++ " << info.cxx_standard << ")\n"
       << "  build type     : " << info.build_type << '\n'
       << "  OpenMP         : " << (info.openmp ? "yes" : "no") << " (" << info.max_threads
       << " threads)\n"
       << "  CUDA           : " << (info.cuda ? "yes" : "no (planned, Stage 6)") << '\n'
       << "  bounds checking: " << (info.bounds_checking ? "yes" : "no") << '\n';
    return os.str();
}

}  // namespace aerion
