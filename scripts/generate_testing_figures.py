"""Generate data-visualization figures for Chapter 4.2 Testing.

Outputs two PNGs to ../figures_testing/:
  T1_test_pyramid.png            Three-tier test pyramid
  T2_contract_distribution.png   Hardhat test cases per contract module
"""

from pathlib import Path

import matplotlib.pyplot as plt
from matplotlib.patches import Polygon

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "figures_testing"
OUT.mkdir(exist_ok=True)


def fig_t1_pyramid() -> Path:
    tiers = [
        ("Unit tests",        "Solidity / Hardhat (`npx hardhat test`)",  27, "#4C78A8"),
        ("Integration tests", "Backend API (curl / Postman)",             13, "#54A24B"),
        ("UI / end-to-end",   "Dashboard + IoT simulator",                 8, "#E45756"),
    ]

    fig, ax = plt.subplots(figsize=(11, 5))
    bar_height = 0.72
    max_count = max(t[2] for t in tiers)
    label_offset = 0.03

    for i, (tier, sub, count, color) in enumerate(reversed(tiers)):
        w = count / max_count
        y = i
        ax.barh(y, w, height=bar_height, color=color, edgecolor="white", linewidth=2,
                left=-w / 2)
        ax.text(0, y, str(count), ha="center", va="center",
                color="white", fontsize=18, fontweight="bold")
        ax.text(w / 2 + label_offset, y, f"  {tier}\n  {sub}",
                ha="left", va="center", color="black", fontsize=10)

    ax.set_xlim(-0.6, 1.05)
    ax.set_ylim(-0.7, len(tiers) - 0.3)
    ax.invert_yaxis()
    ax.axis("off")
    ax.set_title(
        "Figure T1: Test Classification Pyramid\n"
        "(bar width proportional to number of test cases)",
        fontsize=12, pad=12,
    )

    path = OUT / "T1_test_pyramid.png"
    fig.tight_layout()
    fig.savefig(path, dpi=180, bbox_inches="tight")
    plt.close(fig)
    return path


def fig_t2_contract_distribution() -> Path:
    modules = [
        ("Deployment",           1),
        ("Device Registration",  5),
        ("Data Storage",         5),
        ("Data Query",           5),
        ("Access Control",       6),
        ("Data Verification",    2),
        ("Admin Transfer",       3),
    ]
    labels = [m for m, _ in modules]
    counts = [c for _, c in modules]
    total = sum(counts)

    fig, ax = plt.subplots(figsize=(9, 5))
    bars = ax.bar(labels, counts, color="#4C78A8", edgecolor="white")
    for bar, c in zip(bars, counts):
        ax.text(bar.get_x() + bar.get_width() / 2, bar.get_height() + 0.1,
                str(c), ha="center", va="bottom", fontsize=11, fontweight="bold")

    ax.set_ylabel("Number of test cases", fontsize=11)
    ax.set_title(
        f"Figure T2: Smart Contract Test-Case Distribution by Module "
        f"({total} cases across 7 suites)",
        fontsize=12, pad=12,
    )
    ax.set_ylim(0, max(counts) + 1.5)
    ax.spines["top"].set_visible(False)
    ax.spines["right"].set_visible(False)
    ax.tick_params(axis="x", rotation=20)
    ax.yaxis.grid(True, alpha=0.3)
    ax.set_axisbelow(True)

    path = OUT / "T2_contract_distribution.png"
    fig.tight_layout()
    fig.savefig(path, dpi=180, bbox_inches="tight")
    plt.close(fig)
    return path


if __name__ == "__main__":
    for fn in (fig_t1_pyramid, fig_t2_contract_distribution):
        out = fn()
        print(f"wrote {out}")
