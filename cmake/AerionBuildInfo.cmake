# SPDX-License-Identifier: Apache-2.0
#
# Generates aerion/core/version.hpp from the CMake project version and records
# the git revision at configure time. The revision is refreshed whenever CMake
# re-configures (it may lag behind HEAD until then; this is documented).

find_package(Git QUIET)
set(AERION_GIT_REVISION "unknown")
if(GIT_FOUND AND EXISTS "${PROJECT_SOURCE_DIR}/.git")
  execute_process(
    COMMAND "${GIT_EXECUTABLE}" describe --always --dirty --abbrev=12
    WORKING_DIRECTORY "${PROJECT_SOURCE_DIR}"
    OUTPUT_VARIABLE _aerion_git_revision
    OUTPUT_STRIP_TRAILING_WHITESPACE
    RESULT_VARIABLE _aerion_git_result
    ERROR_QUIET)
  if(_aerion_git_result EQUAL 0 AND _aerion_git_revision)
    set(AERION_GIT_REVISION "${_aerion_git_revision}")
  endif()
endif()

set(AERION_GENERATED_INCLUDE_DIR "${PROJECT_BINARY_DIR}/generated/include")
configure_file("${PROJECT_SOURCE_DIR}/cmake/version.hpp.in"
               "${AERION_GENERATED_INCLUDE_DIR}/aerion/core/version.hpp" @ONLY)
