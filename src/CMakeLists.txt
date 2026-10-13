# SPDX-License-Identifier: Apache-2.0
#
# aerion_core: the C++ computational engine (static library).

add_library(
  aerion_core STATIC
  core/build_info.cpp
  core/error.cpp
  core/logger.cpp
  core/parallel.cpp)
add_library(aerion::core ALIAS aerion_core)

target_include_directories(
  aerion_core PUBLIC $<BUILD_INTERFACE:${PROJECT_SOURCE_DIR}/include>
                     $<BUILD_INTERFACE:${AERION_GENERATED_INCLUDE_DIR}>)
target_compile_features(aerion_core PUBLIC cxx_std_20)
target_compile_definitions(aerion_core PRIVATE AERION_BUILD_TYPE="$<CONFIG>")
target_link_libraries(aerion_core PRIVATE aerion::project_options)
# Bounds checking changes inline accessors in public headers, so propagate it.
target_compile_definitions(
  aerion_core PUBLIC $<$<OR:$<CONFIG:Debug>,$<BOOL:${AERION_BOUNDS_CHECK}>>:AERION_BOUNDS_CHECK=1>)

if(AERION_HAVE_OPENMP)
  target_link_libraries(aerion_core PUBLIC OpenMP::OpenMP_CXX)
  target_compile_definitions(aerion_core PUBLIC AERION_HAVE_OPENMP=1)
endif()

if(AERION_BUILD_APPS)
  add_executable(aerion_engine app/aerion_engine.cpp)
  set_target_properties(aerion_engine PROPERTIES OUTPUT_NAME aerion-engine)
  target_link_libraries(aerion_engine PRIVATE aerion::core aerion::project_options)
endif()
