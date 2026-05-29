import os
import hashlib
import tempfile
from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
import config

app = Flask(__name__)
app.config["MAX_CONTENT_LENGTH"] = config.MAX_CONTENT_LENGTH
CORS(app)

# 延迟初始化客户端（允许在 Ganache/IPFS 未启动时先启动 Flask）
_blockchain = None
_ipfs = None


def get_blockchain():
    global _blockchain
    if _blockchain is None:
        from blockchain_client import BlockchainClient
        _blockchain = BlockchainClient()
    return _blockchain


def get_ipfs():
    global _ipfs
    if _ipfs is None:
        from ipfs_client import IPFSClient
        _ipfs = IPFSClient()
    return _ipfs


# ========== 健康检查 ==========

@app.route("/api/health", methods=["GET"])
def health():
    bc = get_blockchain()
    return jsonify({
        "status": "ok",
        "blockchain_connected": bc.connected,
        "ganache_url": config.GANACHE_URL,
        "port": config.FLASK_PORT,
    })


# ========== 设备管理 ==========

@app.route("/api/devices", methods=["GET"])
def list_devices():
    """获取所有已注册设备列表"""
    bc = get_blockchain()
    if not bc.connected:
        return jsonify({"error": "Blockchain not connected"}), 503

    try:
        device_ids = bc.get_all_device_ids()
        devices = []
        for did in device_ids:
            info = bc.get_device_info(did)
            info["recordCount"] = bc.get_record_count(did)
            devices.append(info)
        return jsonify({"devices": devices})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/devices", methods=["POST"])
def register_device():
    """注册新设备"""
    bc = get_blockchain()
    if not bc.connected:
        return jsonify({"error": "Blockchain not connected"}), 503

    data = request.get_json()
    if not data:
        return jsonify({"error": "Request body is required"}), 400

    device_id = data.get("deviceId")
    device_name = data.get("deviceName")
    device_type = data.get("deviceType")

    if not all([device_id, device_name, device_type]):
        return jsonify({"error": "deviceId, deviceName, deviceType are required"}), 400

    try:
        result = bc.register_device(device_id, device_name, device_type)
        return jsonify({
            "message": "Device registered successfully",
            "deviceId": device_id,
            "transaction": result,
        }), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/devices/<device_id>", methods=["GET"])
def get_device(device_id):
    """获取单个设备信息"""
    bc = get_blockchain()
    if not bc.connected:
        return jsonify({"error": "Blockchain not connected"}), 503

    try:
        info = bc.get_device_info(device_id)
        info["recordCount"] = bc.get_record_count(device_id)
        return jsonify(info)
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ========== 数据上传 ==========

@app.route("/api/upload", methods=["POST"])
def upload_data():
    """接收IoT数据文件，上传到IPFS，并在链上存证"""
    bc = get_blockchain()
    ipfs = get_ipfs()

    if not bc.connected:
        return jsonify({"error": "Blockchain not connected"}), 503

    device_id = request.form.get("deviceId")
    if not device_id:
        return jsonify({"error": "deviceId is required"}), 400

    file = request.files.get("file")
    if not file:
        return jsonify({"error": "file is required"}), 400

    try:
        # 保存临时文件
        tmp = tempfile.NamedTemporaryFile(delete=False, suffix=f"_{file.filename}")
        file.save(tmp.name)
        tmp.close()

        # 计算文件 SHA-256
        with open(tmp.name, "rb") as f:
            file_data = f.read()
        file_sha256 = hashlib.sha256(file_data).hexdigest()

        # 上传到 IPFS
        ipfs_hash = ipfs.add_file(tmp.name)

        # 链上存证
        tx_result = bc.store_data(device_id, ipfs_hash)

        # 清理临时文件
        os.unlink(tmp.name)

        return jsonify({
            "message": "Data uploaded and stored on blockchain",
            "ipfsHash": ipfs_hash,
            "fileSha256": file_sha256,
            "fileName": file.filename,
            "fileSize": len(file_data),
            "deviceId": device_id,
            "transaction": tx_result,
        }), 201

    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ========== 数据查询 ==========

@app.route("/api/records", methods=["GET"])
def get_records():
    """根据设备ID查询链上数据记录"""
    bc = get_blockchain()
    if not bc.connected:
        return jsonify({"error": "Blockchain not connected"}), 503

    device_id = request.args.get("deviceId")
    if not device_id:
        return jsonify({"error": "deviceId query parameter is required"}), 400

    try:
        records = bc.get_data_by_device(device_id)
        return jsonify({
            "deviceId": device_id,
            "count": len(records),
            "records": records,
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/records/<device_id>/<int:index>", methods=["GET"])
def get_single_record(device_id, index):
    """获取设备的某条数据记录"""
    bc = get_blockchain()
    if not bc.connected:
        return jsonify({"error": "Blockchain not connected"}), 503

    try:
        record = bc.get_record(device_id, index)
        return jsonify(record)
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ========== 数据下载 ==========

@app.route("/api/download", methods=["GET"])
def download_data():
    """根据IPFS Hash下载原始数据文件"""
    ipfs = get_ipfs()

    ipfs_hash = request.args.get("hash")
    if not ipfs_hash:
        return jsonify({"error": "hash query parameter is required"}), 400

    try:
        data = ipfs.get_file(ipfs_hash)

        # 写到临时文件再发送
        tmp = tempfile.NamedTemporaryFile(delete=False, suffix=".dat")
        tmp.write(data)
        tmp.close()

        return send_file(
            tmp.name,
            as_attachment=True,
            download_name=f"{ipfs_hash}.dat",
            mimetype="application/octet-stream",
        )
    except FileNotFoundError:
        return jsonify({"error": f"File not found for hash: {ipfs_hash}"}), 404
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ========== 数据完整性校验 ==========

@app.route("/api/verify", methods=["POST"])
def verify_data():
    """校验数据完整性：下载IPFS文件计算哈希，与链上记录对比"""
    bc = get_blockchain()
    ipfs = get_ipfs()

    if not bc.connected:
        return jsonify({"error": "Blockchain not connected"}), 503

    data = request.get_json()
    if not data:
        return jsonify({"error": "Request body is required"}), 400

    device_id = data.get("deviceId")
    ipfs_hash = data.get("ipfsHash")

    if not all([device_id, ipfs_hash]):
        return jsonify({"error": "deviceId and ipfsHash are required"}), 400

    try:
        # 步骤1: 链上验证 — 检查该 IPFS 哈希是否记录在区块链上
        chain_result = bc.verify_data(device_id, ipfs_hash)
        chain_ipfs_hash = ipfs_hash  # 链上存储的 IPFS Hash

        if not chain_result["exists"]:
            return jsonify({
                "verified": False,
                "reason": "该 IPFS 哈希未在区块链上找到记录",
                "chainIpfsHash": None,
                "localIpfsHash": None,
                "localSha256": None,
                "hashMatch": False,
                "chainRecord": chain_result,
            })

        # 步骤2: 从 IPFS/本地存储下载文件
        try:
            file_data = ipfs.get_file(ipfs_hash)
        except FileNotFoundError:
            return jsonify({
                "verified": False,
                "reason": "文件在 IPFS/存储中未找到，可能已丢失",
                "chainIpfsHash": chain_ipfs_hash,
                "localIpfsHash": None,
                "localSha256": None,
                "hashMatch": False,
                "chainRecord": chain_result,
            })

        # 步骤3: 计算文件的 SHA-256 和内容哈希
        local_sha256 = hashlib.sha256(file_data).hexdigest()
        # 重新计算内容哈希（模拟 IPFS 内容寻址）
        local_content_hash = f"Qm{local_sha256[:44]}"

        # 步骤4: 对比链上哈希与本地重算哈希
        hash_match = (chain_ipfs_hash == local_content_hash)

        return jsonify({
            "verified": hash_match,
            "chainIpfsHash": chain_ipfs_hash,
            "localIpfsHash": local_content_hash,
            "localSha256": local_sha256,
            "fileSize": len(file_data),
            "hashMatch": hash_match,
            "chainRecord": chain_result,
            "message": "数据完整性校验通过，文件内容与链上记录一致" if hash_match
                       else "数据完整性校验失败！文件内容哈希与链上记录不一致，数据可能已被篡改",
        })

    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ========== 权限管理 ==========

@app.route("/api/access/grant", methods=["POST"])
def grant_access():
    """授权用户访问设备数据"""
    bc = get_blockchain()
    if not bc.connected:
        return jsonify({"error": "Blockchain not connected"}), 503

    data = request.get_json()
    if not data:
        return jsonify({"error": "Request body is required"}), 400

    user_address = data.get("userAddress")
    device_id = data.get("deviceId")

    if not all([user_address, device_id]):
        return jsonify({"error": "userAddress and deviceId are required"}), 400

    try:
        result = bc.grant_access(user_address, device_id)
        return jsonify({
            "message": "Access granted successfully",
            "userAddress": user_address,
            "deviceId": device_id,
            "transaction": result,
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/access/revoke", methods=["POST"])
def revoke_access():
    """撤销用户对设备数据的访问权限"""
    bc = get_blockchain()
    if not bc.connected:
        return jsonify({"error": "Blockchain not connected"}), 503

    data = request.get_json()
    if not data:
        return jsonify({"error": "Request body is required"}), 400

    user_address = data.get("userAddress")
    device_id = data.get("deviceId")

    if not all([user_address, device_id]):
        return jsonify({"error": "userAddress and deviceId are required"}), 400

    try:
        result = bc.revoke_access(user_address, device_id)
        return jsonify({
            "message": "Access revoked successfully",
            "userAddress": user_address,
            "deviceId": device_id,
            "transaction": result,
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/access/check", methods=["GET"])
def check_access():
    """检查用户是否有访问权限"""
    bc = get_blockchain()
    if not bc.connected:
        return jsonify({"error": "Blockchain not connected"}), 503

    user_address = request.args.get("userAddress")
    device_id = request.args.get("deviceId")

    if not all([user_address, device_id]):
        return jsonify({"error": "userAddress and deviceId query parameters are required"}), 400

    try:
        has_access = bc.check_access(user_address, device_id)
        return jsonify({
            "userAddress": user_address,
            "deviceId": device_id,
            "hasAccess": has_access,
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ========== 区块链信息 ==========

@app.route("/api/blockchain/accounts", methods=["GET"])
def get_accounts():
    """获取 Ganache 账户列表"""
    bc = get_blockchain()
    if not bc.connected:
        return jsonify({"error": "Blockchain not connected"}), 503

    try:
        # JSON simulation mode — return well-known Hardhat test accounts
        accounts = [
            "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
            "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
            "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC",
            "0x90F79bf6EB2c4f870365E785982E1f101E93b906",
            "0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65",
        ]
        return jsonify({
            "accounts": accounts,
            "admin": bc.admin_account,
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500


if __name__ == "__main__":
    print(f"Starting IoT Blockchain Backend on port {config.FLASK_PORT}...")
    app.run(
        host=config.FLASK_HOST,
        port=config.FLASK_PORT,
        debug=config.FLASK_DEBUG,
    )
