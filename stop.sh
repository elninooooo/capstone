#!/bin/bash
# ============================================================
# IoT 区块链数据存证系统 - 停止所有服务
# ============================================================

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
PID_DIR="$ROOT_DIR/pids"

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

info()  { echo -e "${GREEN}[INFO]${NC} $1"; }
warn()  { echo -e "${YELLOW}[WARN]${NC} $1"; }

echo "============================================================"
echo "  IoT 区块链数据存证系统 - 停止服务"
echo "============================================================"
echo ""

stop_service() {
    local name=$1
    local pid_file="$PID_DIR/$2.pid"
    local port=$3

    if [ -f "$pid_file" ]; then
        local pid=$(cat "$pid_file")
        if kill -0 "$pid" 2>/dev/null; then
            kill "$pid" 2>/dev/null
            sleep 1
            # 如果还没停掉，强制终止
            if kill -0 "$pid" 2>/dev/null; then
                kill -9 "$pid" 2>/dev/null
            fi
            info "$name (PID: $pid) 已停止"
        else
            warn "$name (PID: $pid) 进程已不存在"
        fi
        rm -f "$pid_file"
    else
        # 尝试通过端口查找并停止
        if [ -n "$port" ]; then
            local pid=$(lsof -ti :"$port" -sTCP:LISTEN 2>/dev/null)
            if [ -n "$pid" ]; then
                kill $pid 2>/dev/null
                sleep 1
                kill -9 $pid 2>/dev/null 2>&1
                info "$name (端口 $port, PID: $pid) 已停止"
            else
                info "$name 未在运行"
            fi
        else
            info "$name 未在运行"
        fi
    fi
}

# 按照反向顺序停止：前端 → 后端 → 区块链
stop_service "Vite 前端"       "frontend"  5140
stop_service "Flask 后端"      "backend"   5141
stop_service "Hardhat 本地链"  "hardhat"   5145

echo ""
info "所有服务已停止"
echo "============================================================"
