# SPDX-License-Identifier: Apache-2.0
#
# Third-party dependencies. Every dependency is optional except the C++20
# compiler itself; missing optional pieces disable the matching feature with a
# clear message instead of failing the configuration.

# ---------------------------------------------------------------------------
# OpenMP (optional): shared-memory parallelism of the linear-algebra kernels.
# ---------------------------------------------------------------------------
set(AERION_HAVE_OPENMP OFF)
if(AERION_ENABLE_OPENMP)
  find_package(OpenMP COMPONENTS CXX)
  if(OpenMP_CXX_FOUND)
    set(AERION_HAVE_OPENMP ON)
  else()
    message(STATUS "OpenMP not found: building the serial engine "
                   "(on Clang install libomp-dev to enable it)")
  endif()
endif()

# ---------------------------------------------------------------------------
# Python + pybind11 (optional): the aerion._core extension module.
# ---------------------------------------------------------------------------
if(AERION_BUILD_PYTHON OR AERION_BUILD_TESTS)
  find_package(Python 3.10 COMPONENTS Interpreter Development.Module)
endif()

if(AERION_BUILD_PYTHON)
  if(NOT Python_Development.Module_FOUND)
    message(FATAL_ERROR "Python development headers not found (Debian/Ubuntu: "
                        "'sudo apt install python3-dev'). Or configure with -DAERION_BUILD_PYTHON=OFF.")
  endif()
  set(PYBIND11_FINDPYTHON ON)
  find_package(pybind11 CONFIG QUIET)
  if(NOT pybind11_FOUND)
    # pybind11 installed with pip ships its CMake package inside site-packages.
    execute_process(
      COMMAND "${Python_EXECUTABLE}" -m pybind11 --cmakedir
      OUTPUT_VARIABLE _aerion_pybind11_dir
      OUTPUT_STRIP_TRAILING_WHITESPACE
      RESULT_VARIABLE _aerion_pybind11_result
      ERROR_QUIET)
    if(_aerion_pybind11_result EQUAL 0)
      find_package(pybind11 CONFIG REQUIRED HINTS "${_aerion_pybind11_dir}")
    else()
      message(FATAL_ERROR "pybind11 not found. Install it with 'python3 -m pip install pybind11' "
                          "or configure with -DAERION_BUILD_PYTHON=OFF.")
    endif()
  endif()
  message(STATUS "pybind11 ${pybind11_VERSION} (Python ${Python_VERSION})")
endif()

# ---------------------------------------------------------------------------
# GoogleTest (tests only): use an installed copy, otherwise fetch a pinned one.
# ---------------------------------------------------------------------------
if(AERION_BUILD_TESTS)
  find_package(GTest 1.11 CONFIG QUIET)
  if(GTest_FOUND)
    message(STATUS "GoogleTest ${GTest_VERSION} (system)")
  elseif(AERION_FETCH_DEPENDENCIES)
    include(FetchContent)
    message(STATUS "GoogleTest not found: fetching v1.15.2")
    # Use the same CRT as the rest of the project on MSVC.
    set(gtest_force_shared_crt
        ON
        CACHE BOOL "" FORCE)
    set(INSTALL_GTEST
        OFF
        CACHE BOOL "" FORCE)
    set(BUILD_GMOCK
        OFF
        CACHE BOOL "" FORCE)
    FetchContent_Declare(
      googletest
      GIT_REPOSITORY https://github.com/google/googletest.git
      GIT_TAG v1.15.2
      GIT_SHALLOW TRUE)
    FetchContent_MakeAvailable(googletest)
  else()
    message(FATAL_ERROR "GoogleTest not found and AERION_FETCH_DEPENDENCIES=OFF. "
                        "Install it (Ubuntu: 'sudo apt install libgtest-dev') or disable tests.")
  endif()
endif()
