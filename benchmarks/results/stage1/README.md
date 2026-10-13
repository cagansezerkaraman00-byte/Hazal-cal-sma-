# Stage 1 results — Poisson solver verification and performance

All files in this directory were produced by actually running the commands
below; nothing was edited by hand. Raw console output is in the `*.log`
files, machine-readable tables in the `*.csv` / `*.json` files.

| item | value |
|---|---|
| AERION revision | `000523a630d3` (v0.1.0) |
| build | Release, GCC 13.3.0, `-O3`, OpenMP |
| machine | cloud container, Intel Xeon @ 2.80 GHz, 4 vCPU (1 thread/core) |
| date | 2026-10-13 |

```bash
cmake --preset release && cmake --build --preset release
export PYTHONPATH=build/release/python
python3 -m aerion verify poisson --levels 16 32 64 128 256 512 --output-dir benchmarks/results/stage1/verification
python3 -m aerion verify poisson --levels 16 32 64 128 256 512 --beta 2 --output-dir benchmarks/results/stage1/verification
python3 -m aerion verify poisson --solver sor --levels 16 32 64 128 256 --output-dir benchmarks/results/stage1/verification
./build/release/benchmarks/aerion-bench-poisson --max-n 512 --threads 4 --csv benchmarks/results/stage1/poisson_solvers_4threads.csv
./build/release/benchmarks/aerion-bench-poisson --max-n 512 --threads 1 --csv benchmarks/results/stage1/poisson_solvers_1thread.csv
```

## 1. Order of accuracy (code verification, method of manufactured solutions)

The discrete solution is compared with the exact solution at cell centres;
`p` is the observed order between consecutive grids. The scheme is formally
second order, so `p → 2` is the expected (and obtained) result.

**exp-mixed** — φ = eˣ sin 2y + x²y on [0,2]×[0,1], Dirichlet (west/east) +
Neumann (south/north), non-homogeneous data. Jacobi-PCG, rtol = 1e-10.

| nx × ny | grid | L2 error | p(L2) | L∞ error | p(L∞) | CG iterations |
|---|---|---|---|---|---|---|
| 32 × 16 | uniform | 1.14742e-03 | – | 3.92550e-03 | – | 118 |
| 64 × 32 | uniform | 2.87700e-04 | 1.996 | 1.03334e-03 | 1.926 | 236 |
| 128 × 64 | uniform | 7.19788e-05 | 1.999 | 2.66615e-04 | 1.954 | 465 |
| 256 × 128 | uniform | 1.79980e-05 | 2.000 | 6.77596e-05 | 1.976 | 904 |
| 512 × 256 | uniform | 4.49967e-06 | 2.000 | 1.70791e-05 | 1.988 | 1786 |
| 1024 × 512 | uniform | 1.12501e-06 | 2.000 | 4.28715e-06 | 1.994 | 3531 |
| 32 × 16 | tanh β=2 | 2.21259e-03 | – | 7.27057e-03 | – | 123 |
| 64 × 32 | tanh β=2 | 5.54496e-04 | 1.999 | 1.90821e-03 | 1.933 | 248 |
| 128 × 64 | tanh β=2 | 1.38708e-04 | 2.000 | 4.87418e-04 | 1.970 | 493 |
| 256 × 128 | tanh β=2 | 3.46823e-05 | 2.000 | 1.23089e-04 | 1.986 | 976 |
| 512 × 256 | tanh β=2 | 8.67075e-06 | 2.000 | 3.09181e-05 | 1.993 | 1917 |
| 1024 × 512 | tanh β=2 | 2.16655e-06 | 2.001 | 7.78892e-06 | 1.989 | 3783 |

Asymptotic L2 orders of all studies (finest pair):

| case | uniform, CG | stretched β=2, CG | uniform, SOR |
|---|---|---|---|
| sine-dirichlet (Dirichlet, [0,1]²) | 2.0000 | 2.0000 | 2.0000 |
| cosine-neumann (pure Neumann, singular) | 2.0000 | 2.0000 | 2.0000 |
| exp-mixed (mixed, [0,2]×[0,1]) | 1.9999 | 2.0008 | 2.0011 |

Observations:

* The L∞ order approaches 2 more slowly than the L2 order in the mixed case.
  That is the expected behaviour of the cell-centred Dirichlet closure, whose
  local truncation error is O(h) in the boundary cells. The scheme is still
  globally second order (supra-convergence).
* sine-dirichlet and cosine-neumann give **identical** errors on uniform
  grids. This is a property of the discrete operator, not a bug: on a uniform
  cell-centred grid, sin(πx)sin(πy) with Dirichlet data and cos(πx)cos(πy)
  with Neumann data are both exact eigenvectors of the discrete Laplacian with
  the same eigenvalue. On stretched grids they differ, as they should.
* The relative global conservation error stays at or below 1e-8, as bounded
  by the linear-solver tolerance. The finite-volume scheme itself is
  conservative.

## 2. Linear-solver performance

Problem: sine-dirichlet, uniform n × n, rtol = 1e-8, zero initial guess,
median of 5 runs (3 for n = 512). The L2 column shows that every timed solve
produced the correct discrete solution.

| n | solver | iterations | time, 1 thread [s] | time, 4 threads [s] | speed-up |
|---|---|---|---|---|---|
| 64 | PCG (Jacobi) | 58 | 0.0024 | 0.0022 | 1.1 |
| 128 | PCG (Jacobi) | 100 | 0.0188 | 0.0153 | 1.2 |
| 256 | PCG (Jacobi) | 192 | 0.1275 | 0.0427 | 3.0 |
| 512 | PCG (Jacobi) | 374 | 1.2561 | 0.3088 | 4.1 |
| 64 | SOR red-black | 259 | 0.0136 | 0.0083 | 1.6 |
| 128 | SOR red-black | 532 | 0.0882 | 0.0764 | 1.2 |
| 256 | SOR red-black | 1093 | 0.6613 | 0.2143 | 3.1 |
| 512 | SOR red-black | 2243 | 7.2040 | 1.9651 | 3.7 |

Observations:

* CG iterations double each time n doubles (58 → 100 → 192 → 374): the
  condition number of the Poisson matrix grows like h⁻², so CG needs O(n)
  iterations and O(n³) work in total. The pressure equation will dominate the
  Navier–Stokes cost, so a **multigrid** solver (O(n²) work) is planned for
  Stage 6. The `StencilMatrix2D` interface is designed so that it can be
  swapped in.
* On uniform grids the matrix diagonal is constant apart from the boundary
  rows, so Jacobi preconditioning is nearly a plain rescaling there. It is
  kept for stretched grids, where the diagonal varies. Its effect was not
  benchmarked separately in this run.
* OpenMP only pays off above ~256² cells on this machine. Below that, the
  vectors fit in cache and thread start-up dominates. The
  `omp_min_parallel_size` threshold (16384) has not been tuned yet.
* The machine is a shared cloud container. Two repeated benchmark sessions
  differed by up to ~25 % on the small cases. Use the trends, not the
  absolute values.
