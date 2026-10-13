// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 The AERION Authors
#pragma once

#include <aerion/field/array2d.hpp>
#include <aerion/mesh/structured_grid_2d.hpp>

#include <filesystem>
#include <span>
#include <string>
#include <string_view>

namespace aerion::io {

/// A named cell-centred scalar field to be written.
struct CellScalar {
    std::string name;
    const ScalarField2D& field;
};

/// A named cell-centred 2D vector field (components u, v) to be written.
struct CellVector {
    std::string name;
    const ScalarField2D& u;
    const ScalarField2D& v;
};

/// Writes cell data as a legacy-format VTK RECTILINEAR_GRID file (ASCII,
/// "# vtk DataFile Version 3.0"), which ParaView, VisIt and the VTK library
/// read directly. The grid's face coordinates become the point coordinates
/// (z = 0), so stretched grids are represented exactly.
///
/// Values are written with max_digits10 significant digits in the "C" locale
/// (decimal point '.', independent of the user's regional settings).
/// Field names must be non-empty, unique and contain only [A-Za-z0-9_.-].
/// Non-finite values are rejected rather than written, because legacy VTK
/// readers do not parse them portably. Parent directories are created.
void write_vtk_rectilinear(const std::filesystem::path& path, const mesh::StructuredGrid2D& grid,
                           std::span<const CellScalar> scalars,
                           std::span<const CellVector> vectors = {},
                           std::string_view title = "AERION");

/// Writes cell data as comma-separated values with header
/// "i,j,x,y,<name1>,<name2>,..." -- one row per cell, i running fastest,
/// coordinates of the cell centre. Same number formatting rules as above.
void write_cell_csv(const std::filesystem::path& path, const mesh::StructuredGrid2D& grid,
                    std::span<const CellScalar> scalars);

}  // namespace aerion::io
