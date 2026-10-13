# SPDX-License-Identifier: Apache-2.0
"""The convergence tools must recover known answers from synthetic data."""

import math

import pytest
from aerion.analysis import (
    grid_convergence_index,
    observed_order,
    observed_orders,
    richardson_extrapolation,
)


def test_observed_order_of_exact_power_law():
    assert observed_order(0.2, 0.1, 4.0 * 0.04, 4.0 * 0.01) == pytest.approx(2.0)
    hs = [0.4, 0.2, 0.1, 0.05]
    es = [3.0 * h**1.5 for h in hs]
    assert observed_orders(hs, es) == pytest.approx([1.5, 1.5, 1.5])


def test_observed_order_rejects_bad_input():
    with pytest.raises(ValueError):
        observed_order(0.1, 0.2, 1.0, 0.5)
    with pytest.raises(ValueError):
        observed_order(0.2, 0.1, 0.0, 0.5)
    with pytest.raises(ValueError):
        observed_orders([0.2, 0.1], [1.0])


def test_richardson_extrapolation_is_exact_for_power_law():
    exact, c, p = 1.0, 0.5, 2.0
    fine, coarse = exact + c * 0.1**p, exact + c * 0.2**p
    assert richardson_extrapolation(fine, coarse, 2.0, p) == pytest.approx(exact)


@pytest.mark.parametrize(
    ("p", "h1", "r21", "r32"),
    [(2.0, 0.25, 2.0, 2.0), (1.5, 0.1, 1.7, 2.3), (2.0, 0.05, 1.3, 1.5), (1.0, 0.1, 2.0, 1.5)],
)
def test_gci_recovers_order_and_extrapolated_value(p, h1, r21, r32):
    exact, c = 1.0, 0.8
    h2, h3 = h1 * r21, h1 * r21 * r32
    phi = [exact + c * h**p for h in (h1, h2, h3)]
    res = grid_convergence_index(*phi, r21=r21, r32=r32)
    assert res.order == pytest.approx(p, rel=1e-9)
    assert res.extrapolated == pytest.approx(exact, rel=1e-9)
    assert not res.oscillatory
    # For a pure power law GCI32 / (r21^p GCI21) reduces to phi1/phi2 exactly
    # (the relative errors are normalised by phi1 and phi2 respectively).
    assert res.asymptotic_ratio == pytest.approx(phi[0] / phi[1], rel=1e-9)
    # GCI_fine is 1.25 x the relative discretisation error estimate.
    assert res.gci_fine == pytest.approx(1.25 * abs((phi[0] - phi[1]) / phi[0]) / (r21**p - 1))
    assert res.extrapolated_relative_error_21 == pytest.approx(abs(c * h1**p) / exact, rel=1e-6)


def test_gci_worked_example_from_celik_2008():
    # Worked three-grid example published in Celik et al. (2008), Table 1
    # (first column): N1=18000, N2=8000, N3=4500 cells -> r21=1.5, r32=1.333;
    # phi1=6.063, phi2=5.972, phi3=5.863. Reported: p=1.53, phi_ext=6.1685,
    # e_a21=1.5%, e_ext21=1.7%, GCI_fine21=2.2%.
    res = grid_convergence_index(6.063, 5.972, 5.863, r21=1.5, r32=1.333)
    assert res.order == pytest.approx(1.53, abs=0.01)
    assert res.extrapolated == pytest.approx(6.1685, abs=1e-3)
    assert 100 * res.relative_error_21 == pytest.approx(1.5, abs=0.05)
    assert 100 * res.extrapolated_relative_error_21 == pytest.approx(1.7, abs=0.05)
    assert 100 * res.gci_fine == pytest.approx(2.2, abs=0.05)


def test_gci_flags_oscillatory_convergence_and_degenerate_data():
    res = grid_convergence_index(1.00, 1.02, 0.95, r21=2.0, r32=2.0)
    assert res.oscillatory
    assert math.isfinite(res.order)
    with pytest.raises(ValueError):
        grid_convergence_index(1.0, 1.0, 1.1, r21=2.0, r32=2.0)
    with pytest.raises(ValueError):
        grid_convergence_index(1.0, 1.1, 1.2, r21=1.0, r32=2.0)
