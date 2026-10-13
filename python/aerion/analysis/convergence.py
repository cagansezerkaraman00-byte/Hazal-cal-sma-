# SPDX-License-Identifier: Apache-2.0
# Copyright (c) 2026 The AERION Authors
"""Grid-convergence analysis: observed order, Richardson extrapolation, GCI.

These are the standard tools for *solution verification* (estimating the
discretisation error of a computed quantity) and are used for every mesh
independence study in AERION.

References
----------
* P. J. Roache, "Quantification of uncertainty in computational fluid
  dynamics", Annu. Rev. Fluid Mech. 29 (1997) 123-160.
* I. B. Celik, U. Ghia, P. J. Roache, C. J. Freitas, H. Coleman, P. E. Raad,
  "Procedure for estimation and reporting of uncertainty due to
  discretization in CFD applications", J. Fluids Eng. 130 (2008) 078001.
"""

from __future__ import annotations

import math
from dataclasses import dataclass
from typing import Sequence


def observed_order(h_coarse: float, h_fine: float, e_coarse: float, e_fine: float) -> float:
    """Observed order of accuracy from two (spacing, error) pairs.

    ``p = ln(e_coarse / e_fine) / ln(h_coarse / h_fine)``; errors must be
    positive (use norms of the error against an exact solution).
    """
    if not (h_coarse > h_fine > 0.0):
        raise ValueError("require h_coarse > h_fine > 0")
    if not (e_coarse > 0.0 and e_fine > 0.0):
        raise ValueError("errors must be positive")
    return math.log(e_coarse / e_fine) / math.log(h_coarse / h_fine)


def observed_orders(spacings: Sequence[float], errors: Sequence[float]) -> list[float]:
    """Observed orders between consecutive levels (ordered coarse to fine)."""
    if len(spacings) != len(errors):
        raise ValueError("spacings and errors must have the same length")
    return [
        observed_order(spacings[k - 1], spacings[k], errors[k - 1], errors[k])
        for k in range(1, len(spacings))
    ]


def richardson_extrapolation(phi_fine: float, phi_coarse: float, ratio: float, order: float) -> float:
    """Richardson-extrapolated value ``(r^p phi_fine - phi_coarse) / (r^p - 1)``."""
    if ratio <= 1.0:
        raise ValueError("refinement ratio must be > 1")
    rp = ratio**order
    return (rp * phi_fine - phi_coarse) / (rp - 1.0)


@dataclass(frozen=True)
class GCIResult:
    """Result of the three-grid GCI procedure of Celik et al. (2008).

    Index 1 denotes the finest grid, 3 the coarsest.
    """

    order: float  #: apparent order p
    extrapolated: float  #: Richardson-extrapolated value phi_ext^21
    relative_error_21: float  #: approximate relative error e_a^21 = |(phi1 - phi2)/phi1|
    extrapolated_relative_error_21: float  #: e_ext^21 = |(phi_ext - phi1)/phi_ext|
    gci_fine: float  #: GCI_fine^21 (fraction; multiply by 100 for percent)
    gci_coarse: float  #: GCI^32 of the medium grid
    asymptotic_ratio: float  #: GCI^32 / (r21^p GCI^21); ~1 in the asymptotic range
    oscillatory: bool  #: True when the solution oscillates between grids (s = -1)
    iterations: int  #: fixed-point iterations used to solve for p


def grid_convergence_index(
    phi1: float,
    phi2: float,
    phi3: float,
    r21: float,
    r32: float,
    safety_factor: float = 1.25,
    max_iterations: int = 200,
    tolerance: float = 1e-12,
) -> GCIResult:
    """Grid Convergence Index from solutions on three systematically refined grids.

    Parameters
    ----------
    phi1, phi2, phi3:
        The quantity of interest on the fine, medium and coarse grid.
    r21, r32:
        Refinement ratios h2/h1 and h3/h2 (> 1). With N cells in 2D,
        h = (total area / N)^(1/2).
    safety_factor:
        1.25 for three-grid studies, as recommended by Celik et al. (2008).
    """
    if r21 <= 1.0 or r32 <= 1.0:
        raise ValueError("refinement ratios must be > 1")
    eps21 = phi2 - phi1
    eps32 = phi3 - phi2
    if eps21 == 0.0 or eps32 == 0.0:
        raise ValueError(
            "identical solutions on two grids: the apparent order is undefined "
            "(converged to round-off, or the grids are not in the asymptotic range)"
        )
    ratio = eps32 / eps21
    s = 1.0 if ratio > 0.0 else -1.0
    log_ratio = math.log(abs(ratio))
    ln_r21 = math.log(r21)

    p = abs(log_ratio) / ln_r21  # initial guess: q = 0
    iterations = 0
    for iterations in range(1, max_iterations + 1):
        q = math.log((r21**p - s) / (r32**p - s))
        p_new = abs(log_ratio + q) / ln_r21
        if abs(p_new - p) <= tolerance * max(1.0, abs(p)):
            p = p_new
            break
        p = p_new
    else:  # pragma: no cover - pathological input
        raise ArithmeticError("GCI: fixed-point iteration for the apparent order did not converge")

    r21p = r21**p
    r32p = r32**p
    phi_ext = (r21p * phi1 - phi2) / (r21p - 1.0)
    e_a21 = abs((phi1 - phi2) / phi1) if phi1 != 0.0 else math.nan
    e_a32 = abs((phi2 - phi3) / phi2) if phi2 != 0.0 else math.nan
    e_ext21 = abs((phi_ext - phi1) / phi_ext) if phi_ext != 0.0 else math.nan
    gci21 = safety_factor * e_a21 / (r21p - 1.0)
    gci32 = safety_factor * e_a32 / (r32p - 1.0)
    asymptotic = gci32 / (r21p * gci21) if gci21 > 0.0 else math.nan
    return GCIResult(
        order=p,
        extrapolated=phi_ext,
        relative_error_21=e_a21,
        extrapolated_relative_error_21=e_ext21,
        gci_fine=gci21,
        gci_coarse=gci32,
        asymptotic_ratio=asymptotic,
        oscillatory=s < 0.0,
        iterations=iterations,
    )
