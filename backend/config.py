import os

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# Flask
FLASK_HOST = "0.0.0.0"
FLASK_PORT = 5141
FLASK_DEBUG = True

# Ganache / 以太坊网络
GANACHE_URL = "http://127.0.0.1:5145"
# 部署后由 deploy 脚本自动填入
CONTRACT_ADDRESS = ""
# Ganache 默认第一个账户（管理员）
ADMIN_PRIVATE_KEY = ""
ADMIN_ADDRESS = ""

# 合约 ABI 文件路径
CONTRACT_ABI_PATH = os.path.join(BASE_DIR, "contract_abi.json")

# 部署配置文件路径（由 Hardhat deploy 脚本生成）
DEPLOYED_CONFIG_PATH = os.path.join(BASE_DIR, "..", "blockchain", "deployed-config.json")

# IPFS
IPFS_API_URL = "/ip4/127.0.0.1/tcp/5146/http"
# 当 IPFS 不可用时使用本地文件模拟
USE_LOCAL_STORAGE_FALLBACK = True
LOCAL_STORAGE_DIR = os.path.join(BASE_DIR, "uploads")

# 上传文件大小限制 (16MB)
MAX_CONTENT_LENGTH = 16 * 1024 * 1024
