// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 The AERION Authors
#include <algorithm>
#include <cmath>
#include <string>

#include <aerion/core/error.hpp>
#include <aerion/core/parallel.hpp>
#include <aerion/linalg/stencil_matrix_2d.hpp>

namespace aerion::linalg {

namespace {
std::size_t at(Index k) noexcept {
    return static_cast<std::size_t>(k);
}

bool close(Real a, Real b, Real rel_tol) {
    return std::abs(a - b) <= rel_tol * std::max({std::abs(a), std::abs(b), Real{1e-300}});
}
}  // namespace

StencilMatrix2D::StencilMatrix2D(Index nx, Index ny) : nx_(nx), ny_(ny) {
    require(nx >= 1 && ny >= 1, "StencilMatrix2D: nx and ny must be >= 1");
    const auto n = static_cast<std::size_t>(nx * ny);
    c_.assign(n, 0.0);
    e_.assign(n, 0.0);
    w_.assign(n, 0.0);
    n_.assign(n, 0.0);
    s_.assign(n, 0.0);
}

void StencilMatrix2D::multiply(std::span<const Real> x, std::span<Real> y) const {
    require(static_cast<Index>(x.size()) == rows() && static_cast<Index>(y.size()) == rows(),
            "StencilMatrix2D::multiply: vector size does not match the matrix");
    const Index nx = nx_;
    const Index ny = ny_;
    const Real* px = x.data();
    Real* py = y.data();
    const Real* c = c_.data();
    const Real* e = e_.data();
    const Real* w = w_.data();
    const Real* no = n_.data();
    const Real* so = s_.data();
    AERION_OMP(parallel for if (nx * ny > omp_min_parallel_size))
    for (Index j = 0; j < ny; ++j) {
        for (Index i = 0; i < nx; ++i) {
            const Index k = i + nx * j;
            Real v = c[k] * px[k];
            if (i > 0) {
                v += w[k] * px[k - 1];
            }
            if (i < nx - 1) {
                v += e[k] * px[k + 1];
            }
            if (j > 0) {
                v += so[k] * px[k - nx];
            }
            if (j < ny - 1) {
                v += no[k] * px[k + nx];
            }
            py[k] = v;
        }
    }
}

void StencilMatrix2D::residual(std::span<const Real> b, std::span<const Real> x,
                               std::span<Real> r) const {
    require(static_cast<Index>(b.size()) == rows(),
            "StencilMatrix2D::residual: right-hand side size does not match the matrix");
    multiply(x, r);
    const Index n = rows();
    const Real* pb = b.data();
    Real* pr = r.data();
    AERION_OMP(parallel for if (n > omp_min_parallel_size))
    for (Index k = 0; k < n; ++k) {
        pr[k] = pb[k] - pr[k];
    }
}

void StencilMatrix2D::validate() const {
    for (Index j = 0; j < ny_; ++j) {
        for (Index i = 0; i < nx_; ++i) {
            const auto k = at(index(i, j));
            const std::string where =
                " at cell (" + std::to_string(i) + ", " + std::to_string(j) + ")";
            require(std::isfinite(c_[k]) && std::isfinite(e_[k]) && std::isfinite(w_[k]) &&
                        std::isfinite(n_[k]) && std::isfinite(s_[k]),
                    "StencilMatrix2D: non-finite coefficient" + where);
            require(c_[k] != 0.0, "StencilMatrix2D: zero diagonal entry" + where);
            require(i > 0 || w_[k] == 0.0,
                    "StencilMatrix2D: west coupling leaves the grid" + where);
            require(i < nx_ - 1 || e_[k] == 0.0,
                    "StencilMatrix2D: east coupling leaves the grid" + where);
            require(j > 0 || s_[k] == 0.0,
                    "StencilMatrix2D: south coupling leaves the grid" + where);
            require(j < ny_ - 1 || n_[k] == 0.0,
                    "StencilMatrix2D: north coupling leaves the grid" + where);
        }
    }
}

bool StencilMatrix2D::is_symmetric(Real rel_tol) const {
    for (Index j = 0; j < ny_; ++j) {
        for (Index i = 0; i < nx_; ++i) {
            const Index k = index(i, j);
            if (i < nx_ - 1 && !close(e_[at(k)], w_[at(k + 1)], rel_tol)) {
                return false;
            }
            if (j < ny_ - 1 && !close(n_[at(k)], s_[at(k + nx_)], rel_tol)) {
                return false;
            }
        }
    }
    return true;
}

bool StencilMatrix2D::is_diagonally_dominant() const {
    for (std::size_t k = 0; k < c_.size(); ++k) {
        const Real off = std::abs(e_[k]) + std::abs(w_[k]) + std::abs(n_[k]) + std::abs(s_[k]);
        if (std::abs(c_[k]) < off * (1.0 - 1e-14)) {
            return false;
        }
    }
    return true;
}

std::vector<Real> StencilMatrix2D::to_dense() const {
    const Index n = rows();
    std::vector<Real> a(at(n * n), 0.0);
    auto set = [&](Index row, Index col, Real v) { a[at(row * n + col)] += v; };
    for (Index j = 0; j < ny_; ++j) {
        for (Index i = 0; i < nx_; ++i) {
            const Index k = index(i, j);
            set(k, k, c_[at(k)]);
            if (i > 0) {
                set(k, k - 1, w_[at(k)]);
            }
            if (i < nx_ - 1) {
                set(k, k + 1, e_[at(k)]);
            }
            if (j > 0) {
                set(k, k - nx_, s_[at(k)]);
            }
            if (j < ny_ - 1) {
                set(k, k + nx_, n_[at(k)]);
            }
        }
    }
    return a;
}

}  // namespace aerion::linalg
