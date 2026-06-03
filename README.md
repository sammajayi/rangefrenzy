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
