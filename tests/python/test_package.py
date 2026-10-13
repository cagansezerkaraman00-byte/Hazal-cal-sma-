# SPDX-License-Identifier: Apache-2.0
import re
from pathlib import Path

import aerion
import pytest

REPO_ROOT = Path(__file__).resolve().parents[2]


def test_version_matches_cmake_project_version():
    cmake = (REPO_ROOT / "CMakeLists.txt").read_text(encoding="utf-8")
    match = re.search(r"project\(\s*AERION\s+VERSION\s+([0-9]+\.[0-9]+\.[0-9]+)", cmake)
    assert match, "project version not found in CMakeLists.txt"
    assert aerion.__version__ == match.group(1)


def test_build_info_is_complete():
    info = aerion.build_info()
    assert info["version"] == aerion.__version__
    assert info["cxx_standard"] >= 202002
    assert info["cuda"] is False  # GPU backend is not implemented yet (Stage 6)
    assert info["max_threads"] >= 1
    assert "Engineering the Invisible" in aerion.build_summary()


def test_public_api_is_exported():
    for name in aerion.__all__:
        assert hasattr(aerion, name), name


def test_exception_hierarchy():
    assert issubclass(aerion.InvalidArgumentError, aerion.AerionError)
    assert issubclass(aerion.InvalidArgumentError, ValueError)
    assert issubclass(aerion.NumericalError, ArithmeticError)
    assert issubclass(aerion.AerionIOError, OSError)
    assert issubclass(aerion.AerionError, RuntimeError)


def test_engine_errors_carry_messages():
    with pytest.raises(aerion.InvalidArgumentError, match="strictly increasing"):
        aerion.StructuredGrid2D([0.0, 1.0, 0.5], [0.0, 1.0])


def test_thread_control():
    before = aerion.max_threads()
    aerion.set_num_threads(1)
    assert aerion.max_threads() == 1
    aerion.set_num_threads(before)
    with pytest.raises(ValueError):
        aerion.set_num_threads(0)
