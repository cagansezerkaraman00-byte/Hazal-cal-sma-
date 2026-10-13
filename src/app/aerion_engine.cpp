// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 The AERION Authors
//
// aerion-engine: command-line front end of the C++ engine.
#include <aerion/core/build_info.hpp>
#include <aerion/core/error.hpp>

#include <exception>
#include <iostream>
#include <string>
#include <string_view>
#include <vector>

namespace {

constexpr std::string_view kUsage = R"(usage: aerion-engine <command> [options]

commands:
  info        print version and build configuration
  version     print the version number
  help        show this message
)";

int run(const std::vector<std::string>& args) {
    if (args.empty() || args[0] == "help" || args[0] == "--help" || args[0] == "-h") {
        std::cout << kUsage;
        return args.empty() ? 1 : 0;
    }
    const std::string& command = args[0];
    if (command == "version" || command == "--version") {
        std::cout << aerion::build_info().version << '\n';
        return 0;
    }
    if (command == "info") {
        std::cout << aerion::build_summary();
        return 0;
    }
    std::cerr << "aerion-engine: unknown command '" << command << "'\n\n" << kUsage;
    return 2;
}

}  // namespace

int main(int argc, char** argv) {
    try {
        return run(std::vector<std::string>(argv + 1, argv + argc));
    } catch (const aerion::Error& e) {
        std::cerr << "aerion-engine: error: " << e.what() << '\n';
    } catch (const std::exception& e) {
        std::cerr << "aerion-engine: unexpected error: " << e.what() << '\n';
    }
    return 1;
}
