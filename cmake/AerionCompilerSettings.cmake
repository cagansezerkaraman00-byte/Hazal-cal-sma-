# SPDX-License-Identifier: Apache-2.0
#
# Compiler warnings, sanitizers and other per-target build settings shared by
# every AERION target. Targets opt in by linking `aerion::project_options`.
#
# Note: -ffast-math is deliberately NOT used anywhere. It breaks IEEE-754
# semantics (NaN/Inf detection, associativity) on which the solver's error
# control and the verification test-suite rely.

add_library(aerion_project_options INTERFACE)
add_library(aerion::project_options ALIAS aerion_project_options)

if(MSVC)
  target_compile_options(aerion_project_options INTERFACE /W4 /permissive- /utf-8
                                                          /Zc:__cplusplus /EHsc)
  # Do not warn about the "unsafe" C library functions; we do not use them.
  target_compile_definitions(aerion_project_options INTERFACE _CRT_SECURE_NO_WARNINGS NOMINMAX)
  if(AERION_WARNINGS_AS_ERRORS)
    target_compile_options(aerion_project_options INTERFACE /WX)
  endif()
else()
  target_compile_options(
    aerion_project_options
    INTERFACE -Wall
              -Wextra
              -Wpedantic
              -Wshadow
              -Wconversion
              -Wnon-virtual-dtor
              -Wold-style-cast
              -Wcast-align
              -Woverloaded-virtual
              -Wdouble-promotion
              -Wformat=2
              -Wimplicit-fallthrough)
  if(AERION_WARNINGS_AS_ERRORS)
    target_compile_options(aerion_project_options INTERFACE -Werror)
  endif()
  if(AERION_ENABLE_SANITIZERS)
    target_compile_options(aerion_project_options INTERFACE -fsanitize=address,undefined
                                                            -fno-omit-frame-pointer -fno-sanitize-recover=all)
    target_link_options(aerion_project_options INTERFACE -fsanitize=address,undefined)
  endif()
endif()
