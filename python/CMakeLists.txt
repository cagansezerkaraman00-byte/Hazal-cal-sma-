# SPDX-License-Identifier: Apache-2.0
#
# Python extension module aerion._core (pybind11).
#
# Development layouts:
#   AERION_PYTHON_INPLACE=ON  -> the module is written into python/aerion/, so
#                                PYTHONPATH=python picks up live .py edits.
#   AERION_PYTHON_INPLACE=OFF -> the module and a copy of the .py sources go to
#                                <build>/python/aerion (isolated per build tree).
# scikit-build-core (pip install .) uses the install() rules below.

pybind11_add_module(aerion_python MODULE bindings/aerion_core.cpp)
set_target_properties(aerion_python PROPERTIES OUTPUT_NAME _core)
target_link_libraries(aerion_python PRIVATE aerion::core aerion::project_options)

set(_aerion_py_src "${PROJECT_SOURCE_DIR}/python/aerion")
if(AERION_PYTHON_INPLACE AND NOT SKBUILD)
  set(_aerion_py_out "${_aerion_py_src}")
else()
  set(_aerion_py_out "${PROJECT_BINARY_DIR}/python/aerion")
  file(
    GLOB_RECURSE _aerion_py_files CONFIGURE_DEPENDS
    RELATIVE "${_aerion_py_src}"
    "${_aerion_py_src}/*.py")
  set(_aerion_py_copies)
  foreach(_file IN LISTS _aerion_py_files)
    get_filename_component(_dir "${_aerion_py_out}/${_file}" DIRECTORY)
    add_custom_command(
      OUTPUT "${_aerion_py_out}/${_file}"
      COMMAND "${CMAKE_COMMAND}" -E make_directory "${_dir}"
      COMMAND "${CMAKE_COMMAND}" -E copy_if_different "${_aerion_py_src}/${_file}"
              "${_aerion_py_out}/${_file}"
      DEPENDS "${_aerion_py_src}/${_file}"
      VERBATIM)
    list(APPEND _aerion_py_copies "${_aerion_py_out}/${_file}")
  endforeach()
  add_custom_target(aerion_python_sources ALL DEPENDS ${_aerion_py_copies})
endif()

# "$<1:...>" stops multi-config generators from appending a per-config subdirectory.
set_target_properties(aerion_python PROPERTIES LIBRARY_OUTPUT_DIRECTORY "$<1:${_aerion_py_out}>"
                                               RUNTIME_OUTPUT_DIRECTORY "$<1:${_aerion_py_out}>")

get_filename_component(_aerion_pythonpath "${_aerion_py_out}" DIRECTORY)
set(AERION_PYTHONPATH
    "${_aerion_pythonpath}"
    CACHE INTERNAL "Directory to put on PYTHONPATH to import this build of aerion")

if(SKBUILD)
  install(
    TARGETS aerion_python
    LIBRARY DESTINATION aerion
    RUNTIME DESTINATION aerion)
endif()
