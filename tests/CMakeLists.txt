# SPDX-License-Identifier: Apache-2.0

include(GoogleTest)

add_executable(
  aerion_cpp_tests
  cpp/test_core.cpp
  cpp/test_field.cpp
  cpp/test_io.cpp
  cpp/test_linalg.cpp
  cpp/test_mesh.cpp
  cpp/test_poisson.cpp)
target_link_libraries(aerion_cpp_tests PRIVATE aerion::core aerion::project_options GTest::gtest_main)
gtest_discover_tests(aerion_cpp_tests DISCOVERY_TIMEOUT 60 PROPERTIES LABELS "cpp")

if(AERION_BUILD_APPS)
  add_test(NAME cli.version COMMAND aerion_engine version)
  set_tests_properties(cli.version PROPERTIES LABELS "cli" PASS_REGULAR_EXPRESSION
                                                           "^${PROJECT_VERSION}")
  add_test(NAME cli.info COMMAND aerion_engine info)
  set_tests_properties(cli.info PROPERTIES LABELS "cli" PASS_REGULAR_EXPRESSION "Engineering the Invisible")
  add_test(NAME cli.unknown_command COMMAND aerion_engine no-such-command)
  set_tests_properties(cli.unknown_command PROPERTIES LABELS "cli" WILL_FAIL TRUE)
  add_test(NAME cli.poisson_mms_bad_option COMMAND aerion_engine poisson-mms --levels 0)
  set_tests_properties(cli.poisson_mms_bad_option PROPERTIES LABELS "cli" WILL_FAIL TRUE)
  # End-to-end run: mixed boundary conditions on a stretched grid, with output.
  add_test(
    NAME cli.poisson_mms_exp_mixed
    COMMAND
      aerion_engine poisson-mms --case exp-mixed --levels 8,16,32 --beta 1.5 --vtk
      ${CMAKE_CURRENT_BINARY_DIR}/output/poisson_mms.vtk --csv
      ${CMAKE_CURRENT_BINARY_DIR}/output/poisson_mms.csv)
  set_tests_properties(cli.poisson_mms_exp_mixed PROPERTIES LABELS "cli" PASS_REGULAR_EXPRESSION
                                                                       "wrote .*poisson_mms.csv")
endif()

# Python test-suite (pytest), run against the extension module of this build.
if(AERION_BUILD_PYTHON)
  execute_process(
    COMMAND "${Python_EXECUTABLE}" -c "import pytest, numpy"
    RESULT_VARIABLE _aerion_pytest_missing
    OUTPUT_QUIET ERROR_QUIET)
  if(_aerion_pytest_missing EQUAL 0)
    add_test(NAME python.pytest COMMAND "${Python_EXECUTABLE}" -m pytest
                                        "${CMAKE_CURRENT_SOURCE_DIR}/python" -q -p no:cacheprovider)
    set_tests_properties(python.pytest PROPERTIES LABELS "python" TIMEOUT 900 ENVIRONMENT
                                                  "PYTHONPATH=${AERION_PYTHONPATH}")
  else()
    message(WARNING "pytest/numpy not importable by ${Python_EXECUTABLE}: Python tests are not "
                    "registered with CTest ('python3 -m pip install -r requirements-dev.txt').")
  endif()
endif()
