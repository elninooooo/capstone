"""Generate the layered system architecture figure for Chapter 3.

Output: ../figures_testing/system_architecture.png
"""

from pathlib import Path

import matplotlib.pyplot as plt
from matplotlib.patches import FancyArrowPatch, FancyBboxPatch

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "figures_testing"
OUT.mkdir(exist_ok=True)


def _box(ax, x, y, w, h, title, lines, *, fill, edge, title_color="white"):
    box = FancyBboxPatch(
        (x, y), w, h,
        boxstyle="round,pad=0.02,rounding_size=0.12",
        linewidth=1.4, edgecolor=edge, facecolor=fill,
    )
    ax.add_patch(box)
    title_h = 0.45
    title_box = FancyBboxPatch(
        (x, y + h - title_h), w, title_h,
        boxstyle="round,pad=0.02,rounding_size=0.12",
        linewidth=0, facecolor=edge,
    )
    ax.add_patch(title_box)
    ax.text(x + w / 2, y + h - title_h / 2, title,
            ha="center", va="center", color=title_color,
            fontsize=10.5, fontweight="bold")
    body = "\n".join(lines)
    ax.text(x + w / 2, y + (h - title_h) / 2,
            body, ha="center", va="center",
            color="#222", fontsize=9)


def _arrow(ax, p1, p2, label=None, *, color="#444", style="-|>", offset=(0, 0)):
    arr = FancyArrowPatch(
        p1, p2, arrowstyle=style, mutation_scale=14,
        color=color, linewidth=1.4,
    )
    ax.add_patch(arr)
    if label:
        mx = (p1[0] + p2[0]) / 2 + offset[0]
        my = (p1[1] + p2[1]) / 2 + offset[1]
        ax.text(mx, my, label, ha="center", va="center", fontsize=8.5,
                color=color,
                bbox=dict(facecolor="white", edgecolor="none", pad=1.2))


def _layer_band(ax, y, h, label, color):
    ax.add_patch(plt.Rectangle((0.05, y), 14.9, h,
                               facecolor=color, edgecolor="none", alpha=0.18))
    ax.text(0.25, y + h / 2, label, ha="left", va="center",
            fontsize=10, fontweight="bold", color="#333", rotation=90)


def fig_system_architecture() -> Path:
    fig, ax = plt.subplots(figsize=(13, 10))
    ax.set_xlim(0, 15)
    ax.set_ylim(0, 12)
    ax.axis("off")

    # ---------- background layer bands ----------
    _layer_band(ax, 9.4, 1.9, "Presentation",          "#4C78A8")
    _layer_band(ax, 5.4, 3.6, "Application / Backend", "#54A24B")
    _layer_band(ax, 0.5, 4.6, "Data / Trust",          "#E45756")

    # ---------- presentation layer (top) ----------
    _box(ax, 1.5, 9.6, 5.5, 1.55,
         "React Frontend Dashboard  (port 5140)",
         ["DeviceList  ·  DeviceRecords  ·  Verification Modal",
          "AccessManagement  ·  UserManual",
          "React 19 + Ant Design + Vite + Axios"],
         fill="#EAF2FA", edge="#4C78A8")

    _box(ax, 8.5, 9.6, 5.0, 1.55,
         "IoT Simulator  (Python CLI)",
         ["iot_simulator.py  ·  CSV ingestion",
          "device registration + batch upload",
          "default batch size = 4 records"],
         fill="#EAF2FA", edge="#4C78A8")

    # ---------- backend layer (middle) ----------
    # Flask API thin band on top
    _box(ax, 1.5, 7.7, 12.0, 1.05,
         "Flask Backend API Layer  (port 5141)",
         ["13 REST endpoints  ·  device  /  upload  /  records  /  verify  /  access",
          "Flask-CORS  ·  request validation  ·  HTTP semantic status codes"],
         fill="#EEF7EC", edge="#54A24B")

    # Two client sub-modules beneath it
    _box(ax, 1.5, 5.7, 5.5, 1.6,
         "Blockchain Client",
         ["blockchain_client.py",
          "JSON-backed simulation of on-chain state",
          "threading.Lock for atomic R-M-W",
          "fake tx hash = SHA-256(block + ts)"],
         fill="#FFFFFF", edge="#54A24B")

    _box(ax, 8.0, 5.7, 5.5, 1.6,
         "IPFS Client",
         ["ipfs_client.py",
          "dual-mode: real IPFS daemon / local FS",
          "SHA-256 + Qm-prefixed 46-char CID",
          "uploads/ + meta.json index"],
         fill="#FFFFFF", edge="#54A24B")

    # ---------- data / trust layer (bottom) ----------
    _box(ax, 0.6, 1.0, 6.5, 4.0,
         "On-Chain Layer  ·  Hardhat (port 5145)",
         ["Solidity 0.8.20  ·  IoTDataStorage.sol",
          "",
          "Device Registry        ·  Data Attestation",
          "Hash Verification    ·  Role-Based Access Control",
          "",
          "events: DeviceRegistered / DataStored",
          "             AccessGranted / AccessRevoked"],
         fill="#FCEDED", edge="#E45756")

    _box(ax, 7.9, 1.0, 6.5, 4.0,
         "Off-Chain Storage Layer  (port 5146)",
         ["IPFS daemon  ·  fallback to local FS",
          "",
          "uploads/  ·  meta.json index",
          "content-addressable identifiers (CIDs)",
          "",
          "deduplication + tamper detection",
          "via SHA-256 collision resistance"],
         fill="#FCEDED", edge="#E45756")

    # ---------- arrows ----------
    # Presentation -> Flask
    _arrow(ax, (4.25, 9.6), (4.25, 8.75),
           label="HTTP / JSON  (Axios)", offset=(0, 0.0))
    _arrow(ax, (11.0, 9.6), (11.0, 8.75),
           label="HTTP multipart  (requests)", offset=(0, 0.0))

    # Flask -> Clients (within backend layer)
    _arrow(ax, (4.25, 7.7), (4.25, 7.3), color="#54A24B")
    _arrow(ax, (10.75, 7.7), (10.75, 7.3), color="#54A24B")

    # Clients -> Data layer
    _arrow(ax, (4.25, 5.7), (3.85, 5.0),
           label="Web3.py /\nJSON state", offset=(-0.85, 0.0),
           style="<|-|>")
    _arrow(ax, (10.75, 5.7), (11.15, 5.0),
           label="HTTP /\nfile API", offset=(0.85, 0.0),
           style="<|-|>")

    # On-chain <-> Off-chain coupling
    _arrow(ax, (7.1, 1.5), (7.9, 1.5),
           label="hash-based attestation  ·  CID stored on-chain",
           offset=(0, -0.3), style="<|-|>", color="#666")

    # ---------- title ----------
    ax.text(7.5, 11.65,
            "Figure 2: System Architecture of the Traffic-Optimised IoT Data Sharing Framework",
            ha="center", va="center", fontsize=13, fontweight="bold")

    path = OUT / "system_architecture.png"
    fig.tight_layout()
    fig.savefig(path, dpi=180, bbox_inches="tight")
    plt.close(fig)
    return path


if __name__ == "__main__":
    out = fig_system_architecture()
    print(f"wrote {out}")
