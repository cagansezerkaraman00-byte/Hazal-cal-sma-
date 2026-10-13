# SPDX-License-Identifier: Apache-2.0
import aerion
import numpy as np
import pytest


def test_uniform_grid_geometry():
    g = aerion.StructuredGrid2D.uniform(4, 2, 0.0, 2.0, -1.0, 0.0)
    assert g.shape == (4, 2)
    assert g.num_cells == 8
    np.testing.assert_allclose(g.x_faces, [0.0, 0.5, 1.0, 1.5, 2.0])
    np.testing.assert_allclose(g.y_centers, [-0.75, -0.25])
    np.testing.assert_allclose(g.dx, 0.5)
    assert g.is_uniform()
    assert g.total_volume == pytest.approx(2.0)
    assert "uniform" in repr(g)


def test_cell_arrays_use_ij_indexing():
    g = aerion.StructuredGrid2D.uniform(3, 2, 0.0, 3.0, 0.0, 1.0)
    x, y = g.cell_centers()
    assert x.shape == (3, 2) and y.shape == (3, 2)
    xr, yr = np.meshgrid(g.x_centers, g.y_centers, indexing="ij")
    np.testing.assert_array_equal(x, xr)
    np.testing.assert_array_equal(y, yr)
    np.testing.assert_allclose(g.cell_volumes().sum(), 3.0)


def test_stretched_grid_from_faces():
    xf = aerion.tanh_clustered_faces(16, 0.0, 1.0, 2.5)
    yf = aerion.uniform_faces(8, 0.0, 0.5)
    g = aerion.StructuredGrid2D(xf, yf)
    assert not g.is_uniform()
    assert g.max_expansion_ratio > 1.0
    assert g.min_spacing == pytest.approx(min(np.diff(xf).min(), np.diff(yf).min()))
    np.testing.assert_allclose(g.cell_volumes().sum(), 0.5, rtol=1e-14)
    # Symmetric clustering towards both walls.
    np.testing.assert_allclose(xf + xf[::-1], 1.0, atol=1e-14)


@pytest.mark.parametrize(
    "xf",
    [[0.0], [0.0, 0.0], [0.0, 2.0, 1.0], [0.0, np.inf], [[0.0, 1.0]]],
)
def test_invalid_faces_are_rejected(xf):
    with pytest.raises(ValueError):
        aerion.StructuredGrid2D(xf, [0.0, 1.0])


def test_invalid_uniform_grid_is_rejected():
    with pytest.raises(aerion.InvalidArgumentError):
        aerion.StructuredGrid2D.uniform(0, 4, 0.0, 1.0, 0.0, 1.0)
    with pytest.raises(aerion.InvalidArgumentError):
        aerion.tanh_clustered_faces(8, 0.0, 1.0, -1.0)
