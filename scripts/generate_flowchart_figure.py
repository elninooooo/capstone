"""Generate the two-workflow system flowchart figure for Chapter 3.

Workflow A: Data Upload and Registration (IoT simulator -> on-chain attestation).
Workflow B: Data Retrieval and Verification (user -> RBAC + hash match).

Output: ../figures_testing/system_flowchart.png
"""

from pathlib import Path

import matplotlib.pyplot as plt
from matplotlib.patches import FancyArrowPatch, FancyBboxPatch, Polygon

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "figures_testing"
OUT.mkdir(exist_ok=True)


# ---- shape helpers ----------------------------------------------------------

def _terminator(ax, x, y, w, h, text, *, fill, edge):
    box = FancyBboxPatch(
        (x, y), w, h,
        boxstyle="round,pad=0.02,rounding_size=0.45",
        linewidth=1.4, edgecolor=edge, facecolor=fill,
    )
    ax.add_patch(box)
    ax.text(x + w / 2, y + h / 2, text, ha="center", va="center",
            fontsize=10, fontweight="bold", color="#222")


def _process(ax, x, y, w, h, lines, *, fill, edge):
    box = FancyBboxPatch(
        (x, y), w, h,
        boxstyle="round,pad=0.02,rounding_size=0.12",
        linewidth=1.3, edgecolor=edge, facecolor=fill,
    )
    ax.add_patch(box)
    text = "\n".join(lines) if isinstance(lines, list) else lines
    ax.text(x + w / 2, y + h / 2, text, ha="center", va="center",
            fontsize=9.2, color="#222")


def _decision(ax, cx, cy, w, h, text, *, fill, edge):
    pts = [(cx, cy + h / 2), (cx + w / 2, cy), (cx, cy - h / 2), (cx - w / 2, cy)]
    ax.add_patch(Polygon(pts, closed=True, facecolor=fill, edgecolor=edge, linewidth=1.3))
    ax.text(cx, cy, text, ha="center", va="center", fontsize=9, fontweight="bold", color="#222")


def _arrow(ax, p1, p2, label=None, *, color="#444", style="-|>", offset=(0, 0)):
    arr = FancyArrowPatch(
        p1, p2, arrowstyle=style, mutation_scale=13,
        color=color, linewidth=1.2,
    )
    ax.add_patch(arr)
    if label:
        mx = (p1[0] + p2[0]) / 2 + offset[0]
        my = (p1[1] + p2[1]) / 2 + offset[1]
        ax.text(mx, my, label, ha="center", va="center", fontsize=8.5,
                color=color,
                bbox=dict(facecolor="white", edgecolor="none", pad=1.2))


# ---- the figure -------------------------------------------------------------

def fig_system_flowchart() -> Path:
    fig, ax = plt.subplots(figsize=(15, 12))
    ax.set_xlim(0, 17.5)
    ax.set_ylim(0, 14)
    ax.axis("off")

    # Title
    ax.text(8.75, 13.5,
            "Figure 3: System Flowchart — Data Upload (Workflow A) and "
            "Data Retrieval & Verification (Workflow B)",
            ha="center", va="center", fontsize=12.5, fontweight="bold")

    # Column headers
    ax.text(3.6, 12.7, "Workflow A — Data Upload and Registration",
            ha="center", va="center", fontsize=11.5, fontweight="bold", color="#2A6FB0")
    ax.text(12.0, 12.7, "Workflow B — Data Retrieval and Verification",
            ha="center", va="center", fontsize=11.5, fontweight="bold", color="#B53B3B")

    # =====================================================================
    # Workflow A (left column)
    # =====================================================================
    A_X = 1.2
    A_W = 4.8
    BLUE_FILL, BLUE_EDGE = "#EAF2FA", "#4C78A8"

    _terminator(ax, A_X, 11.6, A_W, 0.7, "START — IoT Simulator / Admin",
                fill=BLUE_EDGE, edge=BLUE_EDGE)

    nodes_a = [
        (10.4, ["Read CSV; group records by deviceId",
                "(default batch size = 4 records)"]),
        (9.2,  ["POST /api/upload  (deviceId, file)",
                "Frontend Axios  /  IoT simulator requests"]),
        (8.0,  ["Flask backend: save file to temp,",
                "compute SHA-256 checksum"]),
        (6.8,  ["IPFS Client: store file off-chain,",
                "return Qm-prefixed CID"]),
        (5.6,  ["Blockchain Client: store_data(deviceId, CID)",
                "writes DataRecord into chain_data.json"]),
        (4.4,  ["Smart contract logic: append record array,",
                "increment block_number, emit DataStored"]),
        (3.2,  ["HTTP 201 response with",
                "{CID, sha256, tx_hash, block_number}"]),
        (2.0,  ["Frontend refreshes DeviceRecords view;",
                "new row appears with CID + block #"]),
    ]
    for y, lines in nodes_a:
        _process(ax, A_X, y, A_W, 0.95, lines, fill=BLUE_FILL, edge=BLUE_EDGE)

    _terminator(ax, A_X, 0.5, A_W, 0.7,
                "END — record attested on chain", fill=BLUE_EDGE, edge=BLUE_EDGE)

    # vertical arrows for workflow A
    a_ys = [11.6, 10.4 + 0.95, 9.2 + 0.95, 8.0 + 0.95, 6.8 + 0.95,
            5.6 + 0.95, 4.4 + 0.95, 3.2 + 0.95, 2.0 + 0.95]
    a_targets = [10.4 + 0.95, 9.2 + 0.95, 8.0 + 0.95, 6.8 + 0.95, 5.6 + 0.95,
                 4.4 + 0.95, 3.2 + 0.95, 2.0 + 0.95, 0.5 + 0.7]
    cx_a = A_X + A_W / 2
    for y_from, y_to in [
        (11.6, 11.35),
        (10.4, 10.15),
        (9.2,  8.95),
        (8.0,  7.75),
        (6.8,  6.55),
        (5.6,  5.35),
        (4.4,  4.15),
        (3.2,  2.95),
        (2.0,  1.2),
    ]:
        _arrow(ax, (cx_a, y_from), (cx_a, y_to))

    # =====================================================================
    # Workflow B (right column)
    # =====================================================================
    B_X = 9.6
    B_W = 4.8
    RED_FILL, RED_EDGE = "#FCEDED", "#E45756"
    OK_FILL, OK_EDGE   = "#EEF7EC", "#54A24B"
    DEC_FILL           = "#FFF6E1"

    _terminator(ax, B_X, 11.6, B_W, 0.7,
                "START — User clicks Verify in DeviceRecords",
                fill=RED_EDGE, edge=RED_EDGE)

    # Node positions chosen to leave space around two diamonds.
    _process(ax, B_X, 10.5, B_W, 0.7,
             "POST /api/verify  (deviceId, ipfsHash)",
             fill=RED_FILL, edge=RED_EDGE)
    _arrow(ax, (B_X + B_W/2, 11.6), (B_X + B_W/2, 11.2))

    # Decision 1 — RBAC
    _decision(ax, B_X + B_W/2, 9.65, 3.6, 1.0,
              "Backend: checkAccess()\nadmin or granted?",
              fill=DEC_FILL, edge=RED_EDGE)
    _arrow(ax, (B_X + B_W/2, 10.5), (B_X + B_W/2, 10.15))

    # Branch: Access denied -> 403
    _process(ax, B_X + B_W + 0.3, 9.3, 2.4, 0.8,
             "403 Forbidden\n→ Access Denied",
             fill="#F4D9D6", edge=RED_EDGE)
    _arrow(ax, (B_X + B_W/2 + 1.8, 9.65), (B_X + B_W + 0.3, 9.7),
           label="No", offset=(0.05, 0.18), color=RED_EDGE)

    # Yes path continues down
    _arrow(ax, (B_X + B_W/2, 9.15), (B_X + B_W/2, 8.55),
           label="Yes", offset=(0.45, -0.1), color=OK_EDGE)

    _process(ax, B_X, 7.85, B_W, 0.7,
             "Blockchain Client: verify_data() finds record",
             fill=RED_FILL, edge=RED_EDGE)

    _process(ax, B_X, 6.85, B_W, 0.7,
             "IPFS Client: get_file(CID) retrieves bytes",
             fill=RED_FILL, edge=RED_EDGE)
    _arrow(ax, (B_X + B_W/2, 7.85), (B_X + B_W/2, 7.55))

    _process(ax, B_X, 5.85, B_W, 0.7,
             "Backend: recompute SHA-256 of fetched bytes",
             fill=RED_FILL, edge=RED_EDGE)
    _arrow(ax, (B_X + B_W/2, 6.85), (B_X + B_W/2, 6.55))

    # Decision 2 — hash match
    _decision(ax, B_X + B_W/2, 4.7, 4.0, 1.1,
              "On-chain hash ==\nrecomputed hash ?",
              fill=DEC_FILL, edge=RED_EDGE)
    _arrow(ax, (B_X + B_W/2, 5.85), (B_X + B_W/2, 5.25))

    # Branch outcomes
    _process(ax, B_X - 1.4, 3.0, 3.4, 0.95,
             ["Integrity Verified",
              "(green check + hashes shown)"],
             fill=OK_FILL, edge=OK_EDGE)
    _process(ax, B_X + B_W - 2.0, 3.0, 3.4, 0.95,
             ["Data Integrity Compromised",
              "(red warning + diff shown)"],
             fill="#F4D9D6", edge=RED_EDGE)

    _arrow(ax, (B_X + B_W/2 - 1.6, 4.45), (B_X - 1.4 + 1.7, 3.95),
           label="Yes", offset=(-0.45, 0.15), color=OK_EDGE)
    _arrow(ax, (B_X + B_W/2 + 1.6, 4.45), (B_X + B_W - 2.0 + 1.7, 3.95),
           label="No", offset=(0.45, 0.15), color=RED_EDGE)

    _terminator(ax, B_X, 1.5, B_W, 0.7,
                "END — verdict displayed in modal",
                fill=RED_EDGE, edge=RED_EDGE)

    _arrow(ax, (B_X - 1.4 + 1.7, 3.0), (B_X + B_W/2 - 0.5, 2.2), color=OK_EDGE)
    _arrow(ax, (B_X + B_W - 2.0 + 1.7, 3.0), (B_X + B_W/2 + 0.5, 2.2), color=RED_EDGE)

    # =====================================================================
    # Cross-workflow loopback annotation
    # =====================================================================
    _arrow(ax, (A_X + A_W, 1.6), (B_X, 1.85),
           label="closed loop:  attested CID becomes verifiable evidence",
           offset=(0, 0.32), color="#666", style="-|>")

    # (legend omitted — shapes are self-evident: rounded box = process,
    # diamond = decision, pill = start/end)

    path = OUT / "system_flowchart.png"
    fig.tight_layout()
    fig.savefig(path, dpi=180, bbox_inches="tight")
    plt.close(fig)
    return path


if __name__ == "__main__":
    out = fig_system_flowchart()
    print(f"wrote {out}")
