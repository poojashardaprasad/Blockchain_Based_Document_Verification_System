const hre = require("hardhat");

async function main() {
  const DocumentRegistry = await hre.ethers.getContractFactory("DocumentRegistry");
  const documentRegistry = await DocumentRegistry.deploy();

  // FIX: Change 'waitForDeployment()' to 'deployed()'
  await documentRegistry.deployed();

  // FIX: In v5, we use '.address' to see the contract location
  console.log("DocumentRegistry deployed to:", documentRegistry.address);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});