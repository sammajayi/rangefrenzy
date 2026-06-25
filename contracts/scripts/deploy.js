
const { ethers, upgrades } = require("hardhat");

async function main() {
    const [deployer] = await ethers.getSigners();
    console.log("\n═══════════════════════════════════════════");
    console.log("  RangeFrenzy Deployment");
    console.log("═══════════════════════════════════════════");
    console.log(`  Network:  ${(await ethers.provider.getNetwork()).name}`);
    console.log(`  Deployer: ${deployer.address}`);
    console.log(
        `  Balance:  ${ethers.formatEther(await ethers.provider.getBalance(deployer.address))} CELO\n`
    );

    const networkName = (await ethers.provider.getNetwork()).name;
    let stakeTokenAddress = process.env.STAKE_TOKEN;

    if (!stakeTokenAddress) {
        if (networkName === "celo") {
            stakeTokenAddress = "0x62B8B11039FcfE5aB0C56E502b1C372A3d2a9c7A";
            console.log(`  Using G$ mainnet token: ${stakeTokenAddress}`);
        } else {
            console.log("  Deploying MockStakeToken for local testing...");
            const MockToken = await ethers.getContractFactory("MockStakeToken");
            const mock = await MockToken.deploy();
            await mock.waitForDeployment();
            stakeTokenAddress = await mock.getAddress();
            console.log(`  MockStakeToken deployed: ${stakeTokenAddress}`);
        }
    } else {
        console.log(`  Using stake token: ${stakeTokenAddress}`);
    }

    const feeRecipient = process.env.FEE_RECIPIENT || deployer.address;
    console.log(`  Fee recipient:    ${feeRecipient}`);

    console.log("\n[1/3] Deploying RangeFrenzyMarket implementation...");
    const MarketImpl = await ethers.getContractFactory("RangeFrenzyMarket");
    const marketImpl = await MarketImpl.deploy();
    await marketImpl.waitForDeployment();
    const marketImplAddress = await marketImpl.getAddress();
    console.log(`  Implementation: ${marketImplAddress}`);

    console.log("\n[2/3] Deploying MarketFactory proxy (UUPS)...");
    const Factory = await ethers.getContractFactory("MarketFactory");
    const factory = await upgrades.deployProxy(
        Factory,
        [
            deployer.address,
            stakeTokenAddress,
            feeRecipient,
            marketImplAddress,
        ],
        {
            kind: "uups",
            initializer: "initialize",
        }
    );
    await factory.waitForDeployment();
    const factoryAddress = await factory.getAddress();
    console.log(`  Factory proxy:  ${factoryAddress}`);

    console.log("\n[3/3] Creating example BTC market...");
    const deadline = Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60;

    const tx = await factory.createMarket(
        "What will BTC price be on July 10, 2025?",
        0,
        deadline,
        ethers.parseUnits("1", 18),
        ethers.parseUnits("1", 18),
        ethers.parseUnits("0.05", 18),
        0n,
        ["< $80,000", "$80k – $90k", "$90k – $100k", "> $100,000"],
        [0, 80_000, 90_001, 100_001],
        [79_999, 90_000, 100_000, 999_999_999]
    );
    const receipt = await tx.wait();

    const event = receipt.logs.find(
        (l) => l.fragment && l.fragment.name === "MarketCreated"
    );
    const marketProxy = event ? event.args[0] : "(check tx logs)";
    console.log(`  Example market proxy: ${marketProxy}`);

    console.log("\n═══════════════════════════════════════════");
    console.log("  DEPLOYMENT COMPLETE");
    console.log("═══════════════════════════════════════════");
    console.log(`  StakeToken:            ${stakeTokenAddress}`);
    console.log(`  MarketImpl:            ${marketImplAddress}`);
    console.log(`  MarketFactory (proxy): ${factoryAddress}`);
    console.log(`  Example Market:        ${marketProxy}`);
    console.log("\n  Save these addresses in your .env / frontend config!\n");
}

main().catch((err) => {
    console.error(err);
    process.exitCode = 1;
});
