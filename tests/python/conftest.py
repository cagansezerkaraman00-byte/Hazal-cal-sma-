# SPDX-License-Identifier: Apache-2.0
"""pytest configuration.

`aerion` is imported from wherever Python finds it first (an installed wheel,
or the PYTHONPATH set by CTest). Only if it is not importable at all do we
fall back to the in-tree package (python/aerion with an in-place build).
"""

from __future__ import annotations

import importlib.util
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]

if importlib.util.find_spec("aerion") is None:
    sys.path.insert(0, str(REPO_ROOT / "python"))


def pytest_report_header(config):  # noqa: ARG001
    import aerion

    info = aerion.build_info()
    return (
        f"aerion {aerion.__version__} ({info['build_type']}, {info['compiler']}, "
        f"OpenMP={info['openmp']}) from {Path(aerion.__file__).parent}"
    )
