# Stage 1 kernel: finite-volume Poisson solver

Implementation: `include/aerion/solvers/poisson_2d.hpp`, `src/solvers/poisson_2d.cpp`.
Verification: `tests/cpp/test_poisson.cpp`, `tests/python/test_poisson.py`,
recorded results in [benchmarks/results/stage1](../../benchmarks/results/stage1/README.md).

## 1. Problem

$$\nabla^2\varphi = f \quad\text{in } \Omega=[x_0,x_1]\times[y_0,y_1],$$

with, on each side, either

* **Dirichlet**: φ = φ_b(s), or
* **Neumann**: ∂φ/∂n = g(s), the derivative along the **outward** normal.

Physical meaning: steady heat conduction (φ = temperature), potential flow
(φ = velocity potential), electrostatics, and the pressure equation of the
projection method.

## 2. Discretisation

The grid is rectilinear. Faces x_0 < … < x_nx and y_0 < … < y_ny may be
non-uniform. Cell P = (i, j) has centre (x_P, y_P) at the midpoint of its
faces, width Δx_i, height Δy_j and area V_P = Δx_i Δy_j.

Integrating over cell P and applying the divergence theorem gives the exact
balance

$$\sum_{f\in\partial P} \left(\frac{\partial\varphi}{\partial n}\right)_f A_f = \int_{V_P} f\,dV .$$

Face approximations:

| face | approximation of (∂φ/∂n)_f A_f | conductance |
|---|---|---|
| interior, between P and neighbour N | a_PN (φ_N − φ_P) | a_PN = A_f / ‖x_N − x_P‖ |
| Dirichlet boundary | a_b (φ_b − φ_P) | a_b = A_f / ‖x_f − x_P‖ (half-cell distance) |
| Neumann boundary | g A_f | — |

The source is integrated with the midpoint rule, ∫f dV ≈ f(x_P) V_P.

Multiplying by −1 gives the linear system A φ = b with

$$A_{PP} = \sum_N a_{PN} + \sum_{\text{Dirichlet faces}} a_b ,\qquad A_{PN} = -a_{PN},$$
$$b_P = -f_P V_P + \sum_{\text{Dirichlet}} a_b\,\varphi_b + \sum_{\text{Neumann}} g\,A_f .$$

Properties (all checked by tests):

* **Symmetric**, because a_PN = a_NP (the same face is seen from both sides).
* **Weakly diagonally dominant**, with an M-matrix sign pattern.
* **Positive definite** if at least one side is Dirichlet. **Positive
  semi-definite** with null space span{1} for pure Neumann problems (every row
  sums to zero).
* **Exact for linear φ** on any rectilinear grid (patch test). Every face
  formula is exact for linear functions.
* **Second-order accurate** globally (L2 and L∞). The Dirichlet closure has an
  O(h) local truncation error in boundary cells, but the global error is
  O(h²) (supra-convergence). Observed orders are recorded in the results.
* **Conservative**: the sum over all rows telescopes. Interior fluxes cancel
  pairwise, so Σ_P (b − Aφ)_P = (net boundary flux) − ∫f dV. The reported
  `conservation_error` is this imbalance, evaluated from the computed φ. It
  is therefore bounded by the linear-solver residual.

Hand check (from `test_poisson.cpp`): a 4×1 grid with h = 0.25, Δy = 1,
Dirichlet west/east gives face conductance Δy/h = 4 and Dirichlet conductance
Δy/(h/2) = 8:

```
| 12 -4  0  0 |
| -4  8 -4  0 |
|  0 -4  8 -4 |
|  0  0 -4 12 |
```

## 3. Pure-Neumann problems

The discrete solvability condition is Σ_P b_P = 0, the discrete form of
∫f dV = ∮g dA. AERION:

1. computes the relative defect |Σb| / (Σ|f|V + Σ|g|A) and logs a warning
   above `compatibility_tolerance` (default 1e-8);
2. removes the mean of b. Since A is symmetric, range(A) = span{1}^⊥, so this
   is the orthogonal projection onto the nearest solvable problem;
3. solves with residuals projected onto mean-zero vectors;
4. fixes the free constant with a zero volume-weighted mean of φ.

In the projection method the defect measures how far ∮**u***·**n** dA is
from zero, which is a useful diagnostic of inflow/outflow imbalance.

## 4. Linear solvers

| solver | requirement | cost per iteration | iterations (measured) |
|---|---|---|---|
| Jacobi-PCG | SPD or consistent SPSD | 1 mat-vec + 2 dots + 3 axpy | 0.73–0.9 n for an n×n grid at rtol 1e-8 |
| red-black SOR, ω_opt = 2/(1+sin(π/n)) | SPD (0 < ω < 2) | 1 sweep + residual | 4.0–4.4 n |

(Iteration counts from `benchmarks/results/stage1`, sine-dirichlet problem.)

Stopping criterion: ‖b − Ax‖₂ ≤ max(rtol‖b‖₂, atol). The **true** residual
is always checked before convergence is declared; CG's recursive residual
can drift by round-off. If the target lies below the floating-point floor of
evaluating b − Ax, the solver stops with status **Stagnated** instead of
iterating to the cap. Very tight tolerances (rtol ≲ 1e-12) on fine grids are
the typical cause, since ‖b‖ scales with the cell area while round-off in
Ax does not.

Choosing rtol: the algebraic error should be well below the discretisation
error. In our runs, the error norms obtained with rtol = 1e-10 (the
verification default) and rtol = 1e-12 agreed to about 6 significant digits.

## 5. Known limitations (Stage 1)

* Rectilinear grids only. Body-fitted/unstructured meshes come in Stage 4.
* CG needs O(n) iterations (O(N^1.5) work). Multigrid is planned.
* Neumann/Dirichlet types are fixed per side. Mixed types along one side
  (e.g. an inlet patch on a wall) need boundary patches (Stage 2).
* Robin (convective heat transfer) conditions are not implemented.
