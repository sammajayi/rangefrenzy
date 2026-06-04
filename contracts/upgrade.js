
const { ethers, upgrades } = require("hardhat");

async function main() {
    const [deployer] = await ethers.getSigners();
    console.log(`Upgrader: ${deployer.address}`);

    if (process.env.FACTORY_PROXY) {
        const factoryProxy = process.env.FACTORY_PROXY;
        console.log(`\nUpgrading MarketFactory proxy at ${factoryProxy}...`);

        const NewFactory = await ethers.getContractFactory("MarketFactory");
        const upgraded = await upgrades.upgradeProxy(factoryProxy, NewFactory, {
            kind: "uups",
        });
        await upgraded.waitForDeployment();
        console.log(`Factory upgraded. Proxy address unchanged: ${factoryProxy}`);
    }

    if (process.env.FACTORY_PROXY && process.env.MARKET_PROXY) {
        const factoryProxy = process.env.FACTORY_PROXY;
        const marketProxy = process.env.MARKET_PROXY;

        console.log(`\nDeploying new RangeFrenzyMarket implementation...`);
        const NewMarket = await ethers.getContractFactory("RangeFrenzyMarket");
        const newImpl = await NewMarket.deploy();
        await newImpl.waitForDeployment();
        const newImplAddr = await newImpl.getAddress();
        console.log(`New implementation: ${newImplAddr}`);

        console.log(`Upgrading market proxy ${marketProxy} via factory...`);
        const factory = await ethers.getContractAt("MarketFactory", factoryProxy);
        const tx = await factory.upgradeMarket(marketProxy, newImplAddr);
        await tx.wait();
        console.log(`Market ${marketProxy} upgraded to ${newImplAddr}`);
    }

    if (process.env.FACTORY_PROXY && process.env.NEW_IMPL) {
        const factoryProxy = process.env.FACTORY_PROXY;
        const newImpl = process.env.NEW_IMPL;

        console.log(`\nSetting new default implementation for future markets...`);
        const factory = await ethers.getContractAt("MarketFactory", factoryProxy);
        await (await factory.setMarketImplementation(newImpl)).wait();
        console.log(`Future markets will use: ${newImpl}`);
    }
}

main().catch((err) => {
    console.error(err);
    process.exitCode = 1;
});
