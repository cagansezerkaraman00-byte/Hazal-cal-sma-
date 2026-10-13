# SPDX-License-Identifier: Apache-2.0

add_executable(aerion_bench_poisson poisson_solvers.cpp)
set_target_properties(aerion_bench_poisson PROPERTIES OUTPUT_NAME aerion-bench-poisson)
target_link_libraries(aerion_bench_poisson PRIVATE aerion::core aerion::project_options)
