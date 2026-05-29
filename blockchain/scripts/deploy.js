const hre = require("hardhat");

async function main() {
  console.log("Deploying IoTDataStorage contract...");

  const IoTDataStorage = await hre.ethers.getContractFactory("IoTDataStorage");
  const contract = await IoTDataStorage.deploy();
  await contract.waitForDeployment();

  const address = await contract.getAddress();
  console.log("IoTDataStorage deployed to:", address);

  // 将合约地址写入配置文件供后端使用
  const fs = require("fs");
  const path = require("path");
  const config = {
    contractAddress: address,
    network: hre.network.name,
    deployedAt: new Date().toISOString(),
  };

  const configPath = path.join(__dirname, "..", "deployed-config.json");
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
  console.log("Config saved to:", configPath);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
