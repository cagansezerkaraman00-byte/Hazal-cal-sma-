# cuda/ — GPU backend (Stage 6, not started)

This directory will hold the NVIDIA CUDA kernels. **No GPU code exists yet**,
and the build has no CUDA option at this stage. AERION always runs on the CPU
(serial or OpenMP).

Planned design (see [docs/ARCHITECTURE.md](../docs/ARCHITECTURE.md) §7):

* Kernels sit behind the existing `linalg`/`solvers` interfaces: 5-point
  mat-vec, vector reductions, red-black smoothers, multigrid levels.
* The backend is selected at run time when a device is present. The CPU
  implementation stays the reference.
* Every kernel gets a regression test that compares against the CPU result
  within a stated tolerance.
* CMake option `AERION_ENABLE_CUDA` (default OFF) will be added together with
  the first kernel. Builds without the CUDA toolkit must keep working.
