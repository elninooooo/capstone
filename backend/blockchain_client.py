"""
Blockchain client - local JSON-backed simulation.
Replaces web3/Hardhat dependency so the app runs without installing web3.
All data is persisted in chain_data.json next to this file.
"""

import json
import os
import time
import hashlib
import threading
import config

DATA_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "chain_data.json")
_lock = threading.Lock()

_EMPTY_DB = {
    "devices": {},    # device_id -> {deviceId, deviceName, deviceType, owner, registeredAt, isRegistered}
    "records": {},    # device_id -> [{ipfsHash, deviceId, timestamp, uploader, blockNumber}]
    "access": {},     # f"{user_address}:{device_id}" -> bool
    "block_number": 1,
}


def _load():
    if os.path.exists(DATA_FILE):
        try:
            with open(DATA_FILE, "r") as f:
                return json.load(f)
        except Exception:
            pass
    return json.loads(json.dumps(_EMPTY_DB))


def _save(db):
    with open(DATA_FILE, "w") as f:
        json.dump(db, f, indent=2)


def _fake_tx(db):
    block = db["block_number"]
    db["block_number"] += 1
    raw = f"{block}{time.time()}".encode()
    tx_hash = "0x" + hashlib.sha256(raw).hexdigest()
    return tx_hash, block


ADMIN_ACCOUNT = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"


class BlockchainClient:
    """Local JSON-backed blockchain simulation."""

    def __init__(self):
        self.connected = True
        self.admin_account = ADMIN_ACCOUNT
        print("[Blockchain] Using local JSON simulation (web3 not available)")

    # -------- write ops --------

    def register_device(self, device_id, device_name, device_type):
        with _lock:
            db = _load()
            db["devices"][device_id] = {
                "deviceId": device_id,
                "deviceName": device_name,
                "deviceType": device_type,
                "owner": self.admin_account,
                "isRegistered": True,
                "registeredAt": int(time.time()),
            }
            if device_id not in db["records"]:
                db["records"][device_id] = []
            tx_hash, block = _fake_tx(db)
            _save(db)
        return {"transactionHash": tx_hash, "blockNumber": block, "status": 1}

    def store_data(self, device_id, ipfs_hash):
        with _lock:
            db = _load()
            if device_id not in db["records"]:
                db["records"][device_id] = []
            record = {
                "ipfsHash": ipfs_hash,
                "deviceId": device_id,
                "timestamp": int(time.time()),
                "uploader": self.admin_account,
                "blockNumber": db["block_number"],
            }
            db["records"][device_id].append(record)
            tx_hash, block = _fake_tx(db)
            _save(db)
        return {"transactionHash": tx_hash, "blockNumber": block, "status": 1}

    def grant_access(self, user_address, device_id):
        with _lock:
            db = _load()
            db["access"][f"{user_address}:{device_id}"] = True
            tx_hash, block = _fake_tx(db)
            _save(db)
        return {"transactionHash": tx_hash, "blockNumber": block, "status": 1}

    def revoke_access(self, user_address, device_id):
        with _lock:
            db = _load()
            db["access"][f"{user_address}:{device_id}"] = False
            tx_hash, block = _fake_tx(db)
            _save(db)
        return {"transactionHash": tx_hash, "blockNumber": block, "status": 1}

    # -------- read ops --------

    def get_device_info(self, device_id):
        db = _load()
        d = db["devices"].get(device_id)
        if d is None:
            return {
                "deviceId": device_id,
                "deviceName": "",
                "deviceType": "",
                "owner": "",
                "isRegistered": False,
                "registeredAt": 0,
            }
        return dict(d)

    def get_all_device_ids(self):
        db = _load()
        return list(db["devices"].keys())

    def get_device_count(self):
        db = _load()
        return len(db["devices"])

    def get_record_count(self, device_id):
        db = _load()
        return len(db["records"].get(device_id, []))

    def get_data_by_device(self, device_id):
        db = _load()
        return [dict(r) for r in db["records"].get(device_id, [])]

    def get_record(self, device_id, index):
        db = _load()
        records = db["records"].get(device_id, [])
        if index >= len(records):
            raise IndexError(f"Record index {index} out of range for device {device_id}")
        return dict(records[index])

    def check_access(self, user_address, device_id):
        db = _load()
        return db["access"].get(f"{user_address}:{device_id}", False)

    def verify_data(self, device_id, ipfs_hash):
        db = _load()
        records = db["records"].get(device_id, [])
        for r in records:
            if r["ipfsHash"] == ipfs_hash:
                return {"exists": True, "timestamp": r["timestamp"], "blockNumber": r["blockNumber"]}
        return {"exists": False, "timestamp": 0, "blockNumber": 0}


blockchain_client = BlockchainClient()
