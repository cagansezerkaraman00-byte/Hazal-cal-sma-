// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 The AERION Authors
#pragma once

#include <aerion/core/error.hpp>
#include <aerion/core/types.hpp>

#include <algorithm>
#include <cstddef>
#include <span>
#include <stdexcept>
#include <string>
#include <type_traits>
#include <vector>

namespace aerion {

/// Half-open index range [begin, end).
struct IndexRange {
    Index begin = 0;
    Index end = 0;
    [[nodiscard]] constexpr Index size() const noexcept { return end - begin; }
    friend constexpr bool operator==(const IndexRange&, const IndexRange&) = default;
};

/// Contiguous two-dimensional array addressed as a(i, j) over arbitrary index
/// ranges, so that the same container serves cell-centred fields
/// ([0,nx) x [0,ny)), face-centred staggered fields ([0,nx] x [0,ny)) and
/// fields with ghost layers ([-g, nx+g) x [-g, ny+g)).
///
/// Storage is column-major in (i, j) -- i runs fastest -- which matches the
/// linear cell numbering k = i + nx * j used by the linear-algebra layer, so
/// the interior data of a cell field *is* the solution vector of the solvers.
///
/// Accessors are bounds-checked when AERION_BOUNDS_CHECK is defined (always
/// in Debug builds) and unchecked otherwise.
template <class T>
class Array2D {
    static_assert(!std::is_same_v<T, bool>, "Array2D<bool> is not supported (std::vector<bool>)");

public:
    using value_type = T;

    Array2D() = default;

    /// Array over [0, ni) x [0, nj).
    Array2D(Index ni, Index nj, const T& value = T{})
        : Array2D(IndexRange{0, ni}, IndexRange{0, nj}, value) {}

    /// Array over the ranges ri x rj.
    Array2D(IndexRange ri, IndexRange rj, const T& value = T{}) : ri_(ri), rj_(rj) {
        require(ri.size() >= 0 && rj.size() >= 0, "Array2D: index ranges must not be negative");
        data_.assign(static_cast<std::size_t>(ri.size() * rj.size()), value);
    }

    /// Array over [-ghosts, ni + ghosts) x [-ghosts, nj + ghosts).
    [[nodiscard]] static Array2D with_ghosts(Index ni, Index nj, Index ghosts,
                                             const T& value = T{}) {
        require(ghosts >= 0, "Array2D: number of ghost layers must be >= 0");
        return Array2D(IndexRange{-ghosts, ni + ghosts}, IndexRange{-ghosts, nj + ghosts}, value);
    }

    [[nodiscard]] IndexRange i_range() const noexcept { return ri_; }
    [[nodiscard]] IndexRange j_range() const noexcept { return rj_; }
    [[nodiscard]] Index ni() const noexcept { return ri_.size(); }
    [[nodiscard]] Index nj() const noexcept { return rj_.size(); }
    [[nodiscard]] Index size() const noexcept { return static_cast<Index>(data_.size()); }
    [[nodiscard]] bool empty() const noexcept { return data_.empty(); }

    [[nodiscard]] T& operator()(Index i, Index j) { return data_[offset(i, j)]; }
    [[nodiscard]] const T& operator()(Index i, Index j) const { return data_[offset(i, j)]; }

    [[nodiscard]] T* data() noexcept { return data_.data(); }
    [[nodiscard]] const T* data() const noexcept { return data_.data(); }
    [[nodiscard]] std::span<T> values() noexcept { return data_; }
    [[nodiscard]] std::span<const T> values() const noexcept { return data_; }

    void fill(const T& value) { std::fill(data_.begin(), data_.end(), value); }

    [[nodiscard]] bool same_shape(const Array2D& other) const noexcept {
        return ri_ == other.ri_ && rj_ == other.rj_;
    }

    [[nodiscard]] bool contains(Index i, Index j) const noexcept {
        return i >= ri_.begin && i < ri_.end && j >= rj_.begin && j < rj_.end;
    }

private:
    [[nodiscard]] std::size_t offset(Index i, Index j) const {
#if defined(AERION_BOUNDS_CHECK)
        if (!contains(i, j)) {
            throw std::out_of_range("Array2D: index (" + std::to_string(i) + ", " +
                                    std::to_string(j) + ") outside [" + std::to_string(ri_.begin) +
                                    ", " + std::to_string(ri_.end) + ") x [" +
                                    std::to_string(rj_.begin) + ", " + std::to_string(rj_.end) +
                                    ")");
        }
#endif
        return static_cast<std::size_t>((i - ri_.begin) + ri_.size() * (j - rj_.begin));
    }

    IndexRange ri_{};
    IndexRange rj_{};
    std::vector<T> data_;
};

using ScalarField2D = Array2D<Real>;

}  // namespace aerion
