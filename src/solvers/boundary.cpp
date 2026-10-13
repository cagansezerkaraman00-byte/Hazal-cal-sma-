// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 The AERION Authors
#include <aerion/core/error.hpp>
#include <aerion/solvers/boundary.hpp>

#include <cmath>
#include <string>
#include <utility>

namespace aerion::solvers {

std::string_view to_string(BoundarySide side) noexcept {
    switch (side) {
        case BoundarySide::West:
            return "west";
        case BoundarySide::East:
            return "east";
        case BoundarySide::South:
            return "south";
        case BoundarySide::North:
            return "north";
    }
    return "unknown";
}

Index boundary_face_count(const mesh::StructuredGrid2D& grid, BoundarySide side) noexcept {
    return (side == BoundarySide::West || side == BoundarySide::East) ? grid.ny() : grid.nx();
}

BoundaryCondition BoundaryCondition::dirichlet(Real value) {
    return {BoundaryType::Dirichlet, {value}};
}

BoundaryCondition BoundaryCondition::dirichlet(std::vector<Real> values) {
    return {BoundaryType::Dirichlet, std::move(values)};
}

BoundaryCondition BoundaryCondition::neumann(Real outward_gradient) {
    return {BoundaryType::Neumann, {outward_gradient}};
}

BoundaryCondition BoundaryCondition::neumann(std::vector<Real> outward_gradients) {
    return {BoundaryType::Neumann, std::move(outward_gradients)};
}

BoundaryConditions2D BoundaryConditions2D::all(const BoundaryCondition& bc) {
    return {bc, bc, bc, bc};
}

const BoundaryCondition& BoundaryConditions2D::operator[](BoundarySide side) const noexcept {
    switch (side) {
        case BoundarySide::West:
            return west;
        case BoundarySide::East:
            return east;
        case BoundarySide::South:
            return south;
        case BoundarySide::North:
            break;
    }
    return north;
}

BoundaryCondition& BoundaryConditions2D::operator[](BoundarySide side) noexcept {
    return const_cast<BoundaryCondition&>(std::as_const(*this)[side]);
}

bool BoundaryConditions2D::all_neumann() const noexcept {
    for (const auto side : all_sides) {
        if ((*this)[side].type != BoundaryType::Neumann) {
            return false;
        }
    }
    return true;
}

void BoundaryConditions2D::validate(const mesh::StructuredGrid2D& grid) const {
    for (const auto side : all_sides) {
        const auto& bc = (*this)[side];
        const auto expected = static_cast<std::size_t>(boundary_face_count(grid, side));
        const std::string name(to_string(side));
        require(bc.values.size() == 1 || bc.values.size() == expected,
                name + " boundary: expected 1 or " + std::to_string(expected) + " values, got " +
                    std::to_string(bc.values.size()));
        for (const Real v : bc.values) {
            require(std::isfinite(v), name + " boundary: values must be finite");
        }
    }
}

}  // namespace aerion::solvers
