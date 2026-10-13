# Governing equations and numerical method

This page states the physical model AERION solves, the assumptions it rests
on, and the numerical method chosen to discretise it. Sections that describe
Stage 2+ are design documents. The implemented Stage 1 kernel is described in
[poisson_fvm.md](poisson_fvm.md).

## 1. Physical model (Stage 2 target)

### 1.1 Incompressible Navier–Stokes equations

For a Newtonian fluid with constant density ρ and dynamic viscosity μ
(kinematic viscosity ν = μ/ρ), in a domain Ω:

Mass conservation

$$\nabla\cdot\mathbf{u} = 0$$

Momentum conservation

$$\frac{\partial \mathbf{u}}{\partial t} + \nabla\cdot(\mathbf{u}\otimes\mathbf{u})
  = -\frac{1}{\rho}\nabla p + \nu\,\nabla^2\mathbf{u} + \mathbf{f}$$

with velocity **u** = (u, v), pressure p and body force **f**. Pressure is
not governed by an equation of state. It is the Lagrange multiplier that
enforces ∇·**u** = 0. Taking the divergence of the momentum equation gives
the pressure Poisson equation

$$\nabla^2 p = -\rho\,\nabla\cdot\left[\nabla\cdot(\mathbf{u}\otimes\mathbf{u})\right] + \rho\,\nabla\cdot\mathbf f,$$

which is why a fast, verified Poisson solver is the first building block.

### 1.2 Non-dimensional form

With a reference length L and velocity U, Re = UL/ν and p* = p/(ρU²):

$$\frac{\partial \mathbf{u}^*}{\partial t^*} + \nabla^*\cdot(\mathbf{u}^*\otimes\mathbf{u}^*)
  = -\nabla^* p^* + \frac{1}{\mathrm{Re}}\nabla^{*2}\mathbf{u}^*.$$

The Reynolds number is the only parameter of incompressible flow without
body forces. A simulation at a given Re represents every (U, L, ν) with that
Re.

### 1.3 Assumptions and range of validity

| assumption | valid when | consequence if violated |
|---|---|---|
| Incompressible (ρ = const) | Mach number Ma ≲ 0.3 (density changes ≲ 5 %) | compressibility effects (shocks, acoustic waves) missed |
| Newtonian, constant μ | air/water at moderate temperature differences | wrong stresses for non-Newtonian or strongly heated flows |
| Laminar (no turbulence model) | Re below transition (cavity Re ≲ 5000–8000, channel Re ≲ ~2000, airfoils Re ≲ ~10⁴–10⁵ with caveats) | unresolved turbulence → wrong drag, separation, unsteadiness |
| 2D | spanwise-homogeneous flow | no 3D instabilities, tip vortices, induced drag |
| Isothermal | no buoyancy or heat transfer | — |

Every case report will restate these assumptions. Results outside the
validity range are flagged as such in the CLI, Python and GUI.

### 1.4 Boundary conditions (Stage 2)

* **No-slip wall**: **u** = **u**_wall (moving lid: u = U). Pressure:
  homogeneous Neumann in the projection step.
* **Velocity inlet**: prescribed **u**. Pressure: Neumann.
* **Outlet**: zero-gradient (∂**u**/∂n = 0) or convective outflow,
  p = p_ref (Dirichlet), which also removes the pressure null space.
* **Periodic**: for Taylor–Green verification.
* **Initial condition**: a divergence-free **u**(t = 0). Non-solenoidal
  initial data are projected first.

When all boundaries prescribe velocity (e.g. the cavity), the pressure
Poisson problem is pure Neumann. The solvability condition
∫∇·**u*** dV = ∮ **u***·**n** dA must hold. Pressure is determined up to a
constant, and the Stage 1 solver already handles this case (projection plus
zero-mean gauge, compatibility diagnostic).

## 2. Numerical method

### 2.1 Why the finite-volume method

Integrating the conservation laws over each control volume V_P and applying
the divergence theorem gives exact balances of face fluxes:

$$\frac{d}{dt}\int_{V_P}\mathbf u\,dV + \sum_f \left(\mathbf u\,(\mathbf u\cdot\mathbf n)\right)_f A_f
  = -\frac{1}{\rho}\sum_f p_f\,\mathbf n_f A_f + \nu\sum_f (\nabla\mathbf u\cdot\mathbf n)_f A_f.$$

Only the face values are approximated. Whatever leaves one cell enters its
neighbour, so mass and momentum are conserved discretely, independently of
the approximation error. The method extends naturally from Cartesian grids
to the unstructured meshes needed around airfoils.

### 2.2 Spatial arrangement — staggered MAC grid (Stage 2)

Harlow & Welch (1965): p at cell centres, u at x-faces, v at y-faces. The
discrete divergence and gradient are then adjoint (−Gᵀ = D). The pressure
Poisson operator DG is exactly the compact five-point Laplacian that Stage 1
implements and verifies. Odd–even pressure decoupling (checkerboarding)
cannot occur. `Array2D` supports the face-index ranges this needs.

### 2.3 Pressure–velocity coupling — projection method (Stage 2)

Chorin (1968) / Kim & Moin (1985) fractional step, per time step Δt:

1. **Predictor**: **u*** = **uⁿ** + Δt [−∇·(**u⊗u**) + ν∇²**u**]
   (explicit AB2/RK, or semi-implicit diffusion).
2. **Pressure Poisson**: ∇²φ = (ρ/Δt) ∇·**u*** with ∂φ/∂n = 0 on velocity
   boundaries (→ `PoissonSolver2D`; the matrix is assembled once).
3. **Corrector**: **u**ⁿ⁺¹ = **u*** − (Δt/ρ)∇φ, giving ∇·**u**ⁿ⁺¹ = 0 to
   solver tolerance on the MAC grid.

### 2.4 Stability and time-step control (explicit schemes)

* Convective (CFL): Δt ≤ C·min(Δx/|u| , Δy/|v|), C ≈ 0.5.
* Viscous: Δt ≤ (1/(2ν))·(1/Δx² + 1/Δy²)⁻¹ · safety factor.
* Cell Péclet/Reynolds number Pe = |u|Δx/ν > 2 makes central convection
  oscillatory. Hence the upwind-biased option, and grid refinement guidance.

The solver will compute both limits every step and report which one is
active.

### 2.5 Convergence monitoring

* Linear solves: true residual ‖b − Ax‖₂ relative to ‖b‖₂. Stagnation at
  the round-off floor is detected and reported.
* Time stepping to steady state: L2 norm of (**u**ⁿ⁺¹ − **u**ⁿ)/Δt and of
  the momentum residual, normalised by their first-step values. Steady state
  is declared below a user tolerance (default 1e-8).
* Mass conservation: max |∇·**u**| per cell and the global net boundary flux,
  reported every step.

## 3. References

* F. H. Harlow, J. E. Welch, *Phys. Fluids* 8 (1965) 2182–2189 — MAC method.
* A. J. Chorin, *Math. Comp.* 22 (1968) 745–762 — projection method.
* J. Kim, P. Moin, *J. Comput. Phys.* 59 (1985) 308–323 — fractional step.
* U. Ghia, K. N. Ghia, C. T. Shin, *J. Comput. Phys.* 48 (1982) 387–411 — cavity benchmark.
* J. H. Ferziger, M. Perić, R. L. Street, *Computational Methods for Fluid Dynamics*, 4th ed., Springer (2020).
* H. K. Versteeg, W. Malalasekera, *An Introduction to Computational Fluid Dynamics: The Finite Volume Method*, 2nd ed., Pearson (2007).
