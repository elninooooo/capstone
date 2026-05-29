# IoT 区块链数据安全存证系统

基于以太坊智能合约和 IPFS 的物联网数据安全存储与验证平台。该系统通过将数据存储与验证解耦，解决了区块链存储成本高、速度慢的问题，实现了 IoT 设备数据的可信存证与完整性校验。

## 系统架构

```
┌──────────────────────────────────────────────────────────────────┐
│                        前端 (React + Ant Design)                  │
│                     http://localhost:5140                         │
│  ┌──────────────┐  ┌──────────────┐  ┌────────────────────────┐  │
│  │   设备管理    │  │   数据记录    │  │   权限管理 / 完整性校验  │  │
│  └──────────────┘  └──────────────┘  └────────────────────────┘  │
└──────────────────────────┬───────────────────────────────────────┘
                           │ HTTP API
┌──────────────────────────▼───────────────────────────────────────┐
│                     后端 (Flask + Web3.py)                        │
│                     http://localhost:5141                         │
│  ┌──────────────┐  ┌──────────────┐  ┌────────────────────────┐  │
│  │  设备注册 API │  │  数据上传 API │  │  校验 / 权限 / 下载 API │  │
│  └──────┬───────┘  └──────┬───────┘  └───────────┬────────────┘  │
└─────────┼─────────────────┼──────────────────────┼───────────────┘
          │                 │                      │
    ┌─────▼─────┐     ┌────▼─────┐          ┌─────▼─────┐
    │ Ethereum  │     │  IPFS /  │          │ 链上验证   │
    │ 智能合约   │     │ 本地存储  │          │ 哈希对比   │
    │ (Hardhat) │     │          │          │           │
    └───────────┘     └──────────┘          └───────────┘
    端口: 5145
```

### 四层架构

| 层级 | 技术栈 | 职责 |
|------|--------|------|
| **数据层 (IPFS)** | IPFS / 本地文件存储 | 存储 IoT 原始数据文件，基于内容寻址生成唯一哈希 |
| **逻辑层 (Smart Contract)** | Solidity + Hardhat | 权限管理、元数据存储，只存 IPFS 哈希值 |
| **控制层 (Backend)** | Python Flask + Web3.py | 协调 IoT 设备、IPFS、区块链之间的通信 |
| **表现层 (Frontend)** | React + Vite + Ant Design | 数据可视化仪表盘，数据校验交互界面 |

## 核心工作流程

1. **数据采集与上传**: IoT 设备（Python 模拟器）读取传感器数据 → 上传到 IPFS → 获取 Content Hash
2. **链上存证**: 后端通过 Web3.py 调用智能合约 → 将 Hash_ID、设备 ID、时间戳永久记录在区块链上
3. **安全访问控制**: 用户请求数据时，合约先检查访问权限 → 验证通过后从 IPFS 下载原始数据
4. **完整性校验**: 系统重新计算下载文件的哈希 → 与链上记录对比 → 一致则证明数据未被篡改

## 项目结构

```
.
├── blockchain/                 # 区块链层
│   ├── contracts/
│   │   └── IoTDataStorage.sol  # 智能合约
│   ├── scripts/
│   │   └── deploy.js           # 部署脚本
│   ├── test/
│   │   └── IoTDataStorage.test.js  # 合约单元测试
│   ├── hardhat.config.js       # Hardhat 配置
│   └── package.json
├── backend/                    # Python 后端
│   ├── app.py                  # Flask API 入口
│   ├── blockchain_client.py    # Web3 合约交互封装
│   ├── ipfs_client.py          # IPFS / 本地存储客户端
│   ├── config.py               # 配置文件
│   ├── contract_abi.json       # 合约 ABI
│   ├── requirements.txt        # Python 依赖
│   └── uploads/                # 本地文件存储目录
├── frontend/                   # React 前端
│   ├── src/
│   │   ├── App.jsx             # 主布局与路由
│   │   ├── pages/
│   │   │   ├── DeviceList.jsx      # 设备列表页
│   │   │   ├── DeviceRecords.jsx   # 数据记录页
│   │   │   └── AccessManagement.jsx # 权限管理页
│   │   └── services/
│   │       └── api.js          # Axios API 封装
│   ├── vite.config.js          # Vite 配置
│   └── package.json
├── simulator/                  # IoT 数据模拟器
│   ├── iot_simulator.py        # 模拟器脚本
│   └── data/
│       └── iot_sensor_data.csv # 模拟传感器数据集
├── install.sh                  # 依赖安装脚本
├── start.sh                    # 一键启动脚本
├── stop.sh                     # 停止服务脚本
└── README.md
```

## 环境要求

- **Node.js** >= 18.0
- **Python** >= 3.9
- **npm** / **pnpm** (推荐 pnpm)
- **pip3**

## 快速开始

### 1. 安装依赖

```bash
chmod +x install.sh start.sh stop.sh
./install.sh
```

该脚本会自动：
- 安装区块链层 Node.js 依赖（Hardhat + 工具包）
- 安装前端 Node.js 依赖（React + Vite + Ant Design）
- 创建 Python 虚拟环境并安装后端依赖（Flask + Web3.py）

### 2. 一键启动

```bash
./start.sh
```

启动顺序：
1. 启动 Hardhat 本地以太坊节点（端口 5145）
2. 编译并部署智能合约
3. 启动 Flask 后端 API（端口 5141）
4. 启动 Vite 前端开发服务器（端口 5140）

启动成功后访问 **http://localhost:5140** 即可使用系统。

### 3. 模拟 IoT 数据上传

```bash
cd backend
source venv/bin/activate
cd ../simulator
python3 iot_simulator.py --csv data/iot_sensor_data.csv
```

模拟器会自动：
- 读取 CSV 传感器数据集
- 按设备 ID 分组，自动注册设备
- 逐批将数据上传到 IPFS 并在链上存证

### 4. 停止服务

```bash
./stop.sh
```

## 端口分配

| 服务 | 端口 | 说明 |
|------|------|------|
| Vite 前端 | 5140 | React 开发服务器 |
| Flask 后端 | 5141 | REST API 服务 |
| Hardhat Node | 5145 | 本地以太坊节点 (chainId: 31337) |

## API 接口文档

### 健康检查
- `GET /api/health` — 系统状态与区块链连接状态

### 设备管理
- `GET /api/devices` — 获取所有已注册设备
- `POST /api/devices` — 注册新设备 `{ deviceId, deviceName, deviceType }`
- `GET /api/devices/:id` — 获取单个设备信息

### 数据操作
- `POST /api/upload` — 上传数据文件 (multipart: deviceId + file)
- `GET /api/records?deviceId=X` — 查询设备数据记录
- `GET /api/records/:deviceId/:index` — 获取指定记录
- `GET /api/download?hash=X` — 根据 IPFS Hash 下载文件

### 完整性校验
- `POST /api/verify` — 数据完整性校验 `{ deviceId, ipfsHash }`
  - 返回: chainIpfsHash、localIpfsHash、hashMatch、localSha256、fileSize

### 权限管理
- `POST /api/access/grant` — 授权用户 `{ userAddress, deviceId }`
- `POST /api/access/revoke` — 撤销权限 `{ userAddress, deviceId }`
- `GET /api/access/check?userAddress=X&deviceId=Y` — 检查权限

### 区块链
- `GET /api/blockchain/accounts` — 获取 Ganache 账户列表

## 智能合约

合约 `IoTDataStorage.sol` 部署在 Hardhat 本地网络，主要功能：

- **设备注册**: 管理员注册 IoT 设备，记录设备名称、类型、所有者
- **数据存证**: 将 IPFS 哈希与设备 ID、时间戳、区块号关联存储
- **访问控制**: 基于地址的细粒度权限管理（授权/撤销/检查）
- **数据验证**: 链上查询 IPFS 哈希是否存在，验证数据完整性
- **管理员转移**: 支持合约管理员权限转移

运行合约测试：
```bash
cd blockchain
npx hardhat test
```

## 日志文件

启动后日志保存在 `logs/` 目录：
- `logs/hardhat.log` — Hardhat 节点日志
- `logs/backend.log` — Flask 后端日志
- `logs/frontend.log` — Vite 前端日志

## 技术栈

| 组件 | 技术 | 版本 |
|------|------|------|
| 智能合约 | Solidity | 0.8.20 |
| 合约框架 | Hardhat | ^2.28.6 |
| 后端 | Flask | ^3.0.0 |
| 区块链交互 | Web3.py | ^7.0.0 |
| 前端框架 | React | ^19.2.4 |
| UI 组件库 | Ant Design | ^6.3.3 |
| 构建工具 | Vite | ^8.0.0 |
| 路由 | React Router | ^7.13.1 |
