# SPDX-License-Identifier: Apache-2.0
import aerion
import numpy as np
import pytest


@pytest.fixture
def grid():
    return aerion.StructuredGrid2D(
        aerion.tanh_clustered_faces(6, 0.0, 2.0, 1.5), aerion.uniform_faces(4, 0.0, 1.0)
    )


def test_csv_round_trip(tmp_path, grid):
    x, y = grid.cell_centers()
    phi = np.sin(x) * np.cos(y)
    path = tmp_path / "sub" / "fields.csv"
    aerion.write_csv(path, grid, {"phi": phi, "x2": x**2})
    data = np.genfromtxt(path, delimiter=",", names=True)
    assert data.dtype.names == ("i", "j", "x", "y", "phi", "x2")
    assert len(data) == grid.num_cells
    # Rows are ordered with i fastest -> reshape in Fortran order gives (nx, ny).
    np.testing.assert_array_equal(data["phi"].reshape(grid.shape, order="F"), phi)
    np.testing.assert_array_equal(data["x"].reshape(grid.shape, order="F"), x)


def test_vtk_structure(tmp_path, grid):
    x, y = grid.cell_centers()
    path = tmp_path / "fields.vtk"
    aerion.write_vtk(path, grid, {"p": x + y}, vectors={"U": (np.ones_like(x), -y)}, title="t")
    tokens = path.read_text(encoding="ascii").split()
    assert tokens[:6] == ["#", "vtk", "DataFile", "Version", "3.0", "t"]
    k = tokens.index("DIMENSIONS")
    assert tokens[k + 1 : k + 4] == ["7", "5", "1"]
    k = tokens.index("X_COORDINATES")
    np.testing.assert_array_equal(np.array(tokens[k + 3 : k + 3 + 7], dtype=float), grid.x_faces)
    k = tokens.index("SCALARS")
    values = np.array(tokens[k + 6 : k + 6 + grid.num_cells], dtype=float)
    np.testing.assert_array_equal(values.reshape(grid.shape, order="F"), x + y)
    assert "VECTORS" in tokens


def test_vtk_readable_by_vtk_library(tmp_path, grid):
    vtk = pytest.importorskip("vtk")
    x, y = grid.cell_centers()
    path = tmp_path / "fields.vtk"
    aerion.write_vtk(path, grid, {"p": x * y})
    reader = vtk.vtkRectilinearGridReader()
    reader.SetFileName(str(path))
    reader.Update()
    out = reader.GetOutput()
    assert out.GetDimensions() == (7, 5, 1)
    arr = out.GetCellData().GetArray("p")
    values = np.array([arr.GetValue(k) for k in range(arr.GetNumberOfTuples())])
    np.testing.assert_array_equal(values.reshape(grid.shape, order="F"), x * y)


def test_writers_validate_input(tmp_path, grid):
    good = np.zeros(grid.shape)
    with pytest.raises(aerion.InvalidArgumentError):
        aerion.write_vtk(tmp_path / "a.vtk", grid, {"bad name": good})
    with pytest.raises(aerion.InvalidArgumentError):
        aerion.write_vtk(tmp_path / "a.vtk", grid, {"p": np.zeros((2, 2))})
    with pytest.raises(aerion.InvalidArgumentError):
        aerion.write_vtk(tmp_path / "a.vtk", grid, {"p": np.full(grid.shape, np.inf)})
    with pytest.raises(aerion.InvalidArgumentError):
        aerion.write_vtk(tmp_path / "a.vtk", grid, {}, vectors={"U": (good,)})
    with pytest.raises(aerion.AerionIOError):
        aerion.write_csv(tmp_path, grid, {"p": good})  # a directory, not a file
