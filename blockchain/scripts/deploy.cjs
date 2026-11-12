const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  const network = hre.network.name;
  console.log(`\n========================================`);
  console.log(`Deploying DocumentRegistry to '${network}' network`);
  console.log(`Deployer address: ${deployer ? deployer.address : 'Default'}`);
  console.log(`========================================\n`);

  const DocumentRegistry = await hre.ethers.getContractFactory("DocumentRegistry");
  const documentRegistry = await DocumentRegistry.deploy();

  await documentRegistry.deployed();
  const receipt = await documentRegistry.deployTransaction.wait(1);

  console.log(`✅ DocumentRegistry successfully deployed & mined!`);
  console.log(`Contract Address : ${documentRegistry.address}`);
  console.log(`Deployment Tx    : ${documentRegistry.deployTransaction.hash}`);
  console.log(`Block Number     : ${receipt.blockNumber}`);
  console.log(`Gas Used         : ${receipt.gasUsed.toString()}`);

  // Export artifact with ABI to server for convenience
  try {
    const artifact = await hre.artifacts.readArtifact("DocumentRegistry");
    const serverContractsDir = path.join(__dirname, "../../server/contracts");
    if (!fs.existsSync(serverContractsDir)) {
      fs.mkdirSync(serverContractsDir, { recursive: true });
    }

    const exportData = {
      contractName: artifact.contractName,
      address: documentRegistry.address,
      transactionHash: documentRegistry.deployTransaction.hash,
      blockNumber: receipt.blockNumber,
      network: network,
      abi: artifact.abi,
      deployedAt: new Date().toISOString()
    };

    fs.writeFileSync(
      path.join(serverContractsDir, "DocumentRegistry.json"),
      JSON.stringify(exportData, null, 2)
    );
    console.log(`📁 Synced contract ABI & address to server/contracts/DocumentRegistry.json`);
  } catch (syncErr) {
    console.warn(`Note: Could not sync ABI to server/contracts:`, syncErr.message);
  }

  console.log(`\n========================================`);
  console.log(`Add this to your server/.env file:`);
  console.log(`CONTRACT_ADDRESS=${documentRegistry.address}`);
  console.log(`========================================\n`);
}

main().catch((error) => {
  console.error("Deployment failed:", error);
  process.exitCode = 1;
});