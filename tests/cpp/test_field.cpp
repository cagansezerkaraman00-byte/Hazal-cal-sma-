// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 The AERION Authors
#include <cmath>
#include <numbers>
#include <stdexcept>

#include <gtest/gtest.h>

#include <aerion/core/error.hpp>
#include <aerion/field/array2d.hpp>
#include <aerion/field/cell_field.hpp>
#include <aerion/mesh/spacing.hpp>
#include <aerion/mesh/structured_grid_2d.hpp>

namespace aerion {
namespace {

TEST(Array2D, LayoutIsIFastest) {
    Array2D<Real> a(3, 2);
    for (Index j = 0; j < 2; ++j) {
        for (Index i = 0; i < 3; ++i) {
            a(i, j) = static_cast<Real>(10 * j + i);
        }
    }
    const Real expected[] = {0, 1, 2, 10, 11, 12};
    for (Index k = 0; k < a.size(); ++k) {
        EXPECT_EQ(a.data()[k], expected[k]);
    }
}

TEST(Array2D, GhostLayersUseNegativeIndices) {
    auto a = Array2D<Real>::with_ghosts(4, 3, 2, -1.0);
    EXPECT_EQ(a.i_range().begin, -2);
    EXPECT_EQ(a.i_range().end, 6);
    EXPECT_EQ(a.ni(), 8);
    EXPECT_EQ(a.nj(), 7);
    EXPECT_EQ(a(-2, -2), -1.0);
    a(-2, -2) = 5.0;
    a(5, 4) = 7.0;
    EXPECT_EQ(a.data()[0], 5.0);
    EXPECT_EQ(a.data()[a.size() - 1], 7.0);
    EXPECT_TRUE(a.contains(-1, 4));
    EXPECT_FALSE(a.contains(6, 0));
}

TEST(Array2D, StaggeredRangeAndShapeComparison) {
    const Array2D<Real> u(IndexRange{0, 5}, IndexRange{0, 4});  // x-faces of a 4x4 grid
    const Array2D<Real> p(4, 4);
    EXPECT_EQ(u.size(), 20);
    EXPECT_FALSE(u.same_shape(p));
    EXPECT_TRUE(p.same_shape(Array2D<Real>(4, 4, 3.0)));
}

TEST(Array2D, FillAndValuesSpan) {
    Array2D<int> a(2, 2, 1);
    a.fill(9);
    for (const int v : a.values()) {
        EXPECT_EQ(v, 9);
    }
}

#if defined(AERION_BOUNDS_CHECK)
TEST(Array2D, BoundsCheckingThrows) {
    Array2D<Real> a(2, 2);
    EXPECT_THROW((void)a(2, 0), std::out_of_range);
    EXPECT_THROW((void)a(0, -1), std::out_of_range);
}
#endif

TEST(CellField, NormsOnUniformGrid) {
    const auto g = mesh::StructuredGrid2D::uniform(4, 4, 0.0, 1.0, 0.0, 1.0);
    auto f = make_cell_field(g, 2.0);
    EXPECT_DOUBLE_EQ(norm_l2(g, f), 2.0);
    EXPECT_DOUBLE_EQ(norm_linf(g, f), 2.0);
    EXPECT_DOUBLE_EQ(volume_integral(g, f), 2.0);
    f(1, 2) = -6.0;
    EXPECT_DOUBLE_EQ(norm_linf(g, f), 6.0);
}

TEST(CellField, VolumeWeightingOnStretchedGrid) {
    // The midpoint rule integrates the linear function x + y exactly on any grid.
    const mesh::StructuredGrid2D g(mesh::tanh_clustered_faces(16, 0.0, 2.0, 3.0),
                                   mesh::tanh_clustered_faces(8, 0.0, 1.0, 2.0));
    const auto f = sample_cell_centers(g, [](Real x, Real y) { return x + y; });
    EXPECT_NEAR(volume_integral(g, f), 3.0, 1e-13);  // int_0^2 int_0^1 (x+y) dy dx
    EXPECT_NEAR(volume_average(g, f), 1.5, 1e-13);
}

TEST(CellField, MidpointRuleIsSecondOrder) {
    auto error = [](Index n) {
        const auto g = mesh::StructuredGrid2D::uniform(n, n, 0.0, 1.0, 0.0, 1.0);
        const auto f = sample_cell_centers(
            g, [](Real x, Real y) { return std::sin(std::numbers::pi * x) * std::exp(y); });
        const Real exact = 2.0 / std::numbers::pi * (std::numbers::e - 1.0);
        return std::abs(volume_integral(g, f) - exact);
    };
    const Real order = std::log2(error(32) / error(64));
    EXPECT_NEAR(order, 2.0, 0.02);
}

TEST(CellField, ShapeMismatchIsRejected) {
    const auto g = mesh::StructuredGrid2D::uniform(4, 4, 0.0, 1.0, 0.0, 1.0);
    const Array2D<Real> wrong(5, 4);
    EXPECT_THROW((void)norm_l2(g, wrong), InvalidArgument);
    const auto ghosted = Array2D<Real>::with_ghosts(4, 4, 1);
    EXPECT_THROW((void)volume_integral(g, ghosted), InvalidArgument);
}

}  // namespace
}  // namespace aerion
