// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 The AERION Authors
#include <aerion/core/error.hpp>
#include <aerion/mesh/spacing.hpp>
#include <aerion/mesh/structured_grid_2d.hpp>

#include <gtest/gtest.h>

#include <cmath>
#include <limits>
#include <vector>

namespace aerion::mesh {
namespace {

TEST(Spacing, UniformFacesHitEndpointsExactly) {
    const auto f = uniform_faces(10, -1.0, 2.0);
    ASSERT_EQ(f.size(), 11U);
    EXPECT_EQ(f.front(), -1.0);
    EXPECT_EQ(f.back(), 2.0);
    for (std::size_t k = 1; k < f.size(); ++k) {
        EXPECT_NEAR(f[k] - f[k - 1], 0.3, 1e-14);
    }
}

TEST(Spacing, TanhFacesAreSymmetricMonotoneAndClustered) {
    const Index n = 32;
    const auto f = tanh_clustered_faces(n, 0.0, 1.0, 3.0);
    ASSERT_EQ(f.size(), static_cast<std::size_t>(n + 1));
    EXPECT_EQ(f.front(), 0.0);
    EXPECT_EQ(f.back(), 1.0);
    for (std::size_t k = 1; k < f.size(); ++k) {
        EXPECT_GT(f[k], f[k - 1]);
        // Symmetry about the mid-point: x_k + x_{n-k} = 1.
        EXPECT_NEAR(f[k] + f[f.size() - 1 - k], 1.0, 1e-14);
    }
    const Real wall_cell = f[1] - f[0];
    const Real centre_cell = f[n / 2 + 1] - f[n / 2];
    EXPECT_LT(wall_cell, 0.5 * centre_cell);
}

TEST(Spacing, TanhWithZeroBetaIsUniform) {
    EXPECT_EQ(tanh_clustered_faces(8, 0.0, 1.0, 0.0), uniform_faces(8, 0.0, 1.0));
}

TEST(Spacing, RejectsInvalidInput) {
    EXPECT_THROW((void)uniform_faces(0, 0.0, 1.0), InvalidArgument);
    EXPECT_THROW((void)uniform_faces(4, 1.0, 1.0), InvalidArgument);
    EXPECT_THROW((void)uniform_faces(4, 0.0, std::numeric_limits<Real>::quiet_NaN()), InvalidArgument);
    EXPECT_THROW((void)tanh_clustered_faces(4, 0.0, 1.0, -1.0), InvalidArgument);
}

TEST(StructuredGrid2D, UniformGeometry) {
    const auto g = StructuredGrid2D::uniform(4, 2, 0.0, 2.0, -1.0, 0.0);
    EXPECT_EQ(g.nx(), 4);
    EXPECT_EQ(g.ny(), 2);
    EXPECT_EQ(g.num_cells(), 8);
    EXPECT_DOUBLE_EQ(g.dx(0), 0.5);
    EXPECT_DOUBLE_EQ(g.dy(1), 0.5);
    EXPECT_DOUBLE_EQ(g.xc(0), 0.25);
    EXPECT_DOUBLE_EQ(g.xc(3), 1.75);
    EXPECT_DOUBLE_EQ(g.yc(0), -0.75);
    EXPECT_DOUBLE_EQ(g.xf(4), 2.0);
    EXPECT_DOUBLE_EQ(g.yf(0), -1.0);
    EXPECT_DOUBLE_EQ(g.volume(2, 1), 0.25);
    EXPECT_DOUBLE_EQ(g.total_volume(), 2.0);
    EXPECT_DOUBLE_EQ(g.min_spacing(), 0.5);
    EXPECT_DOUBLE_EQ(g.max_expansion_ratio(), 1.0);
    EXPECT_TRUE(g.is_uniform());
    EXPECT_EQ(g.cell_index(1, 1), 5);
}

TEST(StructuredGrid2D, CellVolumesTileTheDomain) {
    const StructuredGrid2D g(tanh_clustered_faces(17, 0.0, 3.0, 2.5),
                             tanh_clustered_faces(9, 1.0, 2.0, 1.5));
    Real sum = 0.0;
    for (Index j = 0; j < g.ny(); ++j) {
        for (Index i = 0; i < g.nx(); ++i) {
            sum += g.volume(i, j);
            EXPECT_GT(g.xc(i), g.xf(i));
            EXPECT_LT(g.xc(i), g.xf(i + 1));
        }
    }
    EXPECT_NEAR(sum, g.total_volume(), 1e-13);
    EXPECT_FALSE(g.is_uniform());
    EXPECT_GT(g.max_expansion_ratio(), 1.0);
}

TEST(StructuredGrid2D, RejectsDegenerateFaces) {
    EXPECT_THROW(StructuredGrid2D({0.0}, {0.0, 1.0}), InvalidArgument);
    EXPECT_THROW(StructuredGrid2D({0.0, 1.0, 1.0}, {0.0, 1.0}), InvalidArgument);
    EXPECT_THROW(StructuredGrid2D({0.0, 2.0, 1.0}, {0.0, 1.0}), InvalidArgument);
    EXPECT_THROW(StructuredGrid2D({0.0, 1.0}, {0.0, std::numeric_limits<Real>::infinity()}), InvalidArgument);
    EXPECT_THROW((void)StructuredGrid2D::uniform(0, 4, 0.0, 1.0, 0.0, 1.0), InvalidArgument);
}

}  // namespace
}  // namespace aerion::mesh
