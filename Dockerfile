# ============================================================
# IoT 区块链数据存证系统 - Docker 多阶段构建
# 服务: Hardhat(5145) + Flask(5141) + Nginx(5140)
# ============================================================

# ---------- Stage 1: 构建前端静态文件 ----------
FROM docker.1ms.run/node:20-alpine AS frontend-builder
WORKDIR /app/frontend
RUN npm config set registry https://registry.npmmirror.com
COPY frontend/package.json frontend/package-lock.json* ./
RUN npm install
COPY frontend/ ./
RUN npm run build

# ---------- Stage 2: 编译智能合约 ----------
FROM docker.1ms.run/node:20-alpine AS blockchain-builder
WORKDIR /app/blockchain
RUN npm config set registry https://registry.npmmirror.com
COPY blockchain/package.json blockchain/package-lock.json* ./
RUN npm install
COPY blockchain/ ./
RUN npx hardhat compile

# ---------- Stage 3: 运行时 ----------
FROM docker.1ms.run/node:20-slim

# 使用阿里云 Debian 镜像源
RUN sed -i 's|deb.debian.org|mirrors.aliyun.com|g' /etc/apt/sources.list.d/debian.sources 2>/dev/null; \
    sed -i 's|deb.debian.org|mirrors.aliyun.com|g' /etc/apt/sources.list 2>/dev/null; \
    true

# 安装 Python、nginx、supervisord
RUN apt-get update && \
    apt-get install -y --no-install-recommends --fix-missing \
    python3 python3-pip python3-venv \
    nginx \
    supervisor \
    curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# -- 区块链层 --
COPY blockchain/package.json blockchain/package-lock.json* blockchain/
COPY blockchain/hardhat.config.js blockchain/
COPY blockchain/contracts/ blockchain/contracts/
COPY blockchain/scripts/ blockchain/scripts/
COPY --from=blockchain-builder /app/blockchain/node_modules/ blockchain/node_modules/
COPY --from=blockchain-builder /app/blockchain/artifacts/ blockchain/artifacts/
COPY --from=blockchain-builder /app/blockchain/cache/ blockchain/cache/

# -- 后端 --
COPY backend/ backend/
RUN cd backend && \
    python3 -m venv venv && \
    venv/bin/pip install --no-cache-dir -i https://pypi.tuna.tsinghua.edu.cn/simple -r requirements.txt
RUN mkdir -p backend/uploads

# -- 前端静态文件 --
COPY --from=frontend-builder /app/frontend/dist/ frontend/dist/

# -- Nginx 配置 --
RUN rm -f /etc/nginx/sites-enabled/default
COPY nginx.conf /etc/nginx/conf.d/default.conf

# -- Supervisord 配置 --
COPY supervisord.conf /etc/supervisor/conf.d/supervisord.conf

# -- 启动入口脚本 --
COPY docker-entrypoint.sh /app/docker-entrypoint.sh
RUN chmod +x /app/docker-entrypoint.sh

EXPOSE 5140

HEALTHCHECK --interval=10s --timeout=5s --start-period=30s --retries=3 \
    CMD curl -f http://localhost:5141/api/health || exit 1

CMD ["/app/docker-entrypoint.sh"]
