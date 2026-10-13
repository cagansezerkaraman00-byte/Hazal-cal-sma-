# AERION

**Advanced Computational Aerodynamics Platform — _Engineering the Invisible._**

AERION is an open-source virtual wind tunnel under development. It has its
own C++20 computational fluid dynamics engine, a Python automation and
analysis layer and, later, a professional desktop interface. It takes
inspiration from ANSYS Fluent, OpenFOAM and SU2. Its rule is that a
capability counts as available only once it is **verified**.

> **Current status: Stage 1 (v0.1.0), foundation.** Implemented: the build
> and test infrastructure, structured 2D grids, a verified second-order
> finite-volume Poisson solver (the pressure-equation kernel of the coming
> Navier–Stokes solver), linear solvers, VTK/CSV output and the Python API.
> **There is no flow solver yet.** Incompressible Navier–Stokes arrives in
> Stage 2. See the [roadmap](docs/ROADMAP.md).

## What works today

| | |
|---|---|
| Grids | rectilinear 2D, uniform or wall-clustered (tanh) |
| Physics kernel | ∇²φ = f, cell-centred finite volumes, Dirichlet/Neumann/mixed BCs, singular (pure-Neumann) problems |
| Linear solvers | Jacobi-preconditioned CG, red-black SOR, with OpenMP; honest status reporting (converged / max-iterations / breakdown / diverged / stagnated) |
| Verification | manufactured-solution studies give an observed order of **2.00** on uniform and stretched grids ([results](benchmarks/results/stage1/README.md)) |
| Output | legacy VTK (ParaView/VisIt) and CSV, locale-independent |
| Interfaces | `aerion-engine` CLI (C++), `aerion` Python package + CLI |
| Quality | GoogleTest + pytest under CTest, GCC/Clang/MSVC CI, ASan/UBSan |

## Quick start (Ubuntu / WSL2)

```bash
sudo apt install -y build-essential cmake ninja-build git python3-dev python3-venv
python3 -m venv .venv && source .venv/bin/activate
python -m pip install -r requirements-dev.txt

cmake --preset dev
cmake --build --preset dev
ctest --preset dev

./build/dev/src/aerion-engine info
PYTHONPATH=python python3 -m aerion verify poisson
PYTHONPATH=python python3 examples/python/poisson_quickstart.py --out results/plate
```

Or install the Python package (this builds the C++ engine):

```bash
python -m pip install .
aerion verify poisson --levels 16 32 64 128
```

Python API in a nutshell:

```python
import numpy as np
import aerion

grid = aerion.StructuredGrid2D.uniform(128, 128, 0.0, 1.0, 0.0, 1.0)
bc = aerion.BoundaryCondition
bcs = aerion.BoundaryConditions2D(west=bc.dirichlet(0.0), east=bc.dirichlet(0.0),
                                  south=bc.dirichlet(0.0), north=bc.dirichlet(1.0))
result = aerion.solve_poisson(grid, np.zeros(grid.shape), bcs)   # Laplace: heated plate
print(result.report)            # converged?, iterations, conservation error
aerion.write_vtk("plate.vtk", grid, {"temperature": result.phi})
```

The full setup for Windows 11 + WSL2 + VS Code is in
[docs/DEVELOPMENT.md](docs/DEVELOPMENT.md).

## Repository layout

```
include/aerion/   C++ public headers (core, mesh, field, linalg, solvers, io, verification)
src/              C++ engine (aerion_core) and aerion-engine CLI
python/           pybind11 bindings + the aerion Python package
tests/            GoogleTest (cpp/) and pytest (python/) suites
examples/         runnable examples with reference solutions
benchmarks/       performance programs and recorded per-stage results
docs/             architecture, roadmap, theory, verification policy, dev guide
gui/              desktop application (Stage 5 — not started)
cuda/             GPU backend (Stage 6 — not started)
```

## Documentation

* [Architecture](docs/ARCHITECTURE.md): modules, layering, design decisions
* [Roadmap](docs/ROADMAP.md): stages, deliverables, exit criteria
* [Governing equations & numerical method](docs/theory/governing_equations.md)
* [Stage 1 Poisson kernel](docs/theory/poisson_fvm.md)
* [Verification & validation policy](docs/VERIFICATION.md)
* [Development guide](docs/DEVELOPMENT.md)

## Technology

C++20 · CMake + Ninja · OpenMP · Python 3 · pybind11 · NumPy · GoogleTest ·
pytest · VTK/ParaView. Planned: PySide6 (Qt 6), Gmsh, CUDA.

## License

[Apache License 2.0](LICENSE).
