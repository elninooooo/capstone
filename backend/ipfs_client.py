import os
import hashlib
import json
import shutil
import config

try:
    import ipfshttpclient
    IPFS_AVAILABLE = True
except ImportError:
    IPFS_AVAILABLE = False


class IPFSClient:
    """IPFS 客户端封装，当 IPFS 不可用时自动降级为本地文件存储"""

    def __init__(self):
        self.client = None
        self.use_local = True

        if IPFS_AVAILABLE:
            try:
                self.client = ipfshttpclient.connect(config.IPFS_API_URL, timeout=5)
                self.use_local = False
                print("[IPFS] Connected to IPFS daemon")
            except Exception as e:
                print(f"[IPFS] Cannot connect to IPFS daemon: {e}")
                if config.USE_LOCAL_STORAGE_FALLBACK:
                    print("[IPFS] Falling back to local file storage")
                    self.use_local = True
                else:
                    raise

        if self.use_local:
            os.makedirs(config.LOCAL_STORAGE_DIR, exist_ok=True)
            self._meta_file = os.path.join(config.LOCAL_STORAGE_DIR, "meta.json")
            if not os.path.exists(self._meta_file):
                with open(self._meta_file, "w") as f:
                    json.dump({}, f)

    def add_file(self, file_path):
        """上传文件到 IPFS（或本地存储），返回内容哈希"""
        if not self.use_local and self.client:
            result = self.client.add(file_path)
            return result["Hash"]
        else:
            return self._local_add(file_path)

    def add_bytes(self, data, filename="data"):
        """上传字节数据到 IPFS（或本地存储），返回内容哈希"""
        if not self.use_local and self.client:
            result = self.client.add_bytes(data)
            return result
        else:
            return self._local_add_bytes(data, filename)

    def get_file(self, ipfs_hash):
        """从 IPFS（或本地存储）获取文件内容"""
        if not self.use_local and self.client:
            return self.client.cat(ipfs_hash)
        else:
            return self._local_get(ipfs_hash)

    def _compute_hash(self, data):
        """模拟 IPFS 的内容寻址，使用 SHA-256 生成类似的哈希"""
        sha256 = hashlib.sha256(data).hexdigest()
        return f"Qm{sha256[:44]}"

    def _local_add(self, file_path):
        """本地文件存储模拟 IPFS add"""
        with open(file_path, "rb") as f:
            data = f.read()
        content_hash = self._compute_hash(data)

        dest_path = os.path.join(config.LOCAL_STORAGE_DIR, content_hash)
        shutil.copy2(file_path, dest_path)

        meta = self._load_meta()
        meta[content_hash] = {
            "original_name": os.path.basename(file_path),
            "size": len(data),
            "sha256": hashlib.sha256(data).hexdigest(),
        }
        self._save_meta(meta)

        return content_hash

    def _local_add_bytes(self, data, filename="data"):
        """本地字节存储模拟 IPFS add_bytes"""
        if isinstance(data, str):
            data = data.encode("utf-8")
        content_hash = self._compute_hash(data)

        dest_path = os.path.join(config.LOCAL_STORAGE_DIR, content_hash)
        with open(dest_path, "wb") as f:
            f.write(data)

        meta = self._load_meta()
        meta[content_hash] = {
            "original_name": filename,
            "size": len(data),
            "sha256": hashlib.sha256(data).hexdigest(),
        }
        self._save_meta(meta)

        return content_hash

    def _local_get(self, content_hash):
        """本地读取模拟 IPFS cat"""
        file_path = os.path.join(config.LOCAL_STORAGE_DIR, content_hash)
        if not os.path.exists(file_path):
            raise FileNotFoundError(f"File not found for hash: {content_hash}")
        with open(file_path, "rb") as f:
            return f.read()

    def _load_meta(self):
        with open(self._meta_file, "r") as f:
            return json.load(f)

    def _save_meta(self, meta):
        with open(self._meta_file, "w") as f:
            json.dump(meta, f, indent=2)


ipfs_client = IPFSClient()
