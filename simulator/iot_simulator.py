"""
IoT 数据采集模拟器
模拟多个 IoT 设备节点，读取 CSV 数据集，按设备分组后批量上传到 IPFS 并完成链上存证。
"""

import csv
import io
import os
import sys
import time
import argparse
import requests

# 后端 API 地址
API_BASE_URL = "http://127.0.0.1:5141"


def load_csv_data(csv_path):

    """读取 CSV 数据集，按 device_id 分组"""
    devices = {}
    with open(csv_path, "r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            device_id = row["device_id"]
            if device_id not in devices:
                devices[device_id] = {
                    "device_name": row.get("device_name", device_id),
                    "device_type": row.get("device_type", "sensor"),
                    "records": [],
                }
            devices[device_id]["records"].append(row)
    return devices


def check_backend_health():
    """检查后端服务是否在线"""
    try:
        resp = requests.get(f"{API_BASE_URL}/api/health", timeout=5)
        data = resp.json()
        if data.get("status") == "ok" and data.get("blockchain_connected"):
            print("[OK] Backend is running, blockchain connected")
            return True
        print(f"[WARN] Backend status: {data}")
        return False
    except requests.ConnectionError:
        print(f"[ERROR] Cannot connect to backend at {API_BASE_URL}")
        print("  Please start the backend first: cd backend && ./venv/bin/python app.py")
        return False


def register_device(device_id, device_name, device_type):
    """注册设备到区块链"""
    resp = requests.post(
        f"{API_BASE_URL}/api/devices",
        json={
            "deviceId": device_id,
            "deviceName": device_name,
            "deviceType": device_type,
        },
        timeout=30,
    )
    if resp.status_code == 201:
        data = resp.json()
        tx_hash = data["transaction"]["transactionHash"]
        print(f"  [+] Device registered: {device_id} (tx: {tx_hash[:16]}...)")
        return True
    elif "already registered" in resp.text.lower() or "Device already registered" in resp.text:
        print(f"  [=] Device already registered: {device_id}")
        return True
    else:
        print(f"  [!] Failed to register device {device_id}: {resp.text}")
        return False


def upload_batch(device_id, records, batch_index):
    """将一批数据记录打包为 CSV 并上传"""
    # 将记录打包为 CSV 格式
    output = io.StringIO()
    if records:
        writer = csv.DictWriter(output, fieldnames=records[0].keys())
        writer.writeheader()
        writer.writerows(records)

    csv_content = output.getvalue().encode("utf-8")
    filename = f"{device_id}_batch{batch_index}.csv"

    # 通过后端 API 上传（后端会处理 IPFS 上传 + 链上存证）
    resp = requests.post(
        f"{API_BASE_URL}/api/upload",
        data={"deviceId": device_id},
        files={"file": (filename, csv_content, "text/csv")},
        timeout=30,
    )

    if resp.status_code == 201:
        data = resp.json()
        ipfs_hash = data["ipfsHash"]
        block_num = data["transaction"]["blockNumber"]
        file_size = data["fileSize"]
        print(
            f"  [+] Batch {batch_index}: {len(records)} records, "
            f"{file_size} bytes -> IPFS: {ipfs_hash[:24]}... (block #{block_num})"
        )
        return data
    else:
        print(f"  [!] Upload failed for batch {batch_index}: {resp.text}")
        return None


def simulate(csv_path, batch_size=4):
    """
    运行 IoT 模拟器
    1. 读取 CSV 数据集
    2. 按设备分组
    3. 注册每个设备
    4. 按批次上传数据并存证
    """
    print("=" * 60)
    print("  IoT Data Collection Simulator")
    print("=" * 60)
    print(f"Data source: {csv_path}")
    print(f"Batch size: {batch_size} records per batch")
    print()

    # 检查后端
    if not check_backend_health():
        sys.exit(1)

    # 读取数据
    print(f"\n[1/3] Loading CSV data...")
    devices = load_csv_data(csv_path)
    total_records = sum(len(d["records"]) for d in devices.values())
    print(f"  Found {len(devices)} devices, {total_records} total records")

    # 注册设备
    print(f"\n[2/3] Registering devices on blockchain...")
    for device_id, info in devices.items():
        register_device(device_id, info["device_name"], info["device_type"])
        time.sleep(0.3)

    # 分批上传数据
    print(f"\n[3/3] Uploading data batches to IPFS + blockchain...")
    total_batches = 0
    total_uploaded = 0
    results = []

    for device_id, info in devices.items():
        records = info["records"]
        # 将记录按 batch_size 分组
        batches = [records[i : i + batch_size] for i in range(0, len(records), batch_size)]
        print(f"\n  Device: {device_id} ({len(records)} records -> {len(batches)} batches)")

        for batch_idx, batch in enumerate(batches, 1):
            result = upload_batch(device_id, batch, batch_idx)
            if result:
                total_batches += 1
                total_uploaded += len(batch)
                results.append(result)
            time.sleep(0.3)

    # 汇总
    print("\n" + "=" * 60)
    print("  Simulation Complete")
    print("=" * 60)
    print(f"  Devices: {len(devices)}")
    print(f"  Batches uploaded: {total_batches}")
    print(f"  Records stored: {total_uploaded}/{total_records}")
    print()

    # 验证：查询每个设备的链上记录
    print("[Verification] Checking on-chain records...")
    for device_id in devices:
        resp = requests.get(f"{API_BASE_URL}/api/records", params={"deviceId": device_id}, timeout=10)
        if resp.status_code == 200:
            data = resp.json()
            print(f"  {device_id}: {data['count']} records on chain")
        else:
            print(f"  {device_id}: query failed")

    print("\nDone.")
    return results


def main():
    parser = argparse.ArgumentParser(description="IoT Data Collection Simulator")
    parser.add_argument(
        "--csv",
        default=os.path.join(os.path.dirname(__file__), "data", "iot_sensor_data.csv"),
        help="Path to CSV data file",
    )
    parser.add_argument(
        "--batch-size",
        type=int,
        default=4,
        help="Number of records per upload batch (default: 4)",
    )
    parser.add_argument(
        "--api-url",
        default="http://127.0.0.1:5141",
        help="Backend API base URL (default: http://127.0.0.1:5141)",
    )
    args = parser.parse_args()

    global API_BASE_URL
    API_BASE_URL = args.api_url

    if not os.path.exists(args.csv):
        print(f"[ERROR] CSV file not found: {args.csv}")
        sys.exit(1)

    simulate(args.csv, args.batch_size)


if __name__ == "__main__":
    main()
