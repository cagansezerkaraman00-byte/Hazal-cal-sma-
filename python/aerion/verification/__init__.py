# SPDX-License-Identifier: Apache-2.0
# Copyright (c) 2026 The AERION Authors
"""Code-verification studies (method of manufactured solutions)."""

from .poisson import (
    CASES,
    ConvergenceStudy,
    LevelResult,
    ManufacturedCase,
    build_problem,
    run_convergence_study,
    solve_level,
)

__all__ = [
    "CASES",
    "ConvergenceStudy",
    "LevelResult",
    "ManufacturedCase",
    "build_problem",
    "run_convergence_study",
    "solve_level",
]
