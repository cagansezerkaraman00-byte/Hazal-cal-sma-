# SPDX-License-Identifier: Apache-2.0
# Copyright (c) 2026 The AERION Authors
"""Post-processing and numerical-analysis utilities (pure Python/NumPy)."""

from .convergence import (
    GCIResult,
    grid_convergence_index,
    observed_order,
    observed_orders,
    richardson_extrapolation,
)

__all__ = [
    "GCIResult",
    "grid_convergence_index",
    "observed_order",
    "observed_orders",
    "richardson_extrapolation",
]
