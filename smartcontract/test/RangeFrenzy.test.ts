import { expect } from "chai";
import { network } from "hardhat";
import type { Contract, Signer } from "ethers";
import ERC1967ProxyArtifact from "@openzeppelin/contracts/build/contracts/ERC1967Proxy.json" with { type: "json" };

const { ethers, networkHelpers } = await network.create();

async function deployUUPSProxy(
    contractName: string,
    initArgs: unknown[],
    initializer = "initialize"
): Promise<Contract> {
    const Impl = await ethers.getContractFactory(contractName);
    const impl = await Impl.deploy();
    await impl.waitForDeployment();

    const initData = Impl.interface.encodeFunctionData(initializer, initArgs);
    const [deployer] = await ethers.getSigners();
    const ProxyFactory = new ethers.ContractFactory(
        ERC1967ProxyArtifact.abi,
        ERC1967ProxyArtifact.bytecode,
        deployer
    );
    const proxy = await ProxyFactory.deploy(await impl.getAddress(), initData);
    await proxy.waitForDeployment();

    return ethers.getContractAt(contractName, await proxy.getAddress());
}

async function upgradeUUPSProxy(proxyAddress: string, contractName: string): Promise<Contract> {
    const NewImpl = await ethers.getContractFactory(contractName);
    const newImpl = await NewImpl.deploy();
    await newImpl.waitForDeployment();

    const proxy = await ethers.getContractAt(contractName, proxyAddress);
    await proxy.upgradeToAndCall(await newImpl.getAddress(), "0x");
    return proxy;
}

const CATEGORY = { CRYPTO: 0, SPORTS: 1, LOCAL: 2 };
const STATUS = { OPEN: 0, CLOSED: 1, RESOLVED: 2, CANCELLED: 3 };
const ONE_DAY = 60 * 60 * 24;
const toWei = (n: number) => ethers.parseUnits(String(n), 18);

async function increaseTime(seconds: number): Promise<void> {
    await networkHelpers.time.increase(seconds);
}

async function latestTimestamp(): Promise<number> {
    return (await ethers.provider.getBlock("latest"))?.timestamp ?? 0;
}

interface DeploymentFixture {
    token: Contract;
    marketImpl: Contract;
    factory: Contract;
    owner: Signer;
    alice: Signer;
    bob: Signer;
    carol: Signer;
    feeWallet: Signer;
    stranger: Signer;
}

async function deployFixture(): Promise<DeploymentFixture> {
    const [owner, alice, bob, carol, feeWallet, stranger] = await ethers.getSigners();

    const Token = await ethers.getContractFactory("MockStakeToken");
    const token = await Token.deploy();
    await token.waitForDeployment();

    const MarketImpl = await ethers.getContractFactory("RangeFrenzyMarket");
    const marketImpl = await MarketImpl.deploy();
    await marketImpl.waitForDeployment();

    const factory = await deployUUPSProxy("MarketFactory", [
        owner.address,
        await token.getAddress(),
        feeWallet.address,
        await marketImpl.getAddress(),
    ]);

    for (const user of [alice, bob, carol]) {
        await token.mint(user.address, toWei(10_000));
    }

    return { token, marketImpl, factory, owner, alice, bob, carol, feeWallet, stranger };
}

async function createBtcMarket(
    factory: Contract,
    token: Contract,
    overrides: Record<string, any> = {}
): Promise<Contract> {
    const deadline = (await latestTimestamp()) + ONE_DAY;
    const minStake = overrides.minStake ?? toWei(1);

    const tx = await factory.createMarket(
        overrides.question ?? "What will BTC price be on June 10?",
        overrides.category ?? CATEGORY.CRYPTO,
        overrides.deadline ?? deadline,
        minStake,
        overrides.labels ?? ["< $80k", "$80k–$90k", "$90k–$100k", "> $100k"],
        overrides.lowers ?? [0, 80_000, 90_001, 100_001],
        overrides.uppers ?? [79_999, 90_000, 100_000, 999_999_999]
    );
    const receipt = await tx.wait();

    const event = receipt?.logs.find(
        (l: any) => l.fragment && l.fragment.name === "MarketCreated"
    );
    const proxyAddr = event?.args?.[0];
    return ethers.getContractAt("RangeFrenzyMarket", proxyAddr);
}

async function doStake(
    market: Contract,
    token: Contract,
    user: Signer,
    rangeIndex: number,
    amount: bigint
): Promise<any> {
    const addr = await market.getAddress();
    await token.connect(user).approve(addr, amount);
    return market.connect(user).stake(rangeIndex, amount);
}

describe("MarketFactory", function () {
    it("initialises with correct state", async function () {
        const { factory, token, owner, feeWallet, marketImpl } = await deployFixture();
        expect(await factory.owner()).to.equal(owner.address);
        expect(await factory.stakeToken()).to.equal(await token.getAddress());
        expect(await factory.feeRecipient()).to.equal(feeWallet.address);
        expect(await factory.marketImplementation()).to.equal(await marketImpl.getAddress());
    });

    it("creates a market and emits MarketCreated", async function () {
        const { factory } = await deployFixture();
        const deadline = (await latestTimestamp()) + ONE_DAY;

        await expect(
            factory.createMarket(
                "Test question?",
                CATEGORY.SPORTS,
                deadline,
                0,
                ["Low", "High"],
                [0, 51],
                [50, 100]
            )
        ).to.emit(factory, "MarketCreated");

        expect(await factory.totalMarkets()).to.equal(1n);
    });

    it("non-owner cannot create a market", async function () {
        const { factory, alice } = await deployFixture();
        const deadline = (await latestTimestamp()) + ONE_DAY;
        await expect(
            factory
                .connect(alice)
                .createMarket("Hack?", CATEGORY.LOCAL, deadline, 0, ["A", "B"], [0, 51], [50, 100])
        ).to.revert(ethers);
    });

    it("filters markets by category correctly", async function () {
        const { factory } = await deployFixture();
        const deadline = (await latestTimestamp()) + ONE_DAY;
        await factory.createMarket("C", CATEGORY.CRYPTO, deadline, 0, ["A", "B"], [0, 51], [50, 100]);
        await factory.createMarket("S", CATEGORY.SPORTS, deadline, 0, ["A", "B"], [0, 51], [50, 100]);
        await factory.createMarket("L", CATEGORY.LOCAL, deadline, 0, ["A", "B"], [0, 51], [50, 100]);

        expect((await factory.getMarketsByCategory(CATEGORY.CRYPTO)).length).to.equal(1);
        expect((await factory.getMarketsByCategory(CATEGORY.SPORTS)).length).to.equal(1);
        expect((await factory.getAllMarkets()).length).to.equal(3);
    });

    it("getMarketsPage returns newest first", async function () {
        const { factory } = await deployFixture();
        const deadline = (await latestTimestamp()) + ONE_DAY;
        for (let i = 0; i < 3; i++) {
            await factory.createMarket(`Q${i}`, CATEGORY.LOCAL, deadline, 0, ["A", "B"], [0, 51], [50, 100]);
        }
        const all = await factory.getAllMarkets();
        const page = await factory.getMarketsPage(0, 2);
        expect(page[0]).to.equal(all[2]);
        expect(page[1]).to.equal(all[1]);
    });

    it("getMarketsPage returns empty array when offset >= total", async function () {
        const { factory } = await deployFixture();
        const page = await factory.getMarketsPage(100, 10);
        expect(page.length).to.equal(0);
    });

    it("rejects invalid category", async function () {
        const { factory } = await deployFixture();
        const deadline = (await latestTimestamp()) + ONE_DAY;
        await expect(
            factory.createMarket("Q", 5, deadline, 0, ["A", "B"], [0, 51], [50, 100])
        ).to.revert(ethers);
    });

    it("owner can update fee recipient", async function () {
        const { factory, stranger } = await deployFixture();
        await factory.setFeeRecipient(stranger.address);
        expect(await factory.feeRecipient()).to.equal(stranger.address);
    });

    it("owner can pause/unpause the factory", async function () {
        const { factory } = await deployFixture();
        await factory.pause();
        const deadline = (await latestTimestamp()) + ONE_DAY;
        await expect(
            factory.createMarket("Q", CATEGORY.LOCAL, deadline, 0, ["A", "B"], [0, 51], [50, 100])
        ).to.revert(ethers);
        await factory.unpause();
    });

    it("batchResolveMarkets resolves multiple at once", async function () {
        const { factory, token } = await deployFixture();
        const m1 = await createBtcMarket(factory, token);
        const m2 = await createBtcMarket(factory, token, { question: "ETH price?" });

        await factory.batchResolveMarkets(
            [await m1.getAddress(), await m2.getAddress()],
            [95_000, 3_500]
        );

        expect(await m1.status()).to.equal(STATUS.RESOLVED);
        expect(await m2.status()).to.equal(STATUS.RESOLVED);
    });

    it("getMarketsSummary returns batch data", async function () {
        const { factory, token } = await deployFixture();
        const m1 = await createBtcMarket(factory, token);
        const m2 = await createBtcMarket(factory, token, { question: "ETH price?" });

        const summary = await factory.getMarketsSummary([
            await m1.getAddress(),
            await m2.getAddress(),
        ]);

        expect(summary.questions[0]).to.include("BTC");
        expect(summary.questions[1]).to.include("ETH");
        expect(summary.statuses[0]).to.equal(STATUS.OPEN);
    });
});

describe("RangeFrenzyMarket — deployment & initialisation", function () {
    it("stores all 4 ranges correctly", async function () {
        const { factory, token } = await deployFixture();
        const market = await createBtcMarket(factory, token);

        expect(await market.rangesCount()).to.equal(4n);
        const ranges = await market.getAllRanges();
        expect(ranges[0].label).to.equal("< $80k");
        expect(ranges[2].lowerBound).to.equal(90_001n);
        expect(ranges[3].upperBound).to.equal(999_999_999n);
    });

    it("starts with OPEN status and zero pool", async function () {
        const { factory, token } = await deployFixture();
        const market = await createBtcMarket(factory, token);
        expect(await market.status()).to.equal(STATUS.OPEN);
        expect(await market.totalPool()).to.equal(0n);
    });

    it("rejects overlapping ranges", async function () {
        const { factory } = await deployFixture();
        const deadline = (await latestTimestamp()) + ONE_DAY;
        await expect(
            factory.createMarket(
                "Overlap",
                CATEGORY.CRYPTO,
                deadline,
                0,
                ["A", "B"],
                [0, 40],
                [50, 100]
            )
        ).to.revert(ethers);
    });

    it("rejects deadline in the past", async function () {
        const { factory } = await deployFixture();
        await expect(
            factory.createMarket("Past", CATEGORY.CRYPTO, 1, 0, ["A", "B"], [0, 51], [50, 100])
        ).to.revert(ethers);
    });

    it("rejects fewer than 2 ranges", async function () {
        const { factory } = await deployFixture();
        const deadline = (await latestTimestamp()) + ONE_DAY;
        await expect(
            factory.createMarket("One range", CATEGORY.CRYPTO, deadline, 0, ["A"], [0], [100])
        ).to.revert(ethers);
    });
});

describe("RangeFrenzyMarket — staking", function () {
    it("accepts a valid stake and updates state", async function () {
        const { factory, token, alice } = await deployFixture();
        const market = await createBtcMarket(factory, token);

        await expect(doStake(market, token, alice, 2, toWei(100)))
            .to.emit(market, "Staked")
            .withArgs(alice.address, 2n, toWei(100), toWei(100));

        expect(await market.totalPool()).to.equal(toWei(100));
        expect(await market.stakersCount()).to.equal(1n);
        expect(await market.hasStaked(alice.address)).to.be.true;

        const s = await market.userStakes(alice.address);
        expect(s.rangeIndex).to.equal(2n);
        expect(s.amount).to.equal(toWei(100));
        expect(s.claimed).to.be.false;
    });

    it("rejects double staking", async function () {
        const { factory, token, alice } = await deployFixture();
        const market = await createBtcMarket(factory, token);
        await doStake(market, token, alice, 1, toWei(50));
        await token.connect(alice).approve(await market.getAddress(), toWei(50));
        await expect(market.connect(alice).stake(1, toWei(50))).to.revert(ethers);
    });

    it("rejects amount below minStake", async function () {
        const { factory, token, alice } = await deployFixture();
        const market = await createBtcMarket(factory, token, { minStake: toWei(10) });
        await token.connect(alice).approve(await market.getAddress(), toWei(5));
        await expect(market.connect(alice).stake(1, toWei(5))).to.revert(ethers);
    });

    it("rejects staking after deadline", async function () {
        const { factory, token, alice } = await deployFixture();
        const market = await createBtcMarket(factory, token);
        await increaseTime(ONE_DAY + 1);
        await token.connect(alice).approve(await market.getAddress(), toWei(100));
        await expect(market.connect(alice).stake(1, toWei(100))).to.revert(ethers);
    });

    it("rejects staking on invalid range index", async function () {
        const { factory, token, alice } = await deployFixture();
        const market = await createBtcMarket(factory, token);
        await token.connect(alice).approve(await market.getAddress(), toWei(100));
        await expect(market.connect(alice).stake(99, toWei(100))).to.revert(ethers);
    });

    it("multiple users stake on different ranges", async function () {
        const { factory, token, alice, bob, carol } = await deployFixture();
        const market = await createBtcMarket(factory, token);

        await doStake(market, token, alice, 2, toWei(100));
        await doStake(market, token, bob, 2, toWei(200));
        await doStake(market, token, carol, 0, toWei(50));

        expect(await market.totalPool()).to.equal(toWei(350));
        expect(await market.stakersCount()).to.equal(3n);

        const ranges = await market.getAllRanges();
        expect(ranges[2].totalStaked).to.equal(toWei(300));
        expect(ranges[0].totalStaked).to.equal(toWei(50));
    });

    it("staking is blocked when market is paused", async function () {
        const { factory, token, alice } = await deployFixture();
        const market = await createBtcMarket(factory, token);

        await factory.pauseMarket(await market.getAddress());
        await token.connect(alice).approve(await market.getAddress(), toWei(100));
        await expect(market.connect(alice).stake(1, toWei(100))).to.revert(ethers);

        await factory.unpauseMarket(await market.getAddress());
        await doStake(market, token, alice, 1, toWei(100));
    });
});

describe("RangeFrenzyMarket — admin controls", function () {
    it("admin can close betting early", async function () {
        const { factory, token } = await deployFixture();
        const market = await createBtcMarket(factory, token);
        await factory.closeMarketBetting(await market.getAddress());
        expect(await market.status()).to.equal(STATUS.CLOSED);
    });

    it("staking is blocked after closeBetting", async function () {
        const { factory, token, alice } = await deployFixture();
        const market = await createBtcMarket(factory, token);
        await factory.closeMarketBetting(await market.getAddress());
        await token.connect(alice).approve(await market.getAddress(), toWei(100));
        await expect(market.connect(alice).stake(1, toWei(100))).to.revert(ethers);
    });

    it("non-owner cannot resolve", async function () {
        const { factory, token, alice } = await deployFixture();
        const market = await createBtcMarket(factory, token);
        await expect(market.connect(alice).resolve(95_000)).to.revert(ethers);
    });

    it("cannot resolve an already resolved market", async function () {
        const { factory, token } = await deployFixture();
        const market = await createBtcMarket(factory, token);
        await factory.resolveMarket(await market.getAddress(), 95_000);
        await expect(factory.resolveMarket(await market.getAddress(), 95_000)).to.revert(ethers);
    });

    it("admin can cancel and reason is emitted", async function () {
        const { factory, token } = await deployFixture();
        const market = await createBtcMarket(factory, token);
        await expect(
            factory.cancelMarket(await market.getAddress(), "Event postponed")
        )
            .to.emit(market, "MarketCancelled")
            .withArgs("Event postponed", await latestTimestamp() + 1);
        expect(await market.status()).to.equal(STATUS.CANCELLED);
    });

    it("cannot cancel a resolved market", async function () {
        const { factory, token } = await deployFixture();
        const market = await createBtcMarket(factory, token);
        await factory.resolveMarket(await market.getAddress(), 95_000);
        await expect(
            factory.cancelMarket(await market.getAddress(), "too late")
        ).to.revert(ethers);
    });
});

describe("RangeFrenzyMarket — resolution & claiming", function () {
    async function setupResolved(): Promise<DeploymentFixture & { market: Contract }> {
        const fixture = await deployFixture();
        const { factory, token, alice, bob, carol } = fixture;
        const market = await createBtcMarket(factory, token);

        await doStake(market, token, alice, 2, toWei(100));
        await doStake(market, token, bob, 2, toWei(200));
        await doStake(market, token, carol, 0, toWei(50));

        await factory.resolveMarket(await market.getAddress(), 95_000);
        return { ...fixture, market };
    }

    it("sets status to RESOLVED", async function () {
        const { market } = await setupResolved();
        expect(await market.status()).to.equal(STATUS.RESOLVED);
        expect(await market.actualOutcome()).to.equal(95_000n);
    });

    it("identifies exactly one winning range (index 2)", async function () {
        const { market } = await setupResolved();
        const winners = await market.getWinningRanges();
        expect(winners.length).to.equal(1);
        expect(winners[0]).to.equal(2n);
    });

    it("emits MarketResolved with correct fee and pool", async function () {
        const { factory, token } = await deployFixture();
        const market = await createBtcMarket(factory, token);
        const signers = await ethers.getSigners();
        const alice = signers[1];
        const bob = signers[2];

        await doStake(market, token, alice, 2, toWei(100));
        await doStake(market, token, bob, 2, toWei(200));

        await expect(factory.resolveMarket(await market.getAddress(), 95_000))
            .to.emit(market, "MarketResolved")
            .withArgs(95_000n, [2n], toWei(294), toWei(6));
    });

    it("fee is sent to feeWallet", async function () {
        const { market, token, feeWallet } = await setupResolved();
        expect(await token.balanceOf(feeWallet.address)).to.equal(toWei(7));
    });

    it("winners claim proportional payouts", async function () {
        const { market, token, alice, bob } = await setupResolved();

        const aliceBefore = await token.balanceOf(alice.address);
        await market.connect(alice).claim();
        const aliceGot = (await token.balanceOf(alice.address)) - aliceBefore;

        const bobBefore = await token.balanceOf(bob.address);
        await market.connect(bob).claim();
        const bobGot = (await token.balanceOf(bob.address)) - bobBefore;

        expect(aliceGot + bobGot).to.be.closeTo(toWei(343), 1n);

        const ratio = (bobGot * 100n) / aliceGot;
        expect(ratio).to.be.gte(199n).and.lte(201n);
    });

    it("previewPayout returns correct value before claim", async function () {
        const { market, alice } = await setupResolved();
        const preview = await market.previewPayout(alice.address);
        expect(preview).to.be.gt(0n);
        await market.connect(alice).claim();
        expect(await market.previewPayout(alice.address)).to.equal(0n);
    });

    it("losers cannot claim", async function () {
        const { market, carol } = await setupResolved();
        await expect(market.connect(carol).claim()).to.revert(ethers);
    });

    it("winners cannot double-claim", async function () {
        const { market, alice } = await setupResolved();
        await market.connect(alice).claim();
        await expect(market.connect(alice).claim()).to.revert(ethers);
    });

    it("getUserStake returns full details", async function () {
        const { market, alice } = await setupResolved();
        const info = await market.getUserStake(alice.address);
        expect(info.rangeIndex).to.equal(2n);
        expect(info.amount).to.equal(toWei(100));
        expect(info.rangeLabel).to.equal("$90k–$100k");
        expect(info.estimatedPayout).to.be.gt(0n);
    });
});

describe("RangeFrenzyMarket — cancellation & refunds", function () {
    it("stakers get full refund after cancellation", async function () {
        const { factory, token, alice, bob } = await deployFixture();
        const market = await createBtcMarket(factory, token);

        await doStake(market, token, alice, 1, toWei(100));
        await doStake(market, token, bob, 2, toWei(200));

        const aliceBefore = await token.balanceOf(alice.address);
        const bobBefore = await token.balanceOf(bob.address);

        await factory.cancelMarket(await market.getAddress(), "Test cancel");

        await market.connect(alice).refund();
        await market.connect(bob).refund();

        expect(await token.balanceOf(alice.address) - aliceBefore).to.equal(toWei(100));
        expect(await token.balanceOf(bob.address) - bobBefore).to.equal(toWei(200));
    });

    it("refund fails if market is not cancelled", async function () {
        const { factory, token, alice } = await deployFixture();
        const market = await createBtcMarket(factory, token);
        await doStake(market, token, alice, 1, toWei(100));
        await expect(market.connect(alice).refund()).to.revert(ethers);
    });

    it("cannot double-refund", async function () {
        const { factory, token, alice } = await deployFixture();
        const market = await createBtcMarket(factory, token);
        await doStake(market, token, alice, 1, toWei(100));
        await factory.cancelMarket(await market.getAddress(), "x");
        await market.connect(alice).refund();
        await expect(market.connect(alice).refund()).to.revert(ethers);
    });

    it("no fee charged on cancellation", async function () {
        const { factory, token, alice, feeWallet } = await deployFixture();
        const market = await createBtcMarket(factory, token);
        await doStake(market, token, alice, 1, toWei(100));
        const feeBefore = await token.balanceOf(feeWallet.address);
        await factory.cancelMarket(await market.getAddress(), "no fee");
        await market.connect(alice).refund();
        expect(await token.balanceOf(feeWallet.address)).to.equal(feeBefore);
    });
});

describe("RangeFrenzyMarket — edge cases", function () {
    it("outcome outside all ranges → no winners, pool stays in contract", async function () {
        const { factory, token, alice } = await deployFixture();
        const market = await createBtcMarket(factory, token);
        await doStake(market, token, alice, 1, toWei(100));

        await factory.resolveMarket(await market.getAddress(), 1_000_000_000);

        const winners = await market.getWinningRanges();
        expect(winners.length).to.equal(0);
        await expect(market.connect(alice).claim()).to.revert(ethers);
    });

    it("single player stakes and wins entire pool (minus fee)", async function () {
        const { factory, token, alice } = await deployFixture();
        const market = await createBtcMarket(factory, token);
        await doStake(market, token, alice, 2, toWei(500));

        await factory.resolveMarket(await market.getAddress(), 95_000);

        const before = await token.balanceOf(alice.address);
        await market.connect(alice).claim();
        const after = await token.balanceOf(alice.address);

        expect(after - before).to.equal(toWei(490));
    });

    it("cannot stake if market status is CLOSED", async function () {
        const { factory, token, alice } = await deployFixture();
        const market = await createBtcMarket(factory, token);
        await factory.closeMarketBetting(await market.getAddress());
        await token.connect(alice).approve(await market.getAddress(), toWei(100));
        await expect(market.connect(alice).stake(0, toWei(100))).to.revert(ethers);
    });
});

describe("Upgradeability (UUPS)", function () {
    it("factory is a UUPS proxy with upgradeable storage", async function () {
        const { factory } = await deployFixture();
        const implSlot = "0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc";
        const impl = await ethers.provider.getStorage(await factory.getAddress(), implSlot);
        expect(impl).to.not.equal(ethers.ZeroHash);
    });

    it("factory can be upgraded to a new implementation", async function () {
        const { factory } = await deployFixture();

        const upgraded = await upgradeUUPSProxy(await factory.getAddress(), "MarketFactory");

        expect(await upgraded.getAddress()).to.equal(await factory.getAddress());
        expect(await upgraded.stakeToken()).to.equal(await factory.stakeToken());
    });

    it("non-owner cannot upgrade the factory", async function () {
        const { factory, alice } = await deployFixture();

        await expect(factory.connect(alice).upgradeToAndCall(ethers.ZeroAddress, "0x")).to.revert(
            ethers
        );
    });

    it("factory can upgrade a specific market proxy", async function () {
        const { factory, token } = await deployFixture();
        const market = await createBtcMarket(factory, token);

        const NewMarketImpl = await ethers.getContractFactory("RangeFrenzyMarket");
        const newImpl = await NewMarketImpl.deploy();
        await newImpl.waitForDeployment();

        await expect(
            factory.upgradeMarket(await market.getAddress(), await newImpl.getAddress())
        ).to.emit(factory, "MarketUpgraded");
    });

    it("upgradeMarket rejects unknown market address", async function () {
        const { factory, stranger } = await deployFixture();
        const NewMarketImpl = await ethers.getContractFactory("RangeFrenzyMarket");
        const newImpl = await NewMarketImpl.deploy();
        await newImpl.waitForDeployment();

        await expect(
            factory.upgradeMarket(stranger.address, await newImpl.getAddress())
        ).to.revert(ethers);
    });
});
