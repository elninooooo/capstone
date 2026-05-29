// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract IoTDataStorage {
    // 管理员地址
    address public admin;

    // 数据记录结构体
    struct DataRecord {
        string ipfsHash;      // IPFS Content Hash
        string deviceId;      // IoT 设备 ID
        uint256 timestamp;    // 数据上传时间戳
        address uploader;     // 上传者地址
        uint256 blockNumber;  // 记录所在区块号
    }

    // 设备信息结构体
    struct Device {
        string deviceId;      // 设备 ID
        string deviceName;    // 设备名称
        string deviceType;    // 设备类型（如 temperature, humidity）
        address owner;        // 设备所有者
        bool isRegistered;    // 是否已注册
        uint256 registeredAt; // 注册时间
    }

    // 设备ID => 设备信息
    mapping(string => Device) public devices;
    // 所有已注册的设备ID列表
    string[] public deviceIds;

    // 设备ID => 该设备的所有数据记录
    mapping(string => DataRecord[]) public deviceRecords;

    // 访问控制: 用户地址 => 设备ID => 是否有权限
    mapping(address => mapping(string => bool)) public accessPermissions;

    // 事件
    event DeviceRegistered(string indexed deviceId, string deviceName, string deviceType, address owner);
    event DataStored(string indexed deviceId, string ipfsHash, uint256 timestamp, address uploader);
    event AccessGranted(address indexed user, string deviceId);
    event AccessRevoked(address indexed user, string deviceId);

    modifier onlyAdmin() {
        require(msg.sender == admin, "Only admin can perform this action");
        _;
    }

    modifier deviceExists(string memory _deviceId) {
        require(devices[_deviceId].isRegistered, "Device not registered");
        _;
    }

    modifier hasAccess(string memory _deviceId) {
        require(
            msg.sender == admin || accessPermissions[msg.sender][_deviceId],
            "No access permission for this device"
        );
        _;
    }

    constructor() {
        admin = msg.sender;
    }

    /// @notice 注册新的IoT设备
    /// @param _deviceId 设备唯一标识
    /// @param _deviceName 设备名称
    /// @param _deviceType 设备类型
    function registerDevice(
        string memory _deviceId,
        string memory _deviceName,
        string memory _deviceType
    ) external onlyAdmin {
        require(!devices[_deviceId].isRegistered, "Device already registered");

        devices[_deviceId] = Device({
            deviceId: _deviceId,
            deviceName: _deviceName,
            deviceType: _deviceType,
            owner: msg.sender,
            isRegistered: true,
            registeredAt: block.timestamp
        });

        deviceIds.push(_deviceId);

        emit DeviceRegistered(_deviceId, _deviceName, _deviceType, msg.sender);
    }

    /// @notice 存储IoT数据的IPFS哈希到链上
    /// @param _deviceId 设备ID
    /// @param _ipfsHash IPFS内容哈希
    function storeData(
        string memory _deviceId,
        string memory _ipfsHash
    ) external deviceExists(_deviceId) {
        require(
            msg.sender == admin || accessPermissions[msg.sender][_deviceId],
            "No permission to store data for this device"
        );

        DataRecord memory record = DataRecord({
            ipfsHash: _ipfsHash,
            deviceId: _deviceId,
            timestamp: block.timestamp,
            uploader: msg.sender,
            blockNumber: block.number
        });

        deviceRecords[_deviceId].push(record);

        emit DataStored(_deviceId, _ipfsHash, block.timestamp, msg.sender);
    }

    /// @notice 授权用户访问指定设备的数据
    /// @param _user 被授权的用户地址
    /// @param _deviceId 设备ID
    function grantAccess(
        address _user,
        string memory _deviceId
    ) external onlyAdmin deviceExists(_deviceId) {
        accessPermissions[_user][_deviceId] = true;
        emit AccessGranted(_user, _deviceId);
    }

    /// @notice 撤销用户对指定设备数据的访问权限
    /// @param _user 被撤销权限的用户地址
    /// @param _deviceId 设备ID
    function revokeAccess(
        address _user,
        string memory _deviceId
    ) external onlyAdmin deviceExists(_deviceId) {
        accessPermissions[_user][_deviceId] = false;
        emit AccessRevoked(_user, _deviceId);
    }

    /// @notice 检查用户是否有权访问指定设备的数据
    /// @param _user 用户地址
    /// @param _deviceId 设备ID
    /// @return 是否有访问权限
    function checkAccess(
        address _user,
        string memory _deviceId
    ) external view returns (bool) {
        if (_user == admin) return true;
        return accessPermissions[_user][_deviceId];
    }

    /// @notice 查询指定设备的所有数据记录
    /// @param _deviceId 设备ID
    /// @return 数据记录数组
    function getDataByDevice(
        string memory _deviceId
    ) external view hasAccess(_deviceId) returns (DataRecord[] memory) {
        return deviceRecords[_deviceId];
    }

    /// @notice 查询指定设备的数据记录数量
    /// @param _deviceId 设备ID
    /// @return 记录数量
    function getRecordCount(
        string memory _deviceId
    ) external view returns (uint256) {
        return deviceRecords[_deviceId].length;
    }

    /// @notice 查询指定设备的某条数据记录
    /// @param _deviceId 设备ID
    /// @param _index 记录索引
    /// @return 单条数据记录
    function getRecord(
        string memory _deviceId,
        uint256 _index
    ) external view hasAccess(_deviceId) returns (DataRecord memory) {
        require(_index < deviceRecords[_deviceId].length, "Record index out of bounds");
        return deviceRecords[_deviceId][_index];
    }

    /// @notice 获取所有已注册设备的数量
    /// @return 设备数量
    function getDeviceCount() external view returns (uint256) {
        return deviceIds.length;
    }

    /// @notice 获取设备信息
    /// @param _deviceId 设备ID
    /// @return 设备信息
    function getDeviceInfo(
        string memory _deviceId
    ) external view returns (Device memory) {
        require(devices[_deviceId].isRegistered, "Device not registered");
        return devices[_deviceId];
    }

    /// @notice 获取所有设备ID列表
    /// @return 设备ID数组
    function getAllDeviceIds() external view returns (string[] memory) {
        return deviceIds;
    }

    /// @notice 通过IPFS哈希验证数据是否存在于链上
    /// @param _deviceId 设备ID
    /// @param _ipfsHash 待验证的IPFS哈希
    /// @return exists 是否存在
    /// @return timestamp 存储时间戳（如存在）
    /// @return blockNumber 区块号（如存在）
    function verifyData(
        string memory _deviceId,
        string memory _ipfsHash
    ) external view returns (bool exists, uint256 timestamp, uint256 blockNumber) {
        DataRecord[] storage records = deviceRecords[_deviceId];
        for (uint256 i = 0; i < records.length; i++) {
            if (keccak256(bytes(records[i].ipfsHash)) == keccak256(bytes(_ipfsHash))) {
                return (true, records[i].timestamp, records[i].blockNumber);
            }
        }
        return (false, 0, 0);
    }

    /// @notice 转移管理员权限
    /// @param _newAdmin 新管理员地址
    function transferAdmin(address _newAdmin) external onlyAdmin {
        require(_newAdmin != address(0), "Invalid admin address");
        admin = _newAdmin;
    }
}
