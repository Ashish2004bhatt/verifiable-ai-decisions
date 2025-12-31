const hre = require("hardhat");

async function main() {
  console.log("Deploying AIDecisionRegistry contract...");

  const AIDecisionRegistry = await hre.ethers.getContractFactory("AIDecisionRegistry");
  const registry = await AIDecisionRegistry.deploy();

  await registry.waitForDeployment();

  const address = await registry.getAddress();
  console.log("AIDecisionRegistry deployed to:", address);
  console.log("\nContract Address (save this for backend config):");
  console.log(address);
  
  return address;
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

