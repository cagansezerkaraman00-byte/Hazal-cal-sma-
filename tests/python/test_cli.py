# SPDX-License-Identifier: Apache-2.0
import json
import os
import subprocess
import sys
from pathlib import Path

import aerion
from aerion.cli import main


def _env():
    # Make the child interpreter import the same aerion as this test session.
    env = dict(os.environ)
    package_parent = str(Path(aerion.__file__).resolve().parents[1])
    env["PYTHONPATH"] = os.pathsep.join(filter(None, [package_parent, env.get("PYTHONPATH")]))
    return env


def test_module_entry_point_info():
    out = subprocess.run(
        [sys.executable, "-m", "aerion", "info"],
        capture_output=True, text=True, env=_env(), check=True,
    )
    assert aerion.__version__ in out.stdout
    assert "Engineering the Invisible" in out.stdout


def test_verify_poisson_writes_results(tmp_path, capsys):
    code = main([
        "verify", "poisson", "--case", "exp-mixed", "--levels", "8", "16", "32",
        "--beta", "1.0", "--output-dir", str(tmp_path),
    ])
    assert code == 0
    assert "verification PASSED" in capsys.readouterr().out
    summary = json.loads((tmp_path / "poisson_summary_cg_beta1.json").read_text())
    assert summary["build"]["version"] == aerion.__version__
    (study,) = summary["studies"]
    assert study["case"] == "exp-mixed" and study["passed"]
    assert len(study["levels"]) == 3
    assert (tmp_path / "poisson_exp-mixed_cg_beta1.csv").exists()


def test_verify_fails_when_order_expectation_is_wrong(capsys):
    # A deliberately wrong expectation must produce a failing exit code.
    code = main(["verify", "poisson", "--case", "sine-dirichlet", "--levels", "8", "16",
                 "--expected-order", "4"])
    assert code == 1
    assert "verification FAILED" in capsys.readouterr().out


def test_invalid_levels_return_error_code(capsys):
    assert main(["verify", "poisson", "--levels", "32", "16"]) == 2
    assert "strictly increasing" in capsys.readouterr().err
