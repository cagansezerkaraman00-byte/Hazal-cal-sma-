# AERION roadmap

Each stage ends with a **working, tested, documented release**. A stage is
complete only when its *exit criteria* pass in CI. Stages are developed on
feature branches and merged through pull requests.

Legend: ✅ done · 🔄 in progress · ⏳ planned

## Stage 1 — Foundation ✅ (v0.1.0)

Deliverables
- ✅ Repository structure, Apache-2.0 license, coding style, EditorConfig.
- ✅ CMake + Ninja build with presets; strict warnings; sanitizers; OpenMP optional.
- ✅ Core library: errors, logging, timing, build info.
- ✅ Rectilinear 2D grid (uniform and wall-clustered), `Array2D` fields.
- ✅ Five-point sparse matrix, Jacobi-PCG, red-black SOR with honest status reporting.
- ✅ Finite-volume Poisson solver (Dirichlet/Neumann, singular case, conservation check).
- ✅ VTK and CSV output.
- ✅ pybind11 module + Python package, `pip install .`.
- ✅ GoogleTest + pytest under CTest; CI workflow.

Exit criteria (met — see [benchmarks/results/stage1](../benchmarks/results/stage1/README.md))
- Observed order 2.00 ± 0.1 (L2) for Dirichlet, Neumann and mixed manufactured
  solutions on uniform and stretched grids, with both linear solvers.
- Exact reproduction of linear fields on stretched grids.
- Global conservation error bounded by the linear-solver tolerance.
- Clean under GCC, Clang (warnings as errors) and ASan/UBSan.

## Stage 2 — First incompressible flow solver ⏳

Physics: 2D incompressible, laminar, constant-property Navier–Stokes
([theory](theory/governing_equations.md)).

Deliverables
- Staggered MAC grid fields (u on x-faces, v on y-faces, p at centres).
- Fractional-step projection method. Pressure Poisson via `PoissonSolver2D`.
- Convection: second-order central / upwind-biased options. Diffusion: central.
- Time integration: explicit (Adams–Bashforth 2 / RK) with CFL and viscous
  limits. Semi-implicit diffusion later.
- Boundary conditions: no-slip walls, moving wall, velocity inlet,
  pressure/convective outlet, periodic.
- Residual and divergence monitoring, steady-state detection, run control
  (start/stop), restart files.
- Case description files (TOML) and Python run manager.

Exit criteria (verification gates)
- **Taylor–Green vortex** (analytic decay): 2nd order in space, design order in time.
- **Kovasznay flow** (analytic steady NS solution): 2nd order in space.
- **Plane Poiseuille flow** (analytic parabola): error ≤ solver tolerance on a
  uniform grid; correct pressure gradient.
- **Lid-driven cavity** Re = 100, 400, 1000. Centre-line velocity profiles agree
  with Ghia, Ghia & Shin (1982), *J. Comput. Phys.* 48:387–411, within a tolerance
  justified by a GCI mesh study.
- Divergence of the projected velocity at round-off/solver tolerance.
- Mesh-independence (GCI) and time-step sensitivity studies recorded in `benchmarks/`.

## Stage 3 — Scientific visualisation ⏳

- Pressure and vorticity contour maps, velocity vectors, streamlines
  (stream-function via Poisson solve) in Python (Matplotlib) and VTK/ParaView.
- XML VTK (`.vtr`) with binary data, `.pvd` time series.
- Residual/convergence plots, report generation.

## Stage 4 — Aerodynamic analysis ⏳

- Airfoil geometry: NACA 4/5-digit generator, coordinate-file import (Selig format).
- Gmsh-based body-fitted meshes (C/O-grids) → unstructured FV mesh module.
- Collocated FV with Rhie–Chow interpolation, SIMPLE/PISO or projection.
- Force integration (pressure + viscous wall shear) → lift, drag, moment;
  coefficients C_L, C_D, C_M; angle-of-attack sweeps.
- Validation: laminar low-Reynolds airfoil cases against published data;
  cylinder flow (Re = 20, 40 steady; Re = 100 Strouhal number).
- Clearly marked limits: laminar only until Stage 6 turbulence models.

## Stage 5 — AERION Desktop ⏳

- PySide6 (Qt 6), dark professional theme, project tree, parameter panels
  (velocity, density, viscosity, angle of attack, mesh controls).
- Embedded VTK 2D/3D views, live residual plots, start/stop/pause.
- Project save/load, result comparison between designs, CSV/VTK export.

## Stage 6 — Advanced engineering ⏳

- Turbulence modelling: RANS Spalart–Allmaras, k-ω SST (with wall treatment)
  — each verified (MMS) and validated (flat plate, NACA 0012 at high Re).
- 3D solver (structured, then unstructured).
- Geometric multigrid for the pressure equation; OpenMP tuning; MPI later.
- CUDA backend with CPU-reference regression tests.
- Performance optimisation guided by `benchmarks/`.

## Version policy

Semantic versioning: `0.<stage>.<patch>` until the first production release.
The version comes from `project(AERION VERSION ...)` in `CMakeLists.txt` only.
Python takes it via scikit-build-core.
