// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 The AERION Authors
#pragma once

#include <source_location>
#include <stdexcept>
#include <string_view>

namespace aerion {

/// Base class of every exception thrown by the AERION engine.
class Error : public std::runtime_error {
  public:
    using std::runtime_error::runtime_error;
};

/// A caller supplied an invalid argument (bad mesh size, mismatched shapes...).
class InvalidArgument : public Error {
  public:
    using Error::Error;
};

/// A numerical failure that makes the result meaningless (NaN, divergence...).
class NumericalError : public Error {
  public:
    using Error::Error;
};

/// Reading or writing a file failed.
class IOError : public Error {
  public:
    using Error::Error;
};

namespace detail {
[[noreturn]] void throw_invalid_argument(std::string_view message,
                                         const std::source_location& where);
}  // namespace detail

/// Validates a precondition and throws `InvalidArgument` (with the source
/// location of the call) when it does not hold. Intended for argument
/// validation at API boundaries, not for hot inner loops.
inline void require(bool condition, std::string_view message,
                    const std::source_location& where = std::source_location::current()) {
    if (!condition) [[unlikely]] {
        detail::throw_invalid_argument(message, where);
    }
}

}  // namespace aerion
