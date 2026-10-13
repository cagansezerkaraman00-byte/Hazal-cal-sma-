# SPDX-License-Identifier: Apache-2.0
# Copyright (c) 2026 The AERION Authors
"""Order-of-accuracy verification of the Poisson solver.

The manufactured solutions are defined here in NumPy *independently* of the
C++ definitions used by the GoogleTest suite, so that the source terms and
boundary data reaching the engine are produced by a second implementation.
A sign or indexing error in either one shows up as a failed study.
"""

from __future__ import annotations

import csv
import math
import time
from dataclasses import asdict, dataclass, field
from pathlib import Path
from typing import Callable

import numpy as np

from .. import _core
from ..analysis.convergence import observed_orders

Array = np.ndarray
ScalarFn = Callable[[Array, Array], Array]

DIRICHLET = _core.BoundaryType.DIRICHLET
NEUMANN = _core.BoundaryType.NEUMANN
SIDES = ("west", "east", "south", "north")


@dataclass(frozen=True)
class ManufacturedCase:
    """Exact solution phi_e of laplacian(phi) = f with derived source and gradient."""

    name: str
    description: str
    phi: ScalarFn
    laplacian: ScalarFn
    dphi_dx: ScalarFn
    dphi_dy: ScalarFn
    domain: tuple[float, float, float, float]  # x_min, x_max, y_min, y_max
    boundary_types: dict[str, _core.BoundaryType]

    @property
    def singular(self) -> bool:
        return all(t == NEUMANN for t in self.boundary_types.values())


_PI = math.pi

CASES: dict[str, ManufacturedCase] = {
    c.name: c
    for c in (
        ManufacturedCase(
            name="sine-dirichlet",
            description="phi = sin(pi x) sin(pi y) on [0,1]^2, homogeneous Dirichlet",
            phi=lambda x, y: np.sin(_PI * x) * np.sin(_PI * y),
            laplacian=lambda x, y: -2.0 * _PI**2 * np.sin(_PI * x) * np.sin(_PI * y),
            dphi_dx=lambda x, y: _PI * np.cos(_PI * x) * np.sin(_PI * y),
            dphi_dy=lambda x, y: _PI * np.sin(_PI * x) * np.cos(_PI * y),
            domain=(0.0, 1.0, 0.0, 1.0),
            boundary_types=dict.fromkeys(SIDES, DIRICHLET),
        ),
        ManufacturedCase(
            name="cosine-neumann",
            description="phi = cos(pi x) cos(pi y) on [0,1]^2, homogeneous Neumann (singular)",
            phi=lambda x, y: np.cos(_PI * x) * np.cos(_PI * y),
            laplacian=lambda x, y: -2.0 * _PI**2 * np.cos(_PI * x) * np.cos(_PI * y),
            dphi_dx=lambda x, y: -_PI * np.sin(_PI * x) * np.cos(_PI * y),
            dphi_dy=lambda x, y: -_PI * np.cos(_PI * x) * np.sin(_PI * y),
            domain=(0.0, 1.0, 0.0, 1.0),
            boundary_types=dict.fromkeys(SIDES, NEUMANN),
        ),
        ManufacturedCase(
            name="exp-mixed",
            description=(
                "phi = exp(x) sin(2y) + x^2 y on [0,2]x[0,1], Dirichlet west/east, "
                "Neumann south/north (non-homogeneous)"
            ),
            phi=lambda x, y: np.exp(x) * np.sin(2.0 * y) + x**2 * y,
            laplacian=lambda x, y: -3.0 * np.exp(x) * np.sin(2.0 * y) + 2.0 * y,
            dphi_dx=lambda x, y: np.exp(x) * np.sin(2.0 * y) + 2.0 * x * y,
            dphi_dy=lambda x, y: 2.0 * np.exp(x) * np.cos(2.0 * y) + x**2,
            domain=(0.0, 2.0, 0.0, 1.0),
            boundary_types={"west": DIRICHLET, "east": DIRICHLET, "south": NEUMANN, "north": NEUMANN},
        ),
    )
}


def make_grid(case: ManufacturedCase, n: int, beta: float = 0.0) -> _core.StructuredGrid2D:
    """Grid with ``n`` cells per unit length (dx == dy when uniform)."""
    x0, x1, y0, y1 = case.domain
    nx = max(1, round(n * (x1 - x0)))
    ny = max(1, round(n * (y1 - y0)))
    return _core.StructuredGrid2D(
        _core.tanh_clustered_faces(nx, x0, x1, beta), _core.tanh_clustered_faces(ny, y0, y1, beta)
    )


def build_problem(
    case: ManufacturedCase, grid: _core.StructuredGrid2D
) -> tuple[Array, _core.BoundaryConditions2D]:
    """Source field (nx, ny) and boundary conditions sampled from the exact solution."""
    xc, yc = grid.cell_centers()
    source = case.laplacian(xc, yc)
    x_c, y_c = grid.x_centers, grid.y_centers
    ones_y, ones_x = np.ones_like(y_c), np.ones_like(x_c)
    samples = {
        # side: (x, y, outward normal derivative)
        "west": (grid.x_min * ones_y, y_c, lambda x, y: -case.dphi_dx(x, y)),
        "east": (grid.x_max * ones_y, y_c, case.dphi_dx),
        "south": (x_c, grid.y_min * ones_x, lambda x, y: -case.dphi_dy(x, y)),
        "north": (x_c, grid.y_max * ones_x, case.dphi_dy),
    }
    bcs = {}
    for side, (x, y, dn) in samples.items():
        if case.boundary_types[side] == DIRICHLET:
            bcs[side] = _core.BoundaryCondition.dirichlet(case.phi(x, y))
        else:
            bcs[side] = _core.BoundaryCondition.neumann(dn(x, y))
    return source, _core.BoundaryConditions2D(**bcs)


@dataclass
class LevelResult:
    """Outcome of one grid level. All numbers are computed, none are estimated."""

    nx: int
    ny: int
    h: float  #: largest cell size
    l2_error: float  #: volume-weighted RMS error at cell centres
    linf_error: float
    iterations: int
    final_residual: float
    conservation_error: float
    converged: bool
    wall_time_s: float


@dataclass
class ConvergenceStudy:
    case: str
    solver: str
    beta: float
    relative_tolerance: float
    levels: list[LevelResult] = field(default_factory=list)

    @property
    def orders_l2(self) -> list[float]:
        return observed_orders([lv.h for lv in self.levels], [lv.l2_error for lv in self.levels])

    @property
    def orders_linf(self) -> list[float]:
        return observed_orders([lv.h for lv in self.levels], [lv.linf_error for lv in self.levels])

    def passed(self, expected_order: float = 2.0, tolerance: float = 0.1) -> bool:
        """True if every solve converged and the finest-pair L2 order is within tolerance."""
        if len(self.levels) < 2 or not all(lv.converged for lv in self.levels):
            return False
        return abs(self.orders_l2[-1] - expected_order) <= tolerance

    def table(self) -> str:
        head = (
            f"{'nx':>6} {'ny':>6} {'h':>10} {'L2 error':>12} {'p(L2)':>7} "
            f"{'Linf error':>12} {'p(Linf)':>7} {'iters':>6} {'conserv.':>9} {'time[s]':>8}"
        )
        rows = [head, "-" * len(head)]
        p2 = [None, *self.orders_l2]
        pi = [None, *self.orders_linf]
        for lv, a, b in zip(self.levels, p2, pi):
            fa = f"{a:7.3f}" if a is not None else f"{'-':>7}"
            fb = f"{b:7.3f}" if b is not None else f"{'-':>7}"
            flag = "" if lv.converged else "  NOT CONVERGED"
            rows.append(
                f"{lv.nx:6d} {lv.ny:6d} {lv.h:10.3e} {lv.l2_error:12.5e} {fa} "
                f"{lv.linf_error:12.5e} {fb} {lv.iterations:6d} {lv.conservation_error:9.2e} "
                f"{lv.wall_time_s:8.3f}{flag}"
            )
        return "\n".join(rows)

    def to_csv(self, path: str | Path) -> None:
        path = Path(path)
        path.parent.mkdir(parents=True, exist_ok=True)
        orders2 = [math.nan, *self.orders_l2]
        ordersi = [math.nan, *self.orders_linf]
        with path.open("w", newline="", encoding="utf-8") as fh:
            writer = csv.writer(fh)
            names = list(asdict(self.levels[0]).keys()) if self.levels else []
            writer.writerow([*names, "order_l2", "order_linf"])
            for lv, a, b in zip(self.levels, orders2, ordersi):
                writer.writerow([*asdict(lv).values(), a, b])

    def to_dict(self) -> dict:
        return {
            "case": self.case,
            "solver": self.solver,
            "beta": self.beta,
            "relative_tolerance": self.relative_tolerance,
            "levels": [asdict(lv) for lv in self.levels],
            "orders_l2": self.orders_l2,
            "orders_linf": self.orders_linf,
        }


def solve_level(
    case: ManufacturedCase,
    n: int,
    solver: str = "cg",
    beta: float = 0.0,
    relative_tolerance: float = 1e-10,
    max_iterations: int = 200_000,
) -> LevelResult:
    grid = make_grid(case, n, beta)
    source, bcs = build_problem(case, grid)
    options = _core.PoissonOptions(
        solver=_core.LinearSolverKind.CG if solver == "cg" else _core.LinearSolverKind.SOR,
        relative_tolerance=relative_tolerance,
        max_iterations=max_iterations,
        record_history=False,
    )
    t0 = time.perf_counter()
    result = _core.solve_poisson(grid, source, bcs, options)
    elapsed = time.perf_counter() - t0
    phi = result.phi
    xc, yc = grid.cell_centers()
    err = phi - case.phi(xc, yc)
    vol = grid.cell_volumes()
    if result.report.singular:
        err = err - np.sum(err * vol) / np.sum(vol)
    l2 = float(np.sqrt(np.sum(err**2 * vol) / np.sum(vol)))
    linf = float(np.max(np.abs(err)))
    h = float(max(np.max(grid.dx), np.max(grid.dy)))
    rep = result.report
    return LevelResult(
        nx=grid.nx,
        ny=grid.ny,
        h=h,
        l2_error=l2,
        linf_error=linf,
        iterations=rep.solver.iterations,
        final_residual=rep.solver.final_residual_norm,
        conservation_error=rep.conservation_error,
        converged=rep.converged,
        wall_time_s=elapsed,
    )


def run_convergence_study(
    case: str | ManufacturedCase,
    levels: tuple[int, ...] | list[int] = (16, 32, 64, 128),
    solver: str = "cg",
    beta: float = 0.0,
    relative_tolerance: float = 1e-10,
) -> ConvergenceStudy:
    """Solve ``case`` on successively refined grids and collect error norms."""
    if isinstance(case, str):
        if case not in CASES:
            raise ValueError(f"unknown case {case!r}; available: {', '.join(CASES)}")
        case = CASES[case]
    if solver not in ("cg", "sor"):
        raise ValueError("solver must be 'cg' or 'sor'")
    if len(levels) < 2 or any(b <= a for a, b in zip(levels, levels[1:])):
        raise ValueError("levels must contain at least two strictly increasing resolutions")
    study = ConvergenceStudy(case.name, solver, beta, relative_tolerance)
    for n in levels:
        study.levels.append(solve_level(case, n, solver, beta, relative_tolerance))
    return study
