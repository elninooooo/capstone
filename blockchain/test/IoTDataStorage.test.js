const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("IoTDataStorage", function () {
  let contract;
  let admin;
  let user1;
  let user2;

  beforeEach(async function () {
    [admin, user1, user2] = await ethers.getSigners();
    const IoTDataStorage = await ethers.getContractFactory("IoTDataStorage");
    contract = await IoTDataStorage.deploy();
    await contract.waitForDeployment();
  });

  describe("部署", function () {
    it("应正确设置管理员地址", async function () {
      expect(await contract.admin()).to.equal(admin.address);
    });
  });

  describe("设备注册", function () {
    it("管理员可以注册新设备", async function () {
      await expect(
        contract.registerDevice("device-001", "Temperature Sensor", "temperature")
      )
        .to.emit(contract, "DeviceRegistered")
        .withArgs("device-001", "Temperature Sensor", "temperature", admin.address);

      const device = await contract.getDeviceInfo("device-001");
      expect(device.deviceId).to.equal("device-001");
      expect(device.deviceName).to.equal("Temperature Sensor");
      expect(device.deviceType).to.equal("temperature");
      expect(device.isRegistered).to.be.true;
    });

    it("非管理员不能注册设备", async function () {
      await expect(
        contract.connect(user1).registerDevice("device-002", "Humidity Sensor", "humidity")
      ).to.be.revertedWith("Only admin can perform this action");
    });

    it("不能重复注册同一设备", async function () {
      await contract.registerDevice("device-001", "Temperature Sensor", "temperature");
      await expect(
        contract.registerDevice("device-001", "Another Sensor", "other")
      ).to.be.revertedWith("Device already registered");
    });

    it("可以获取所有设备ID列表", async function () {
      await contract.registerDevice("device-001", "Sensor A", "temperature");
      await contract.registerDevice("device-002", "Sensor B", "humidity");
      const ids = await contract.getAllDeviceIds();
      expect(ids.length).to.equal(2);
      expect(ids[0]).to.equal("device-001");
      expect(ids[1]).to.equal("device-002");
    });

    it("可以获取设备数量", async function () {
      expect(await contract.getDeviceCount()).to.equal(0);
      await contract.registerDevice("device-001", "Sensor A", "temperature");
      expect(await contract.getDeviceCount()).to.equal(1);
    });
  });

  describe("数据存储", function () {
    beforeEach(async function () {
      await contract.registerDevice("device-001", "Temperature Sensor", "temperature");
    });

    it("管理员可以存储数据", async function () {
      const ipfsHash = "QmTest123456789abcdef";
      const tx = await contract.storeData("device-001", ipfsHash);
      const receipt = await tx.wait();
      const block = await ethers.provider.getBlock(receipt.blockNumber);

      await expect(tx)
        .to.emit(contract, "DataStored")
        .withArgs("device-001", ipfsHash, block.timestamp, admin.address);
    });

    it("授权用户可以存储数据", async function () {
      await contract.grantAccess(user1.address, "device-001");
      const ipfsHash = "QmUserUpload123";
      await expect(contract.connect(user1).storeData("device-001", ipfsHash))
        .to.emit(contract, "DataStored");
    });

    it("未授权用户不能存储数据", async function () {
      await expect(
        contract.connect(user2).storeData("device-001", "QmUnauthorized")
      ).to.be.revertedWith("No permission to store data for this device");
    });

    it("不能为未注册设备存储数据", async function () {
      await expect(
        contract.storeData("device-999", "QmTest")
      ).to.be.revertedWith("Device not registered");
    });

    it("可以存储多条数据记录", async function () {
      await contract.storeData("device-001", "QmHash1");
      await contract.storeData("device-001", "QmHash2");
      await contract.storeData("device-001", "QmHash3");
      expect(await contract.getRecordCount("device-001")).to.equal(3);
    });
  });

  describe("数据查询", function () {
    beforeEach(async function () {
      await contract.registerDevice("device-001", "Temperature Sensor", "temperature");
      await contract.storeData("device-001", "QmHash1");
      await contract.storeData("device-001", "QmHash2");
    });

    it("管理员可以查询设备数据", async function () {
      const records = await contract.getDataByDevice("device-001");
      expect(records.length).to.equal(2);
      expect(records[0].ipfsHash).to.equal("QmHash1");
      expect(records[1].ipfsHash).to.equal("QmHash2");
    });

    it("授权用户可以查询设备数据", async function () {
      await contract.grantAccess(user1.address, "device-001");
      const records = await contract.connect(user1).getDataByDevice("device-001");
      expect(records.length).to.equal(2);
    });

    it("未授权用户不能查询设备数据", async function () {
      await expect(
        contract.connect(user2).getDataByDevice("device-001")
      ).to.be.revertedWith("No access permission for this device");
    });

    it("可以查询单条记录", async function () {
      const record = await contract.getRecord("device-001", 0);
      expect(record.ipfsHash).to.equal("QmHash1");
      expect(record.deviceId).to.equal("device-001");
      expect(record.uploader).to.equal(admin.address);
    });

    it("查询越界索引应报错", async function () {
      await expect(
        contract.getRecord("device-001", 10)
      ).to.be.revertedWith("Record index out of bounds");
    });
  });

  describe("访问控制", function () {
    beforeEach(async function () {
      await contract.registerDevice("device-001", "Temperature Sensor", "temperature");
    });

    it("管理员可以授权用户", async function () {
      await expect(contract.grantAccess(user1.address, "device-001"))
        .to.emit(contract, "AccessGranted")
        .withArgs(user1.address, "device-001");

      expect(await contract.checkAccess(user1.address, "device-001")).to.be.true;
    });

    it("管理员可以撤销授权", async function () {
      await contract.grantAccess(user1.address, "device-001");
      expect(await contract.checkAccess(user1.address, "device-001")).to.be.true;

      await expect(contract.revokeAccess(user1.address, "device-001"))
        .to.emit(contract, "AccessRevoked")
        .withArgs(user1.address, "device-001");

      expect(await contract.checkAccess(user1.address, "device-001")).to.be.false;
    });

    it("非管理员不能授权", async function () {
      await expect(
        contract.connect(user1).grantAccess(user2.address, "device-001")
      ).to.be.revertedWith("Only admin can perform this action");
    });

    it("非管理员不能撤销授权", async function () {
      await contract.grantAccess(user1.address, "device-001");
      await expect(
        contract.connect(user2).revokeAccess(user1.address, "device-001")
      ).to.be.revertedWith("Only admin can perform this action");
    });

    it("管理员始终有访问权限", async function () {
      expect(await contract.checkAccess(admin.address, "device-001")).to.be.true;
    });

    it("未授权用户无访问权限", async function () {
      expect(await contract.checkAccess(user1.address, "device-001")).to.be.false;
    });
  });

  describe("数据验证", function () {
    beforeEach(async function () {
      await contract.registerDevice("device-001", "Temperature Sensor", "temperature");
      await contract.storeData("device-001", "QmVerifyHash123");
    });

    it("可以验证链上存在的数据", async function () {
      const result = await contract.verifyData("device-001", "QmVerifyHash123");
      expect(result.exists).to.be.true;
      expect(result.timestamp).to.be.gt(0);
      expect(result.blockNumber).to.be.gt(0);
    });

    it("验证不存在的数据返回false", async function () {
      const result = await contract.verifyData("device-001", "QmNonExistent");
      expect(result.exists).to.be.false;
      expect(result.timestamp).to.equal(0);
      expect(result.blockNumber).to.equal(0);
    });
  });

  describe("管理员转移", function () {
    it("管理员可以转移权限", async function () {
      await contract.transferAdmin(user1.address);
      expect(await contract.admin()).to.equal(user1.address);
    });

    it("非管理员不能转移权限", async function () {
      await expect(
        contract.connect(user1).transferAdmin(user2.address)
      ).to.be.revertedWith("Only admin can perform this action");
    });

    it("不能转移到零地址", async function () {
      await expect(
        contract.transferAdmin(ethers.ZeroAddress)
      ).to.be.revertedWith("Invalid admin address");
    });
  });
});

// 辅助函数：获取当前区块时间戳
async function getBlockTimestamp() {
  const block = await ethers.provider.getBlock("latest");
  return block.timestamp;
}
