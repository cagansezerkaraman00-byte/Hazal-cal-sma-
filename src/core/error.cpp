// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 The AERION Authors
#include <sstream>
#include <string>

#include <aerion/core/error.hpp>

namespace aerion::detail {

namespace {
std::string_view basename(std::string_view path) {
    const auto pos = path.find_last_of("/\\");
    return pos == std::string_view::npos ? path : path.substr(pos + 1);
}
}  // namespace

void throw_invalid_argument(std::string_view message, const std::source_location& where) {
    std::ostringstream os;
    os << message << " [" << basename(where.file_name()) << ':' << where.line() << ']';
    throw InvalidArgument(os.str());
}

}  // namespace aerion::detail
