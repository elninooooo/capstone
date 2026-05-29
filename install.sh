#!/bin/bash
# ============================================================
# IoT 区块链数据存证系统 - 依赖安装脚本
# ============================================================

set -e

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

info()  { echo -e "${GREEN}[INFO]${NC} $1"; }
warn()  { echo -e "${YELLOW}[WARN]${NC} $1"; }
error() { echo -e "${RED}[ERROR]${NC} $1"; }

echo "============================================================"
echo "  IoT 区块链数据存证系统 - 依赖安装"
echo "============================================================"
echo ""

# ---------- 检查基础工具 ----------
check_command() {
    if ! command -v "$1" &> /dev/null; then
        error "$1 未安装，请先安装 $1"
        exit 1
    fi
}

info "检查基础工具..."
check_command node
check_command npm
check_command python3
check_command pip3

NODE_VER=$(node -v)
PY_VER=$(python3 --version)
info "Node.js: $NODE_VER"
info "Python: $PY_VER"

# 优先使用 pnpm，没有则用 npm
if command -v pnpm &> /dev/null; then
    PKG_MGR="pnpm"
else
    PKG_MGR="npm"
    warn "未检测到 pnpm，将使用 npm 安装"
fi
info "包管理器: $PKG_MGR"

echo ""

# ---------- 1. 区块链层依赖 ----------
info "========== [1/3] 安装区块链层依赖 =========="
cd "$ROOT_DIR/blockchain"
NODE_ENV=development $PKG_MGR install
info "区块链层依赖安装完成"

echo ""

# ---------- 2. 前端依赖 ----------
info "========== [2/3] 安装前端依赖 =========="
cd "$ROOT_DIR/frontend"
NODE_ENV=development $PKG_MGR install
info "前端依赖安装完成"

echo ""

# ---------- 3. 后端 Python 依赖 ----------
info "========== [3/3] 安装后端 Python 依赖 =========="
cd "$ROOT_DIR/backend"

# 创建虚拟环境（如果不存在）
if [ ! -d "venv" ]; then
    info "创建 Python 虚拟环境..."
    python3 -m venv venv
fi

# 激活虚拟环境并安装依赖
source venv/bin/activate
pip install -r requirements.txt
deactivate

info "后端 Python 依赖安装完成"

echo ""

# ---------- 创建必要目录 ----------
mkdir -p "$ROOT_DIR/backend/uploads"
mkdir -p "$ROOT_DIR/logs"

echo ""
echo "============================================================"
info "所有依赖安装完成！"
echo ""
echo "  下一步: 运行 ./start.sh 启动系统"
echo "============================================================"
