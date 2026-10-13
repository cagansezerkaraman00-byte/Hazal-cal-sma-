// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 The AERION Authors
#include <cmath>
#include <numbers>

#include <aerion/core/error.hpp>
#include <aerion/field/cell_field.hpp>
#include <aerion/mesh/spacing.hpp>
#include <aerion/verification/manufactured.hpp>

namespace aerion::verification {

using solvers::BoundaryType;
using std::cos;
using std::exp;
using std::sin;

namespace {
constexpr Real pi = std::numbers::pi;
}  // namespace

ManufacturedSolution2D sine_dirichlet() {
    return {"sine-dirichlet",
            [](Real x, Real y) { return sin(pi * x) * sin(pi * y); },
            [](Real x, Real y) { return -2.0 * pi * pi * sin(pi * x) * sin(pi * y); },
            [](Real x, Real y) { return pi * cos(pi * x) * sin(pi * y); },
            [](Real x, Real y) { return pi * sin(pi * x) * cos(pi * y); },
            0.0,
            1.0,
            0.0,
            1.0,
            {BoundaryType::Dirichlet, BoundaryType::Dirichlet, BoundaryType::Dirichlet,
             BoundaryType::Dirichlet}};
}

ManufacturedSolution2D cosine_neumann() {
    return {"cosine-neumann",
            [](Real x, Real y) { return cos(pi * x) * cos(pi * y); },
            [](Real x, Real y) { return -2.0 * pi * pi * cos(pi * x) * cos(pi * y); },
            [](Real x, Real y) { return -pi * sin(pi * x) * cos(pi * y); },
            [](Real x, Real y) { return -pi * cos(pi * x) * sin(pi * y); },
            0.0,
            1.0,
            0.0,
            1.0,
            {BoundaryType::Neumann, BoundaryType::Neumann, BoundaryType::Neumann,
             BoundaryType::Neumann}};
}

ManufacturedSolution2D exp_mixed() {
    return {"exp-mixed",
            [](Real x, Real y) { return exp(x) * sin(2.0 * y) + x * x * y; },
            [](Real x, Real y) { return -3.0 * exp(x) * sin(2.0 * y) + 2.0 * y; },
            [](Real x, Real y) { return exp(x) * sin(2.0 * y) + 2.0 * x * y; },
            [](Real x, Real y) { return 2.0 * exp(x) * cos(2.0 * y) + x * x; },
            0.0,
            2.0,
            0.0,
            1.0,
            {BoundaryType::Dirichlet, BoundaryType::Dirichlet, BoundaryType::Neumann,
             BoundaryType::Neumann}};
}

std::vector<ManufacturedSolution2D> all_manufactured_solutions() {
    return {sine_dirichlet(), cosine_neumann(), exp_mixed()};
}

mesh::StructuredGrid2D make_grid(const ManufacturedSolution2D& ms, Index nx, Index ny, Real beta) {
    return {mesh::tanh_clustered_faces(nx, ms.x_min, ms.x_max, beta),
            mesh::tanh_clustered_faces(ny, ms.y_min, ms.y_max, beta)};
}

ScalarField2D source_field(const ManufacturedSolution2D& ms, const mesh::StructuredGrid2D& grid) {
    return sample_cell_centers(grid, ms.laplacian);
}

solvers::BoundaryConditions2D boundary_conditions(const ManufacturedSolution2D& ms,
                                                  const mesh::StructuredGrid2D& grid) {
    using solvers::BoundarySide;
    solvers::BoundaryConditions2D bcs;
    for (const auto side : solvers::all_sides) {
        const BoundaryType type = ms.boundary_types[static_cast<std::size_t>(side)];
        const Index count = solvers::boundary_face_count(grid, side);
        std::vector<Real> values(static_cast<std::size_t>(count));
        for (Index m = 0; m < count; ++m) {
            Real x = 0.0;
            Real y = 0.0;
            Real outward_derivative = 0.0;
            switch (side) {
                case BoundarySide::West:
                    x = grid.x_min();
                    y = grid.yc(m);
                    outward_derivative = -ms.dphi_dx(x, y);
                    break;
                case BoundarySide::East:
                    x = grid.x_max();
                    y = grid.yc(m);
                    outward_derivative = ms.dphi_dx(x, y);
                    break;
                case BoundarySide::South:
                    x = grid.xc(m);
                    y = grid.y_min();
                    outward_derivative = -ms.dphi_dy(x, y);
                    break;
                case BoundarySide::North:
                    x = grid.xc(m);
                    y = grid.y_max();
                    outward_derivative = ms.dphi_dy(x, y);
                    break;
            }
            values[static_cast<std::size_t>(m)] =
                type == BoundaryType::Dirichlet ? ms.phi(x, y) : outward_derivative;
        }
        bcs[side] = {type, std::move(values)};
    }
    return bcs;
}

ErrorNorms error_norms(const ManufacturedSolution2D& ms, const mesh::StructuredGrid2D& grid,
                       const ScalarField2D& phi, bool remove_mean) {
    require_cell_field(grid, phi, "phi");
    ScalarField2D err = sample_cell_centers(grid, ms.phi);
    for (Index j = 0; j < grid.ny(); ++j) {
        for (Index i = 0; i < grid.nx(); ++i) {
            err(i, j) = phi(i, j) - err(i, j);
        }
    }
    if (remove_mean) {
        const Real mean = volume_average(grid, err);
        for (Real& v : err.values()) {
            v -= mean;
        }
    }
    return {norm_l2(grid, err), norm_linf(grid, err)};
}

}  // namespace aerion::verification
