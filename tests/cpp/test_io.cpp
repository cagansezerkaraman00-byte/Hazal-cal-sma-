// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 The AERION Authors
#include <aerion/core/error.hpp>
#include <aerion/field/cell_field.hpp>
#include <aerion/io/writers.hpp>
#include <aerion/mesh/spacing.hpp>

#include <gtest/gtest.h>

#include <filesystem>
#include <fstream>
#include <limits>
#include <locale>
#include <random>
#include <sstream>
#include <string>
#include <vector>

namespace aerion::io {
namespace {

namespace fs = std::filesystem;

class IoTest : public ::testing::Test {
protected:
    void SetUp() override {
        std::random_device rd;
        dir_ = fs::temp_directory_path() / ("aerion_io_test_" + std::to_string(rd()));
        fs::create_directories(dir_);
    }
    void TearDown() override {
        std::error_code ec;
        fs::remove_all(dir_, ec);
    }
    static std::vector<std::string> read_lines(const fs::path& p) {
        std::ifstream in(p);
        std::vector<std::string> lines;
        for (std::string line; std::getline(in, line);) {
            lines.push_back(line);
        }
        return lines;
    }
    fs::path dir_;
};

/// Minimal reader for the subset of legacy VTK we write: returns all tokens.
std::vector<std::string> tokens_of(const fs::path& p) {
    std::ifstream in(p);
    std::vector<std::string> t;
    for (std::string s; in >> s;) {
        t.push_back(s);
    }
    return t;
}

TEST_F(IoTest, VtkRectilinearRoundTrip) {
    const mesh::StructuredGrid2D grid(mesh::tanh_clustered_faces(5, 0.0, 1.0, 2.0),
                                      mesh::uniform_faces(3, -1.0, 1.0));
    const auto phi = sample_cell_centers(grid, [](Real x, Real y) { return x * 1e-7 + y / 3.0; });
    const auto u = make_cell_field(grid, 1.5);
    const auto v = make_cell_field(grid, -0.25);
    const CellScalar scalars[] = {{"phi", phi}};
    const CellVector vectors[] = {{"velocity", u, v}};
    const auto path = dir_ / "nested" / "out.vtk";
    write_vtk_rectilinear(path, grid, scalars, vectors, "unit test");

    const auto lines = read_lines(path);
    ASSERT_GE(lines.size(), 5U);
    EXPECT_EQ(lines[0], "# vtk DataFile Version 3.0");
    EXPECT_EQ(lines[1], "unit test");
    EXPECT_EQ(lines[2], "ASCII");
    EXPECT_EQ(lines[3], "DATASET RECTILINEAR_GRID");
    EXPECT_EQ(lines[4], "DIMENSIONS 6 4 1");

    const auto t = tokens_of(path);
    auto find = [&](const std::string& key) {
        const auto it = std::find(t.begin(), t.end(), key);
        EXPECT_NE(it, t.end()) << key;
        return static_cast<std::size_t>(it - t.begin());
    };
    // X coordinates are the face coordinates, written losslessly.
    const std::size_t xk = find("X_COORDINATES");
    EXPECT_EQ(t[xk + 1], "6");
    for (Index i = 0; i <= grid.nx(); ++i) {
        EXPECT_EQ(std::stod(t[xk + 3 + static_cast<std::size_t>(i)]), grid.xf(i));
    }
    const std::size_t ck = find("CELL_DATA");
    EXPECT_EQ(t[ck + 1], "15");
    const std::size_t sk = find("SCALARS");
    EXPECT_EQ(t[sk + 1], "phi");
    for (Index k = 0; k < grid.num_cells(); ++k) {
        EXPECT_EQ(std::stod(t[sk + 6 + static_cast<std::size_t>(k)]), phi.data()[k]);
    }
    const std::size_t vk = find("VECTORS");
    EXPECT_EQ(t[vk + 1], "velocity");
    EXPECT_EQ(std::stod(t[vk + 3]), 1.5);
    EXPECT_EQ(std::stod(t[vk + 4]), -0.25);
    EXPECT_EQ(std::stod(t[vk + 5]), 0.0);
}

TEST_F(IoTest, CsvHasHeaderAndOneRowPerCell) {
    const auto grid = mesh::StructuredGrid2D::uniform(3, 2, 0.0, 3.0, 0.0, 1.0);
    const auto a = sample_cell_centers(grid, [](Real x, Real) { return x; });
    const auto b = make_cell_field(grid, 0.1);
    const CellScalar fields[] = {{"a", a}, {"b", b}};
    const auto path = dir_ / "out.csv";
    write_cell_csv(path, grid, fields);
    const auto lines = read_lines(path);
    ASSERT_EQ(lines.size(), 7U);
    EXPECT_EQ(lines[0], "i,j,x,y,a,b");
    EXPECT_EQ(lines[1], "0,0,0.5,0.25,0.5,0.10000000000000001");
    EXPECT_EQ(lines[6], "2,1,2.5,0.75,2.5,0.10000000000000001");
}

TEST_F(IoTest, OutputIsLocaleIndependent) {
    // Even if the global C++ locale uses a decimal comma, files use '.'.
    struct CommaNumpunct : std::numpunct<char> {
        char do_decimal_point() const override { return ','; }
    };
    const std::locale previous = std::locale::global(std::locale(std::locale::classic(),
                                                                 new CommaNumpunct));
    const auto grid = mesh::StructuredGrid2D::uniform(1, 1, 0.0, 1.0, 0.0, 1.0);
    const auto a = make_cell_field(grid, 0.5);
    const CellScalar fields[] = {{"a", a}};
    write_cell_csv(dir_ / "locale.csv", grid, fields);
    std::locale::global(previous);
    EXPECT_EQ(read_lines(dir_ / "locale.csv")[1], "0,0,0.5,0.5,0.5");
}

TEST_F(IoTest, RejectsBadNamesShapesAndValues) {
    const auto grid = mesh::StructuredGrid2D::uniform(2, 2, 0.0, 1.0, 0.0, 1.0);
    const auto ok = make_cell_field(grid);
    const ScalarField2D wrong(3, 2);
    auto nan_field = make_cell_field(grid);
    nan_field(0, 0) = std::numeric_limits<Real>::quiet_NaN();
    const auto p = dir_ / "x.vtk";
    {
        const CellScalar f[] = {{"has space", ok}};
        EXPECT_THROW(write_vtk_rectilinear(p, grid, f), InvalidArgument);
    }
    {
        const CellScalar f[] = {{"a", ok}, {"a", ok}};
        EXPECT_THROW(write_vtk_rectilinear(p, grid, f), InvalidArgument);
    }
    {
        const CellScalar f[] = {{"x", ok}};
        EXPECT_THROW(write_cell_csv(dir_ / "x.csv", grid, f), InvalidArgument);  // clashes with column
    }
    {
        const CellScalar f[] = {{"w", wrong}};
        EXPECT_THROW(write_vtk_rectilinear(p, grid, f), InvalidArgument);
    }
    {
        const CellScalar f[] = {{"n", nan_field}};
        EXPECT_THROW(write_vtk_rectilinear(p, grid, f), InvalidArgument);
    }
}

TEST_F(IoTest, ReportsUnwritablePath) {
    const auto grid = mesh::StructuredGrid2D::uniform(2, 2, 0.0, 1.0, 0.0, 1.0);
    const auto ok = make_cell_field(grid);
    const CellScalar f[] = {{"a", ok}};
    // A directory cannot be opened as a file.
    EXPECT_THROW(write_cell_csv(dir_, grid, f), IOError);
}

}  // namespace
}  // namespace aerion::io
