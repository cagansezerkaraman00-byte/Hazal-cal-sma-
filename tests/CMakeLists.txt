# SPDX-License-Identifier: Apache-2.0

include(GoogleTest)

add_executable(aerion_cpp_tests cpp/test_core.cpp cpp/test_field.cpp cpp/test_mesh.cpp)
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
endif()
