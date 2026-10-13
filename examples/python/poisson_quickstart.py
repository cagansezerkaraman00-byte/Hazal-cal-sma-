#!/usr/bin/env python3
# SPDX-License-Identifier: Apache-2.0
"""AERION quick start: steady heat conduction in a plate with a heated edge.

Physics
-------
Steady 2D conduction without sources is governed by Laplace's equation for
the temperature T:  laplacian(T) = 0  (constant conductivity). Boundary
conditions:

* north edge held at T = 1 (Dirichlet),
* west, east and south edges held at T = 0 (Dirichlet).

This classic problem has the Fourier-series solution

    T(x, y) = sum_{k odd} 4 / (k pi) * sin(k pi x) * sinh(k pi y) / sinh(k pi)

on the unit square, which the example uses to measure the numerical error
away from the two singular top corners (where T jumps from 0 to 1).

Run (after building, see README):
    PYTHONPATH=python python3 examples/python/poisson_quickstart.py --n 128 --out results/plate
"""

from __future__ import annotations

import argparse
from pathlib import Path

import numpy as np

import aerion


def fourier_solution(x: np.ndarray, y: np.ndarray, terms: int = 401) -> np.ndarray:
    t = np.zeros_like(x)
    for k in range(1, 2 * terms, 2):
        # sinh(k pi y) / sinh(k pi), evaluated without overflow for large k.
        ratio = np.exp(k * np.pi * (y - 1.0)) * (-np.expm1(-2.0 * k * np.pi * y)) / (
            -np.expm1(-2.0 * k * np.pi)
        )
        t += 4.0 / (k * np.pi) * np.sin(k * np.pi * x) * ratio
    return t


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--n", type=int, default=128, help="cells per direction")
    parser.add_argument("--out", type=Path, default=None, help="output prefix for .vtk/.csv")
    args = parser.parse_args()

    print(aerion.build_summary())
    grid = aerion.StructuredGrid2D.uniform(args.n, args.n, 0.0, 1.0, 0.0, 1.0)
    bc = aerion.BoundaryCondition
    bcs = aerion.BoundaryConditions2D(
        west=bc.dirichlet(0.0), east=bc.dirichlet(0.0), south=bc.dirichlet(0.0), north=bc.dirichlet(1.0)
    )
    solver = aerion.PoissonSolver2D(grid, bcs, aerion.PoissonOptions(relative_tolerance=1e-10))
    result = solver.solve(np.zeros(grid.shape))
    report = result.report
    print(report)
    if not report.converged:
        print("linear solver did not converge -- results are not trustworthy")
        return 1

    temperature = result.phi
    x, y = grid.cell_centers()
    exact = fourier_solution(x, y)
    # Exclude a band near the top corners, where the exact solution is singular.
    mask = (y < 0.9) | ((x > 0.1) & (x < 0.9))
    err = np.abs(temperature - exact)[mask]
    print(f"max |T - T_exact| away from the corner singularities: {err.max():.3e}")
    if args.n % 2 == 0:
        # By superposition of the four rotated copies of this problem (which sum
        # to T = 1 everywhere), the exact centre temperature is exactly 1/4.
        c = args.n // 2
        centre = temperature[c - 1 : c + 1, c - 1 : c + 1].mean()  # bilinear at (0.5, 0.5)
        print(f"T(0.5, 0.5) = {centre:.6f}  (exact 0.25, error {abs(centre - 0.25):.2e})")

    fluxes = solver.boundary_fluxes(temperature)
    print("heat flux through each edge (outward dT/dn integrated):",
          {k: round(v, 6) for k, v in fluxes.items()})
    print(f"net flux (must be ~0 for a source-free problem): {sum(fluxes.values()):.3e}")

    if args.out:
        args.out.parent.mkdir(parents=True, exist_ok=True)
        fields = {"temperature": temperature, "exact": exact, "abs_error": np.abs(temperature - exact)}
        aerion.write_vtk(args.out.with_suffix(".vtk"), grid, fields, title="AERION heated plate")
        aerion.write_csv(args.out.with_suffix(".csv"), grid, fields)
        print(f"wrote {args.out.with_suffix('.vtk')} (open in ParaView) and {args.out.with_suffix('.csv')}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
