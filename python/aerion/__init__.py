# SPDX-License-Identifier: Apache-2.0
# Copyright (c) 2026 The AERION Authors
"""AERION — Advanced Computational Aerodynamics Platform.

*Engineering the Invisible.*

The numerical engine is written in C++20 and exposed as the extension module
:mod:`aerion._core`; this package adds automation, verification and analysis
tools on top of it.

Array convention
----------------
Cell fields are NumPy arrays of shape ``(nx, ny)`` indexed ``[i, j]`` with
``i`` along x ("ij" indexing, as ``numpy.meshgrid(..., indexing="ij")``).

Status
------
Stage 1 (foundation): structured 2D grids, a verified finite-volume Poisson
solver (the pressure-equation kernel of the future Navier–Stokes solver) and
VTK/CSV output. No flow solver is included yet.
"""

from __future__ import annotations

import logging as _logging

try:
    from . import _core
except ImportError as exc:  # pragma: no cover - depends on the build state
    raise ImportError(
        "AERION's compiled engine (aerion._core) could not be imported. Build it with\n"
        "    cmake --preset dev && cmake --build --preset dev\n"
        "and add the 'python' directory to PYTHONPATH, or install the package with\n"
        "    python -m pip install .\n"
        f"Original error: {exc}"
    ) from exc

from ._core import (  # noqa: F401  (re-exported public API)
    AerionError,
    AerionIOError,
    BoundaryCondition,
    BoundaryConditions2D,
    BoundarySide,
    BoundaryType,
    InvalidArgumentError,
    LinearSolverKind,
    LogLevel,
    NumericalError,
    PoissonOptions,
    PoissonReport,
    PoissonSolution,
    PoissonSolver2D,
    Preconditioner,
    SolverStats,
    SolverStatus,
    StructuredGrid2D,
    build_info,
    build_summary,
    max_threads,
    openmp_enabled,
    set_log_level,
    set_num_threads,
    solve_poisson,
    tanh_clustered_faces,
    uniform_faces,
    write_csv,
    write_vtk,
)

__version__: str = _core.__version__

__all__ = [
    "AerionError",
    "AerionIOError",
    "BoundaryCondition",
    "BoundaryConditions2D",
    "BoundarySide",
    "BoundaryType",
    "InvalidArgumentError",
    "LinearSolverKind",
    "LogLevel",
    "NumericalError",
    "PoissonOptions",
    "PoissonReport",
    "PoissonSolution",
    "PoissonSolver2D",
    "Preconditioner",
    "SolverStats",
    "SolverStatus",
    "StructuredGrid2D",
    "__version__",
    "build_info",
    "build_summary",
    "max_threads",
    "openmp_enabled",
    "set_log_level",
    "set_num_threads",
    "solve_poisson",
    "tanh_clustered_faces",
    "uniform_faces",
    "write_csv",
    "write_vtk",
]

# Engine messages (e.g. non-converged solves) go to the "aerion.engine" logger.
_logging.getLogger("aerion").addHandler(_logging.NullHandler())
_core._install_python_log_sink()
