# SPDX-License-Identifier: Apache-2.0
# AERION — Advanced Computational Aerodynamics Platform. Engineering the Invisible.
cmake_minimum_required(VERSION 3.22)

project(
  AERION
  VERSION 0.1.0
  DESCRIPTION "Advanced Computational Aerodynamics Platform - Engineering the Invisible."
  LANGUAGES CXX)

if(PROJECT_SOURCE_DIR STREQUAL PROJECT_BINARY_DIR)
  message(FATAL_ERROR "In-source builds are not supported. Use e.g. 'cmake --preset dev'.")
endif()

# ----------------------------------------------------------------------------
# Options
# ----------------------------------------------------------------------------
option(AERION_BUILD_TESTS "Build the C++ (GoogleTest) and Python (pytest) test suites"
       ${PROJECT_IS_TOP_LEVEL})
option(AERION_BUILD_PYTHON "Build the pybind11 extension module aerion._core" ON)
option(AERION_PYTHON_INPLACE
       "Place the extension module inside python/aerion for in-tree development" ON)
option(AERION_BUILD_APPS "Build the aerion-engine command-line application" ON)
option(AERION_BUILD_BENCHMARKS "Build the performance benchmarks" ON)
option(AERION_ENABLE_OPENMP "Use OpenMP shared-memory parallelism when available" ON)
option(AERION_WARNINGS_AS_ERRORS "Treat compiler warnings as errors" OFF)
option(AERION_ENABLE_SANITIZERS "Instrument with AddressSanitizer + UBSan (GCC/Clang)" OFF)
option(AERION_BOUNDS_CHECK "Bounds-check field accessors (always on in Debug builds)" OFF)
option(AERION_FETCH_DEPENDENCIES
       "Download missing test dependencies (GoogleTest) with FetchContent" ON)

if(NOT CMAKE_BUILD_TYPE AND NOT CMAKE_CONFIGURATION_TYPES)
  set(CMAKE_BUILD_TYPE
      Release
      CACHE STRING "Build type" FORCE)
endif()

set(CMAKE_CXX_STANDARD 20)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_CXX_EXTENSIONS OFF)
set(CMAKE_EXPORT_COMPILE_COMMANDS ON)
# The static engine library is linked into the Python extension module.
set(CMAKE_POSITION_INDEPENDENT_CODE ON)

list(APPEND CMAKE_MODULE_PATH "${PROJECT_SOURCE_DIR}/cmake")
include(AerionCompilerSettings)
include(AerionDependencies)
include(AerionBuildInfo)

# ----------------------------------------------------------------------------
# Components
# ----------------------------------------------------------------------------
add_subdirectory(src)

if(AERION_BUILD_PYTHON)
  add_subdirectory(python)
endif()

if(AERION_BUILD_TESTS)
  enable_testing()
  add_subdirectory(tests)
endif()

if(AERION_BUILD_BENCHMARKS)
  add_subdirectory(benchmarks)
endif()

# ----------------------------------------------------------------------------
# Summary
# ----------------------------------------------------------------------------
message(STATUS "")
message(STATUS "AERION ${PROJECT_VERSION} configuration")
message(STATUS "  Build type        : ${CMAKE_BUILD_TYPE}")
message(STATUS "  C++ compiler      : ${CMAKE_CXX_COMPILER_ID} ${CMAKE_CXX_COMPILER_VERSION}")
message(STATUS "  OpenMP            : ${AERION_HAVE_OPENMP}")
message(STATUS "  CUDA              : OFF (GPU backend is planned for Stage 6)")
message(STATUS "  Python module     : ${AERION_BUILD_PYTHON}")
message(STATUS "  Tests             : ${AERION_BUILD_TESTS}")
message(STATUS "  Applications      : ${AERION_BUILD_APPS}")
message(STATUS "  Benchmarks        : ${AERION_BUILD_BENCHMARKS}")
message(STATUS "  Sanitizers        : ${AERION_ENABLE_SANITIZERS}")
message(STATUS "")
