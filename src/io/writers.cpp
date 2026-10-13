// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 The AERION Authors
#include <algorithm>
#include <fstream>
#include <limits>
#include <locale>
#include <set>
#include <string>

#include <aerion/core/error.hpp>
#include <aerion/field/cell_field.hpp>
#include <aerion/io/writers.hpp>
#include <aerion/linalg/vector_ops.hpp>

namespace aerion::io {

namespace {

using mesh::StructuredGrid2D;

void check_name(const std::string& name, std::set<std::string>& seen) {
    require(!name.empty(), "output field name must not be empty");
    const bool valid = std::all_of(name.begin(), name.end(), [](char ch) {
        return (ch >= 'a' && ch <= 'z') || (ch >= 'A' && ch <= 'Z') || (ch >= '0' && ch <= '9') ||
               ch == '_' || ch == '-' || ch == '.';
    });
    require(valid, "output field name '" + name + "' may only contain [A-Za-z0-9_.-]");
    require(seen.insert(name).second, "duplicate output field name '" + name + "'");
}

void check_field(const StructuredGrid2D& grid, const std::string& name, const ScalarField2D& f) {
    require_cell_field(grid, f, name.c_str());
    require(linalg::all_finite(f.values()),
            "output field '" + name + "' contains NaN/Inf values; refusing to write it");
}

std::ofstream open_output(const std::filesystem::path& path) {
    require(!path.empty(), "output path must not be empty");
    if (path.has_parent_path()) {
        std::error_code ec;
        std::filesystem::create_directories(path.parent_path(), ec);
        if (ec) {
            throw IOError("cannot create directory '" + path.parent_path().string() +
                          "': " + ec.message());
        }
    }
    std::ofstream out(path, std::ios::out | std::ios::trunc);
    if (!out) {
        throw IOError("cannot open '" + path.string() + "' for writing");
    }
    out.imbue(std::locale::classic());
    out.precision(std::numeric_limits<Real>::max_digits10);
    return out;
}

void finish(std::ofstream& out, const std::filesystem::path& path) {
    out.flush();
    if (!out) {
        throw IOError("error while writing '" + path.string() + "'");
    }
}

void write_coordinates(std::ofstream& out, const char* axis, std::span<const Real> values) {
    out << axis << "_COORDINATES " << values.size() << " double\n";
    for (std::size_t k = 0; k < values.size(); ++k) {
        out << values[k] << ((k + 1) % 6 == 0 || k + 1 == values.size() ? '\n' : ' ');
    }
}

}  // namespace

void write_vtk_rectilinear(const std::filesystem::path& path, const StructuredGrid2D& grid,
                           std::span<const CellScalar> scalars, std::span<const CellVector> vectors,
                           std::string_view title) {
    std::set<std::string> seen;
    for (const auto& s : scalars) {
        check_name(s.name, seen);
        check_field(grid, s.name, s.field);
    }
    for (const auto& v : vectors) {
        check_name(v.name, seen);
        check_field(grid, v.name + ".u", v.u);
        check_field(grid, v.name + ".v", v.v);
    }
    std::string header(title.substr(0, 200));
    std::replace(header.begin(), header.end(), '\n', ' ');
    std::replace(header.begin(), header.end(), '\r', ' ');

    auto out = open_output(path);
    out << "# vtk DataFile Version 3.0\n"
        << (header.empty() ? "AERION" : header) << '\n'
        << "ASCII\n"
        << "DATASET RECTILINEAR_GRID\n"
        << "DIMENSIONS " << grid.nx() + 1 << ' ' << grid.ny() + 1 << " 1\n";
    write_coordinates(out, "X", grid.x_faces());
    write_coordinates(out, "Y", grid.y_faces());
    out << "Z_COORDINATES 1 double\n0\n";

    if (!scalars.empty() || !vectors.empty()) {
        out << "CELL_DATA " << grid.num_cells() << '\n';
    }
    for (const auto& s : scalars) {
        out << "SCALARS " << s.name << " double 1\nLOOKUP_TABLE default\n";
        for (const Real v : s.field.values()) {
            out << v << '\n';
        }
    }
    for (const auto& vec : vectors) {
        out << "VECTORS " << vec.name << " double\n";
        const auto u = vec.u.values();
        const auto v = vec.v.values();
        for (std::size_t k = 0; k < u.size(); ++k) {
            out << u[k] << ' ' << v[k] << " 0\n";
        }
    }
    finish(out, path);
}

void write_cell_csv(const std::filesystem::path& path, const StructuredGrid2D& grid,
                    std::span<const CellScalar> scalars) {
    std::set<std::string> seen{"i", "j", "x", "y"};
    for (const auto& s : scalars) {
        check_name(s.name, seen);
        check_field(grid, s.name, s.field);
    }
    auto out = open_output(path);
    out << "i,j,x,y";
    for (const auto& s : scalars) {
        out << ',' << s.name;
    }
    out << '\n';
    for (Index j = 0; j < grid.ny(); ++j) {
        for (Index i = 0; i < grid.nx(); ++i) {
            out << i << ',' << j << ',' << grid.xc(i) << ',' << grid.yc(j);
            for (const auto& s : scalars) {
                out << ',' << s.field(i, j);
            }
            out << '\n';
        }
    }
    finish(out, path);
}

}  // namespace aerion::io
