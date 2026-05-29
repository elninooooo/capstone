#!/bin/bash
set -e

echo "============================================================"
echo "  IoT 区块链数据存证系统 - Docker 启动"
echo "============================================================"

mkdir -p /var/log/supervisor /app/backend/uploads

# Step 1: 启动 Hardhat 本地链
echo "[1/4] 启动 Hardhat 本地链 (端口 5145)..."
cd /app/blockchain
npx hardhat node --port 5145 &
HARDHAT_PID=$!

# 等待 Hardhat 就绪
for i in $(seq 1 30); do
    if curl -s -o /dev/null http://127.0.0.1:5145; then
        echo "  Hardhat Node 已就绪 (等待 ${i}s)"
        break
    fi
    sleep 1
done

# Step 2: 部署智能合约
echo "[2/4] 部署智能合约..."
cd /app/blockchain
npx hardhat compile 2>/dev/null || true
npx hardhat run scripts/deploy.js --network ganache

# 提取 ABI 到后端
if [ -f /app/blockchain/artifacts/contracts/IoTDataStorage.sol/IoTDataStorage.json ]; then
    python3 -c "
import json
with open('/app/blockchain/artifacts/contracts/IoTDataStorage.sol/IoTDataStorage.json') as f:
    data = json.load(f)
with open('/app/backend/contract_abi.json', 'w') as f:
    json.dump(data['abi'], f, indent=2)
"
    echo "  合约 ABI 已复制到后端"
fi

# Step 3: 启动 Flask 后端
echo "[3/4] 启动 Flask 后端 (端口 5141)..."
cd /app/backend
/app/backend/venv/bin/python3 app.py &
FLASK_PID=$!

# 等待 Flask 就绪
for i in $(seq 1 15); do
    if curl -s -o /dev/null http://127.0.0.1:5141/api/health; then
        echo "  Flask 后端已就绪 (等待 ${i}s)"
        break
    fi
    sleep 1
done

# Step 4: 启动 Nginx
echo "[4/4] 启动 Nginx (端口 5140)..."
echo ""
echo "============================================================"
echo "  系统启动完成!"
echo "  前端界面: http://localhost:5140"
echo "  后端 API: http://localhost:5141/api/health"
echo "============================================================"

# 前台运行 Nginx，保持容器存活
exec nginx -g "daemon off;"
