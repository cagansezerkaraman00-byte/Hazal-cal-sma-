// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 The AERION Authors
#pragma once

#include <cstddef>
#include <span>
#include <vector>

#include <aerion/core/types.hpp>

namespace aerion::linalg {

/// Sparse square matrix with the five-point sparsity pattern of a 2D
/// structured grid of nx * ny unknowns, numbered k = i + nx * j.
///
/// Row k couples unknown P = (i, j) with its neighbours E = (i+1, j),
/// W = (i-1, j), N = (i, j+1) and S = (i, j-1):
///
///     (A x)_P = C_P x_P + E_P x_E + W_P x_W + N_P x_N + S_P x_S
///
/// The coefficients are the actual matrix entries (finite-volume
/// discretisations therefore store negative off-diagonals). Couplings that
/// would point outside the grid must be zero; boundary conditions are folded
/// into the coefficients and the right-hand side by the discretisation.
///
/// This structure is shared by the pressure equation and (later) implicit
/// momentum and scalar transport equations on structured grids.
class StencilMatrix2D {
  public:
    StencilMatrix2D(Index nx, Index ny);

    [[nodiscard]] Index nx() const noexcept { return nx_; }
    [[nodiscard]] Index ny() const noexcept { return ny_; }
    [[nodiscard]] Index rows() const noexcept { return nx_ * ny_; }
    [[nodiscard]] Index index(Index i, Index j) const noexcept { return i + nx_ * j; }

    [[nodiscard]] std::span<Real> center() noexcept { return c_; }
    [[nodiscard]] std::span<Real> east() noexcept { return e_; }
    [[nodiscard]] std::span<Real> west() noexcept { return w_; }
    [[nodiscard]] std::span<Real> north() noexcept { return n_; }
    [[nodiscard]] std::span<Real> south() noexcept { return s_; }
    [[nodiscard]] std::span<const Real> center() const noexcept { return c_; }
    [[nodiscard]] std::span<const Real> east() const noexcept { return e_; }
    [[nodiscard]] std::span<const Real> west() const noexcept { return w_; }
    [[nodiscard]] std::span<const Real> north() const noexcept { return n_; }
    [[nodiscard]] std::span<const Real> south() const noexcept { return s_; }

    /// y <- A x
    void multiply(std::span<const Real> x, std::span<Real> y) const;

    /// r <- b - A x
    void residual(std::span<const Real> b, std::span<const Real> x, std::span<Real> r) const;

    /// Throws InvalidArgument when a coefficient is not finite, a diagonal entry
    /// is zero, or a coupling points outside the grid.
    void validate() const;

    /// True when A_PE == A_EP and A_PN == A_NP to the relative tolerance.
    [[nodiscard]] bool is_symmetric(Real rel_tol = 1e-12) const;

    /// True when |C_P| >= sum |off-diagonals| in every row.
    [[nodiscard]] bool is_diagonally_dominant() const;

    /// Dense row-major copy (rows() x rows()); intended for tests of small systems.
    [[nodiscard]] std::vector<Real> to_dense() const;

  private:
    Index nx_;
    Index ny_;
    std::vector<Real> c_, e_, w_, n_, s_;
};

}  // namespace aerion::linalg
