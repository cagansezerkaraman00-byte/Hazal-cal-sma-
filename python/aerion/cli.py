# SPDX-License-Identifier: Apache-2.0
# Copyright (c) 2026 The AERION Authors
"""Command-line interface: ``aerion`` / ``python -m aerion``."""

from __future__ import annotations

import argparse
import datetime as _dt
import json
import sys
from pathlib import Path

from . import __version__, _core
from .verification.poisson import CASES, run_convergence_study

BANNER = f"AERION {__version__} - Engineering the Invisible."


def _cmd_info(_: argparse.Namespace) -> int:
    print(_core.build_summary(), end="")
    return 0


def _cmd_verify_poisson(args: argparse.Namespace) -> int:
    cases = list(CASES) if args.case == "all" else [args.case]
    if args.threads:
        _core.set_num_threads(args.threads)
    print(BANNER)
    print(
        f"Poisson order-of-accuracy verification | solver={args.solver} beta={args.beta} "
        f"rtol={args.rtol:g} threads={_core.max_threads()}\n"
    )
    all_ok = True
    summary = []
    for name in cases:
        study = run_convergence_study(name, args.levels, args.solver, args.beta, args.rtol)
        ok = study.passed(args.expected_order, args.order_tolerance)
        all_ok &= ok
        print(f"[{'PASS' if ok else 'FAIL'}] {name}: {CASES[name].description}")
        print(study.table())
        print(
            f"asymptotic L2 order {study.orders_l2[-1]:.4f} "
            f"(expected {args.expected_order} +/- {args.order_tolerance})\n"
        )
        summary.append({**study.to_dict(), "passed": ok})
        if args.output_dir:
            study.to_csv(Path(args.output_dir) / f"poisson_{name}_{args.solver}_beta{args.beta:g}.csv")
    if args.output_dir:
        out = Path(args.output_dir) / f"poisson_summary_{args.solver}_beta{args.beta:g}.json"
        out.parent.mkdir(parents=True, exist_ok=True)
        payload = {
            "generated_utc": _dt.datetime.now(_dt.timezone.utc).isoformat(timespec="seconds"),
            "build": _core.build_info(),
            "expected_order": args.expected_order,
            "order_tolerance": args.order_tolerance,
            "studies": summary,
        }
        out.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
        print(f"results written to {args.output_dir}")
    print("verification", "PASSED" if all_ok else "FAILED")
    return 0 if all_ok else 1


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(prog="aerion", description=BANNER)
    parser.add_argument("--version", action="version", version=f"aerion {__version__}")
    sub = parser.add_subparsers(dest="command", required=True)

    p_info = sub.add_parser("info", help="print version and build configuration")
    p_info.set_defaults(func=_cmd_info)

    p_verify = sub.add_parser("verify", help="run code-verification studies")
    verify_sub = p_verify.add_subparsers(dest="target", required=True)
    p_poisson = verify_sub.add_parser(
        "poisson", help="order of accuracy of the Poisson solver (manufactured solutions)"
    )
    p_poisson.add_argument("--case", choices=["all", *CASES], default="all")
    p_poisson.add_argument("--levels", type=int, nargs="+", default=[16, 32, 64, 128],
                           help="cells per unit length, coarse to fine")
    p_poisson.add_argument("--solver", choices=["cg", "sor"], default="cg")
    p_poisson.add_argument("--beta", type=float, default=0.0,
                           help="tanh wall-clustering strength (0 = uniform grid)")
    p_poisson.add_argument("--rtol", type=float, default=1e-10,
                           help="relative residual tolerance of the linear solver")
    p_poisson.add_argument("--expected-order", type=float, default=2.0)
    p_poisson.add_argument("--order-tolerance", type=float, default=0.1)
    p_poisson.add_argument("--threads", type=int, default=0)
    p_poisson.add_argument("--output-dir", default=None,
                           help="write per-case CSV tables and a JSON summary here")
    p_poisson.set_defaults(func=_cmd_verify_poisson)
    return parser


def main(argv: list[str] | None = None) -> int:
    args = build_parser().parse_args(argv)
    try:
        return int(args.func(args))
    except (_core.AerionError, ValueError) as exc:
        print(f"aerion: error: {exc}", file=sys.stderr)
        return 2


if __name__ == "__main__":  # pragma: no cover
    sys.exit(main())
