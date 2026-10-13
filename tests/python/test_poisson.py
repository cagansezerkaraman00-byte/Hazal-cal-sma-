# SPDX-License-Identifier: Apache-2.0
"""Poisson solver through the Python API, checked against NumPy references."""

import logging

import aerion
import numpy as np
import pytest
from aerion.verification import CASES, build_problem, run_convergence_study
from aerion.verification.poisson import make_grid

BC = aerion.BoundaryCondition


def test_one_dimensional_problem_matches_dense_numpy_solution():
    """phi'' = 1 on [0,1], phi(0)=0, phi(1)=1, solved as a 1-row 2D problem.

    The discrete system is rebuilt independently with NumPy (cell-centred FV,
    half-cell Dirichlet distance) and solved densely; the engine must agree.
    """
    n = 20
    h = 1.0 / n
    g = aerion.StructuredGrid2D.uniform(n, 1, 0.0, 1.0, 0.0, 1.0)
    bcs = aerion.BoundaryConditions2D(
        west=BC.dirichlet(0.0), east=BC.dirichlet(1.0), south=BC.neumann(0.0), north=BC.neumann(0.0)
    )
    f = np.ones((n, 1))
    sol = aerion.solve_poisson(g, f, bcs, aerion.PoissonOptions(relative_tolerance=1e-13))
    assert sol.report.converged

    a = np.zeros((n, n))
    b = -np.ones(n) * h * h
    for i in range(n):
        if i > 0:
            a[i, i - 1] = -1.0
            a[i, i] += 1.0
        if i < n - 1:
            a[i, i + 1] = -1.0
            a[i, i] += 1.0
    a[0, 0] += 2.0
    a[-1, -1] += 2.0
    b[-1] += 2.0 * 1.0
    ref = np.linalg.solve(a, b)
    np.testing.assert_allclose(sol.phi[:, 0], ref, rtol=0, atol=1e-11)
    # And close to the exact solution phi = x(x+1)/2 (second-order error).
    x = g.x_centers
    np.testing.assert_allclose(sol.phi[:, 0], 0.5 * x * (x + 1.0), atol=1e-12 + h * h)


@pytest.mark.parametrize("case", list(CASES))
@pytest.mark.parametrize("beta", [0.0, 2.0])
def test_second_order_convergence(case, beta):
    study = run_convergence_study(case, levels=(16, 32, 64), beta=beta)
    assert all(level.converged for level in study.levels)
    assert all(level.conservation_error < 1e-9 for level in study.levels)
    assert study.orders_l2[-1] == pytest.approx(2.0, abs=0.1)
    assert study.orders_linf[-1] > 1.8
    assert study.passed()


def test_sor_and_cg_agree():
    case = CASES["exp-mixed"]
    g = make_grid(case, 24, beta=1.0)
    f, bcs = build_problem(case, g)
    cg = aerion.solve_poisson(g, f, bcs, aerion.PoissonOptions(relative_tolerance=1e-12))
    sor = aerion.solve_poisson(
        g, f, bcs,
        aerion.PoissonOptions(solver=aerion.LinearSolverKind.SOR, relative_tolerance=1e-12,
                              max_iterations=100000),
    )
    assert cg.report.converged and sor.report.converged
    assert "sor" in sor.report.solver.method
    np.testing.assert_allclose(sor.phi, cg.phi, atol=1e-9)


def test_solver_object_reuse_and_warm_start():
    case = CASES["sine-dirichlet"]
    g = make_grid(case, 32)
    f, bcs = build_problem(case, g)
    solver = aerion.PoissonSolver2D(g, bcs, aerion.PoissonOptions(relative_tolerance=1e-12))
    props = solver.matrix_properties()
    assert props["symmetric"] and props["diagonally_dominant"] and props["rows"] == 32 * 32
    first = solver.solve(f)
    assert first.report.solver.iterations > 0
    second = solver.solve(f, initial_guess=first.phi)
    assert second.report.converged
    assert second.report.solver.iterations == 0


def test_residual_history_is_monotone_enough_and_matches_iterations():
    case = CASES["sine-dirichlet"]
    g = make_grid(case, 32)
    f, bcs = build_problem(case, g)
    sol = aerion.solve_poisson(g, f, bcs)
    hist = sol.report.solver.residual_history
    assert len(hist) == sol.report.solver.iterations + 1
    assert hist[-1] <= sol.report.solver.tolerance
    assert hist[0] > hist[-1]


def test_boundary_fluxes_balance_source():
    case = CASES["exp-mixed"]
    g = make_grid(case, 32, beta=1.5)
    f, bcs = build_problem(case, g)
    solver = aerion.PoissonSolver2D(g, bcs, aerion.PoissonOptions(relative_tolerance=1e-12))
    sol = solver.solve(f)
    fluxes = solver.boundary_fluxes(sol.phi)
    assert set(fluxes) == {"west", "east", "south", "north"}
    total_source = float(np.sum(f * g.cell_volumes()))
    assert sum(fluxes.values()) == pytest.approx(total_source, rel=1e-9)


def test_incompatible_neumann_problem_is_reported(caplog):
    g = aerion.StructuredGrid2D.uniform(8, 8, 0.0, 1.0, 0.0, 1.0)
    bcs = aerion.BoundaryConditions2D.all(BC.neumann(0.0))
    with caplog.at_level(logging.WARNING, logger="aerion.engine"):
        sol = aerion.solve_poisson(g, np.ones((8, 8)), bcs)
    assert sol.report.singular
    assert sol.report.compatibility_defect == pytest.approx(1.0)
    assert any("solvability" in r.getMessage() for r in caplog.records)


def test_non_convergence_is_visible(caplog):
    case = CASES["sine-dirichlet"]
    g = make_grid(case, 64)
    f, bcs = build_problem(case, g)
    with caplog.at_level(logging.WARNING, logger="aerion.engine"):
        sol = aerion.solve_poisson(g, f, bcs, aerion.PoissonOptions(max_iterations=3))
    assert not sol.report.converged
    assert sol.report.solver.status == aerion.SolverStatus.MAX_ITERATIONS_REACHED
    assert any("did not converge" in r.getMessage() for r in caplog.records)


def test_input_validation():
    g = aerion.StructuredGrid2D.uniform(4, 3, 0.0, 1.0, 0.0, 1.0)
    bcs = aerion.BoundaryConditions2D.all(BC.dirichlet(0.0))
    with pytest.raises(aerion.InvalidArgumentError, match=r"shape \(nx, ny\) = \(4, 3\)"):
        aerion.solve_poisson(g, np.zeros((3, 4)), bcs)
    with pytest.raises(aerion.InvalidArgumentError, match="NaN"):
        aerion.solve_poisson(g, np.full((4, 3), np.nan), bcs)
    bad = aerion.BoundaryConditions2D.all(BC.dirichlet(0.0))
    bad.west = BC.dirichlet([1.0, 2.0])  # west needs 1 or ny = 3 values
    with pytest.raises(aerion.InvalidArgumentError, match="west boundary"):
        aerion.PoissonSolver2D(g, bad)


def test_c_ordered_and_integer_input_is_accepted():
    g = aerion.StructuredGrid2D.uniform(5, 4, 0.0, 1.0, 0.0, 1.0)
    bcs = aerion.BoundaryConditions2D.all(BC.dirichlet(0.0))
    f_int = np.ones((5, 4), dtype=np.int64)
    f_f = np.asfortranarray(np.ones((5, 4)))
    a = aerion.solve_poisson(g, f_int, bcs).phi
    b = aerion.solve_poisson(g, f_f, bcs).phi
    np.testing.assert_array_equal(a, b)
    assert a.shape == (5, 4)
