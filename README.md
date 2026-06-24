# Range Frenzy

Monorepo with separate **contracts** (Hardhat) and **frontend** (Next.js) workspaces.

## Structure

```
contracts/   # Solidity, Hardhat tests, deployment modules
frontend/    # Next.js app
```

## Commands

From the repo root:

```bash
# Install all dependencies
npm install

# Frontend
npm run dev          # http://localhost:3000
npm run build

# Contracts
npm run compile
npm run test:contracts
```

Or run commands inside each workspace:

```bash
cd frontend && npm run dev
cd contracts && npx hardhat test
```






```
═══════════════════════════════════════════
  RangeFrenzy Deployment
═══════════════════════════════════════════
  Network:  celo
  Deployer: 0x6136C315631F8BF6c0DdC2C948e4908a63B26F55
  Balance:  5.766999633483873716 CELO

  Using G$ mainnet token: 0x62B8B11039FcfE5aB0C56E502b1C372A3d2a9c7A
  Fee recipient:    0x6136C315631F8BF6c0DdC2C948e4908a63B26F55

[1/3] Deploying RangeFrenzyMarket implementation...
  Implementation: 0xF056d73Bf1f8a26221F3429899e1263fBa0125c7

[2/3] Deploying MarketFactory proxy (UUPS)...
  Factory proxy:  0xbC03d88dDCB1c5996533DF4C3c3F865b789717c4

[3/3] Creating example BTC market...
  Example market proxy: 0x665Ea3c8e5f0084E2a73E1a50884492b0b607Ee4

═══════════════════════════════════════════
  DEPLOYMENT COMPLETE
═══════════════════════════════════════════
  StakeToken:            0x62B8B11039FcfE5aB0C56E502b1C372A3d2a9c7A
  MarketImpl:            0xF056d73Bf1f8a26221F3429899e1263fBa0125c7
  MarketFactory (proxy): 0xbC03d88dDCB1c5996533DF4C3c3F865b789717c4
  Example Market:        0x665Ea3c8e5f0084E2a73E1a50884492b0b607Ee4
```