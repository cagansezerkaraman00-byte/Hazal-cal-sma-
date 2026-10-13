# Development guide

Target environment: **Windows 11 + WSL2 (Ubuntu 24.04) + VS Code**. Native
Linux works the same way. Native Windows (MSVC) is built in CI. A GPU is
not required.

## 1. One-time setup

### 1.1 WSL2 and Ubuntu (Windows PowerShell, as administrator)

```powershell
wsl --install -d Ubuntu-24.04
```

Keep the repository **inside the Linux file system** (e.g. `~/src/aerion`),
not under `/mnt/c/...`. Builds on the Windows file system are many times slower.

### 1.2 Toolchain (Ubuntu shell)

```bash
sudo apt update
sudo apt install -y build-essential cmake ninja-build git python3-dev python3-venv \
                    clang clang-format libomp-dev libgtest-dev
```

`libgtest-dev` is optional. Without it, CMake fetches GoogleTest v1.15.2.
`libomp-dev` enables OpenMP with Clang (GCC has it built in).

### 1.3 Python environment

```bash
cd ~/src/aerion
python3 -m venv .venv
source .venv/bin/activate
python -m pip install -r requirements-dev.txt
```

CMake picks up the active venv's interpreter. Configure again (fresh build
directory) if you switch environments.

### 1.4 VS Code

Install VS Code on Windows, then the **WSL** extension, and open the folder
from the Ubuntu shell with `code .`. The repository recommends extensions in
`.vscode/extensions.json` (CMake Tools, C/C++, Python). CMake Tools reads
`CMakePresets.json` directly: pick the `dev` preset in the status bar.

## 2. Build, test, run

```bash
cmake --preset dev                 # configure (RelWithDebInfo, in-place Python module)
cmake --build --preset dev         # build engine, CLI, tests, benchmarks, Python module
ctest --preset dev                 # C++ + Python + CLI + example tests

./build/dev/src/aerion-engine info
PYTHONPATH=python python3 -m aerion verify poisson
```

| preset | purpose |
|---|---|
| `dev` | daily work. The Python module is written into `python/aerion/`, so `PYTHONPATH=python` sees your `.py` edits immediately |
| `release` | optimised build, self-contained Python package in `build/release/python` |
| `debug` | `-O0 -g`, bounds-checked `Array2D` |
| `asan` | Address + UndefinedBehavior sanitizers (C++ only) |
| `ci` | Release + warnings as errors (what CI runs) |

Useful CTest selections: `ctest --preset dev -L cpp`, `-L python`, `-L cli`,
`-R Poisson`.

Install the Python package into the active environment (builds the engine
with scikit-build-core):

```bash
python -m pip install .
aerion info
```

## 3. Code conventions

* C++20, `clang-format` (config in repo root). Run
  `clang-format -i $(git ls-files '*.cpp' '*.hpp')` before committing.
* Namespaces mirror directories: `aerion::mesh`, `aerion::linalg`, …
* Public headers in `include/aerion/<module>/`, sources in `src/<module>/`.
  Lower layers never include higher ones (see ARCHITECTURE.md §4).
* Validate arguments at API boundaries with `aerion::require`. No silent
  clamping or "fixing" of user input.
* Every numerical routine gets a test against a known answer (analytic,
  manufactured, or a hand-derived small case). Code verification first.
* Python: type hints, `from __future__ import annotations`, line length 100.
* Never commit generated results outside `benchmarks/results/`. Never edit
  recorded results by hand.

## 4. Git workflow

* `main` is always green. Each stage/feature is developed on a branch
  (`feature/stage2-mac-grid`, `fix/...`) and merged through a pull request
  after CI passes.
* Commit messages follow [Conventional Commits](https://www.conventionalcommits.org/):
  `feat(solvers): ...`, `fix(linalg): ...`, `test: ...`, `docs: ...`,
  `build: ...`, `ci: ...`, `bench: ...`, `perf: ...`, `refactor: ...`.
  The body explains *why*.
* Suggested branch plan for Stage 2:
  1. `feature/stage2-mac-fields`: staggered field layout, divergence and
     gradient operators with adjointness tests.
  2. `feature/stage2-projection`: fractional-step solver, Taylor–Green verification.
  3. `feature/stage2-boundaries`: walls, moving lid, inlet/outlet, Poiseuille.
  4. `feature/stage2-cavity`: lid-driven cavity vs Ghia et al., GCI study.
  5. `feature/stage2-case-files`: TOML case files + Python run manager.

## 5. Troubleshooting

| symptom | fix |
|---|---|
| `pybind11 not found` | `python -m pip install pybind11` in the interpreter CMake uses, or `-DAERION_BUILD_PYTHON=OFF` |
| `Python development headers not found` | `sudo apt install python3-dev` |
| `ImportError: aerion._core` | build first. With `release`/`debug` presets set `PYTHONPATH=build/<preset>/python` |
| Python tests missing from `ctest` | `pytest`/`numpy` are not importable by the configured interpreter: install them, re-run `cmake --preset ...` |
| OpenMP: OFF with Clang | `sudo apt install libomp-dev` |
| Slow builds under WSL | move the repo from `/mnt/c` into `~/` |
| Version/revision looks stale | the git revision is captured at configure time: re-run `cmake --preset ...` |
