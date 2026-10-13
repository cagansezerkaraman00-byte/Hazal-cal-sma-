// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 The AERION Authors
#pragma once

#include <array>
#include <string_view>
#include <vector>

#include <aerion/core/types.hpp>
#include <aerion/mesh/structured_grid_2d.hpp>

namespace aerion::solvers {

/// Sides of a rectangular structured domain.
enum class BoundarySide { West = 0, East = 1, South = 2, North = 3 };

inline constexpr std::array<BoundarySide, 4> all_sides = {BoundarySide::West, BoundarySide::East,
                                                          BoundarySide::South, BoundarySide::North};

[[nodiscard]] std::string_view to_string(BoundarySide side) noexcept;

/// Number of boundary faces on `side` (ny for West/East, nx for South/North).
[[nodiscard]] Index boundary_face_count(const mesh::StructuredGrid2D& grid,
                                        BoundarySide side) noexcept;

enum class BoundaryType {
    Dirichlet,  ///< Prescribed value phi_b at the boundary face centre.
    Neumann,    ///< Prescribed outward normal derivative d(phi)/dn at the face.
};

/// Boundary condition of a scalar on one side of the domain.
///
/// `values` holds either one entry (uniform along the side) or one entry per
/// boundary face, ordered by increasing coordinate along the side (j for
/// West/East, i for South/North).
///
/// Sign convention for Neumann conditions: the value is the derivative along
/// the OUTWARD unit normal. On the west side, d(phi)/dn = -d(phi)/dx; on the
/// north side, d(phi)/dn = +d(phi)/dy. A positive value therefore means that
/// phi increases towards the outside of the domain.
struct BoundaryCondition {
    BoundaryType type = BoundaryType::Dirichlet;
    std::vector<Real> values{0.0};

    [[nodiscard]] static BoundaryCondition dirichlet(Real value);
    [[nodiscard]] static BoundaryCondition dirichlet(std::vector<Real> values);
    [[nodiscard]] static BoundaryCondition neumann(Real outward_gradient);
    [[nodiscard]] static BoundaryCondition neumann(std::vector<Real> outward_gradients);

    /// Value on boundary face `face` (any face if the condition is uniform).
    [[nodiscard]] Real value(Index face) const noexcept {
        return values.size() == 1 ? values.front() : values[static_cast<std::size_t>(face)];
    }
};

/// Boundary conditions on the four sides of a rectangular domain.
struct BoundaryConditions2D {
    BoundaryCondition west;
    BoundaryCondition east;
    BoundaryCondition south;
    BoundaryCondition north;

    [[nodiscard]] static BoundaryConditions2D all(const BoundaryCondition& bc);

    [[nodiscard]] const BoundaryCondition& operator[](BoundarySide side) const noexcept;
    [[nodiscard]] BoundaryCondition& operator[](BoundarySide side) noexcept;

    /// True when no side fixes the level of phi (pure-Neumann problem).
    [[nodiscard]] bool all_neumann() const noexcept;

    /// Throws InvalidArgument when a side has the wrong number of values for
    /// `grid` or contains non-finite values.
    void validate(const mesh::StructuredGrid2D& grid) const;
};

}  // namespace aerion::solvers
