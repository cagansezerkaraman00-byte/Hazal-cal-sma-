# Verification and validation policy

AERION follows the established V&V terminology (Roache 1998; AIAA G-077-1998;
ASME V&V 20-2009):

* **Code verification**: *are the equations solved correctly?* Compare with
  exact solutions (analytic or manufactured) and demonstrate the design order
  of accuracy.
* **Solution verification**: *how large is the numerical error of this
  particular result?* Mesh refinement, Richardson extrapolation, Grid
  Convergence Index (GCI), time-step studies, iterative convergence.
* **Validation**: *are these the right equations for the physical problem?*
  Compare with experiments or trusted reference data, within the model's
  range of validity.

## Rules

1. No feature is presented as working until it has passed code verification.
   Unverified features are labelled **EXPERIMENTAL** in the API docs, the CLI
   output and the GUI.
2. No number is shown as a simulation result unless it came out of the solver.
   Placeholder, interpolated or hand-edited data must never reach plots,
   reports or the README.
3. Every recorded result states the revision, build, machine, command line,
   assumptions and boundary conditions (see `benchmarks/results/*/README.md`).
4. Solver diagnostics (non-convergence, stagnation, solvability defects,
   divergence) are surfaced, never swallowed.
5. Every bug found by verification gets a regression test.
   Example: the round-off stagnation fix in Stage 1.

## Current status

| capability | status | evidence |
|---|---|---|
| Rectilinear grids, wall clustering | ✅ verified | `test_mesh.cpp`, `test_grid.py` |
| Poisson ∇²φ = f, Dirichlet/Neumann/mixed, uniform and stretched grids | ✅ verified (order 2.00) | MMS studies in `benchmarks/results/stage1`, `test_poisson.*` |
| Pure-Neumann solvability handling | ✅ verified | `IncompatibleNeumann...` tests |
| PCG and red-black SOR | ✅ verified | known-solution tests, CG finite-termination test |
| Stagnation/non-convergence reporting | ✅ verified | `UnreachableTolerance...` tests |
| VTK/CSV output | ✅ verified | round-trip tests, read back with VTK 9.7 |
| GCI / Richardson tools | ✅ verified | exact power laws + Celik et al. (2008) worked example |
| Incompressible Navier–Stokes | ⏳ not implemented (Stage 2) | — |
| Aerodynamic forces/coefficients | ⏳ not implemented (Stage 4) | — |
| Turbulence models, 3D, CUDA | ⏳ not implemented (Stage 6) | — |

## Planned verification and validation cases

| case | type | reference | stage |
|---|---|---|---|
| Taylor–Green vortex | code verification (space + time order) | analytic | 2 |
| Kovasznay flow | code verification (steady NS) | analytic (Kovasznay 1948) | 2 |
| Plane Poiseuille flow | code verification | analytic u(y) = (G/2μ) y (H − y) | 2 |
| Lid-driven cavity, Re 100/400/1000 | benchmark comparison | Ghia, Ghia & Shin (1982) | 2 |
| Mesh independence (GCI) of cavity vortex centre and centre-line velocities | solution verification | Celik et al. (2008) procedure | 2 |
| Time-step sensitivity (Taylor–Green, cylinder) | solution verification | — | 2–4 |
| Circular cylinder Re = 20, 40 (steady), 100 (Strouhal) | validation | published experiments/simulations | 4 |
| Laminar airfoil polars (low Re) | validation | published low-Re data | 4 |
| Flat plate, NACA 0012 (turbulent) | validation | NASA Turbulence Modeling Resource | 6 |

## How to run the verification suite

```bash
ctest --preset dev                               # everything (C++, Python, CLI, examples)
ctest --preset dev -L python                     # Python suite only
python3 -m aerion verify poisson --levels 16 32 64 128 256
./build/dev/src/aerion-engine poisson-mms --case exp-mixed --levels 16,32,64,128 --beta 2
```

`aerion verify` exits with a non-zero status if any linear solve fails to
converge or if the asymptotic order leaves `expected ± tolerance`. It can
therefore gate CI.

## References

* P. J. Roache, *Verification and Validation in Computational Science and Engineering*, Hermosa (1998).
* P. J. Roache, "Code verification by the method of manufactured solutions", *J. Fluids Eng.* 124 (2002) 4–10.
* I. B. Celik et al., "Procedure for estimation and reporting of uncertainty due to discretization in CFD applications", *J. Fluids Eng.* 130 (2008) 078001.
* W. L. Oberkampf, C. J. Roy, *Verification and Validation in Scientific Computing*, Cambridge (2010).
