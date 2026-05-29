#!/bin/bash
# ============================================================
# IoT 区块链数据存证系统 - 一键启动脚本
# 启动顺序: Hardhat 本地链 → 部署合约 → Flask 后端 → Vite 前端
# ============================================================

set -e

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
LOG_DIR="$ROOT_DIR/logs"
PID_DIR="$ROOT_DIR/pids"

mkdir -p "$LOG_DIR" "$PID_DIR"

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
CYAN='\033[0;36m'
NC='\033[0m'

info()  { echo -e "${GREEN}[INFO]${NC} $1"; }
warn()  { echo -e "${YELLOW}[WARN]${NC} $1"; }
error() { echo -e "${RED}[ERROR]${NC} $1"; }
step()  { echo -e "${CYAN}[STEP]${NC} $1"; }

# 检查端口是否被占用
check_port() {
    local port=$1
    local name=$2
    if lsof -i :"$port" -sTCP:LISTEN &>/dev/null; then
        warn "端口 $port ($name) 已被占用，先执行 ./stop.sh 停止旧服务"
        return 1
    fi
    return 0
}

# 等待端口就绪
wait_for_port() {
    local port=$1
    local name=$2
    local max_wait=${3:-30}
    local waited=0

    while ! lsof -i :"$port" -sTCP:LISTEN &>/dev/null; do
        sleep 1
        waited=$((waited + 1))
        if [ $waited -ge $max_wait ]; then
            error "$name 在 $max_wait 秒内未启动（端口 $port）"
            return 1
        fi
    done
    info "$name 已就绪 (端口 $port, 等待 ${waited}s)"
    return 0
}

echo "============================================================"
echo "  IoT 区块链数据存证系统 - 一键启动"
echo "============================================================"
echo ""
echo "  端口分配:"
echo "    Hardhat 本地链 .... 5145"
echo "    Flask 后端 API .... 5141"
echo "    Vite 前端 ......... 5140"
echo ""

# ---------- 预检查 ----------
for port_info in "5145:Hardhat" "5141:Flask" "5140:Vite"; do
    port="${port_info%%:*}"
    name="${port_info##*:}"
    if ! check_port "$port" "$name"; then
        error "请先运行 ./stop.sh 停止旧服务，或手动释放端口 $port"
        exit 1
    fi
done

# 优先使用 pnpm
if command -v pnpm &> /dev/null; then
    PKG_MGR="pnpm"
else
    PKG_MGR="npm"
fi

# ========== STEP 1: 启动 Hardhat 本地链 ==========
step "[1/4] 启动 Hardhat 本地链 (端口 5145)..."
cd "$ROOT_DIR/blockchain"
npx hardhat node --port 5145 > "$LOG_DIR/hardhat.log" 2>&1 &
HARDHAT_PID=$!
echo "$HARDHAT_PID" > "$PID_DIR/hardhat.pid"

wait_for_port 5145 "Hardhat Node" 30
if [ $? -ne 0 ]; then
    error "Hardhat Node 启动失败，请查看日志: $LOG_DIR/hardhat.log"
    exit 1
fi

echo ""

# ========== STEP 2: 编译并部署智能合约 ==========
step "[2/4] 编译并部署智能合约..."
cd "$ROOT_DIR/blockchain"

info "编译合约..."
npx hardhat compile >> "$LOG_DIR/hardhat.log" 2>&1

info "部署合约到本地链..."
npx hardhat run scripts/deploy.js --network ganache >> "$LOG_DIR/hardhat.log" 2>&1

# 读取部署后的合约地址
if [ -f "$ROOT_DIR/blockchain/deployed-config.json" ]; then
    CONTRACT_ADDR=$(python3 -c "import json; print(json.load(open('$ROOT_DIR/blockchain/deployed-config.json'))['contractAddress'])")
    info "合约地址: $CONTRACT_ADDR"
else
    error "合约部署配置未生成"
    exit 1
fi

# 将 ABI 复制到后端目录
ABI_SOURCE="$ROOT_DIR/blockchain/artifacts/contracts/IoTDataStorage.sol/IoTDataStorage.json"
ABI_TARGET="$ROOT_DIR/backend/contract_abi.json"
if [ -f "$ABI_SOURCE" ]; then
    python3 -c "
import json
with open('$ABI_SOURCE') as f:
    data = json.load(f)
with open('$ABI_TARGET', 'w') as f:
    json.dump(data['abi'], f, indent=2)
"
    info "合约 ABI 已复制到后端"
fi

echo ""

# ========== STEP 3: 启动 Flask 后端 ==========
step "[3/4] 启动 Flask 后端 (端口 5141)..."
cd "$ROOT_DIR/backend"

# 激活虚拟环境（如果存在）
if [ -f "venv/bin/activate" ]; then
    source venv/bin/activate
fi

python3 app.py > "$LOG_DIR/backend.log" 2>&1 &
BACKEND_PID=$!
echo "$BACKEND_PID" > "$PID_DIR/backend.pid"

# 退出虚拟环境
if [ -n "$VIRTUAL_ENV" ]; then
    deactivate
fi

wait_for_port 5141 "Flask Backend" 15
if [ $? -ne 0 ]; then
    error "Flask 后端启动失败，请查看日志: $LOG_DIR/backend.log"
    exit 1
fi

echo ""

# ========== STEP 4: 启动 Vite 前端 ==========
step "[4/4] 启动 Vite 前端开发服务器 (端口 5140)..."
cd "$ROOT_DIR/frontend"
npx vite --port 5140 > "$LOG_DIR/frontend.log" 2>&1 &
FRONTEND_PID=$!
echo "$FRONTEND_PID" > "$PID_DIR/frontend.pid"

wait_for_port 5140 "Vite Frontend" 20
if [ $? -ne 0 ]; then
    error "前端服务启动失败，请查看日志: $LOG_DIR/frontend.log"
    exit 1
fi

echo ""

# ========== 启动完成 ==========
echo "============================================================"
echo -e "${GREEN}  系统启动成功！${NC}"
echo ""
echo "  访问地址:"
echo -e "    前端界面:  ${CYAN}http://localhost:5140${NC}"
echo -e "    后端 API:  ${CYAN}http://localhost:5141/api/health${NC}"
echo -e "    本地区块链: ${CYAN}http://localhost:5145${NC}"
echo ""
echo "  进程 PID:"
echo "    Hardhat:  $HARDHAT_PID"
echo "    Backend:  $BACKEND_PID"
echo "    Frontend: $FRONTEND_PID"
echo ""
echo "  日志文件:"
echo "    $LOG_DIR/hardhat.log"
echo "    $LOG_DIR/backend.log"
echo "    $LOG_DIR/frontend.log"
echo ""
echo "  停止服务: ./stop.sh"
echo "============================================================"
