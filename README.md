# Range Frenzy

Range-based prediction markets on Celo. Instead of a yes/no bet, you pick the **range** an outcome will land in (a BTC price band, a match score range, a local event result) and stake G$ on it. If the final outcome falls inside your range, you share the pool with the other winners.

Range Frenzy is built on [GoodDollar](https://www.gooddollar.org): G$ is the stake token, and GoodDollar's face verification helps keep spam and bots out and onboards real humans, one person per account.

Live app: https://app.rangefrenzy.xyz

## Why GoodDollar

[GoodDollar](https://www.gooddollar.org) (G$) is a universal basic income token. Verified people claim a small amount of G$ every day for free. Range Frenzy is built around that flow:

- **G$ is the stake token.** Every market is staked, won and refunded in G$, so the money people already receive as UBI has somewhere to go.
- **Daily claims are built in.** Users verify with GoodDollar face verification (checked on-chain through the citizen SDK) and claim their daily G$ inside the app. Claiming needs no money up front, which makes it the on-ramp for people with no crypto.
- **Claim it, then play it.** The pitch is "Earn daily G$, 10x it with Range Frenzy": the UBI you claim in the morning can be staked on a market that afternoon.
- **One person, one account.** Verification gives a sybil-resistant identity, which keeps the first-bet, streak and referral rewards in the Earn tab from being farmed with throwaway wallets.

## How it works

- **Markets** are created by the admin through the `MarketFactory`. Each market is its own UUPS proxy of `RangeFrenzyMarket`, with a question, a category (Crypto, Sports, Local), a resolution deadline and a set of ranges.
- **Staking**: pick a range and stake G$. Entry price follows a bonding curve, so popular ranges get more expensive: `price = initialPrice + multiplier * totalStaked / 1e18`, with an optional price cap. Your stake buys shares at the current price.
- **One position per wallet**: sell your position back to the curve at the current price before moving to another range.
- **Resolution**: the admin submits the actual outcome. A 2% fee goes to the fee recipient and the rest of the pool is split among holders of winning ranges, proportional to shares.
- **Claim or refund**: winners call `claim()`. If a market is cancelled, everyone gets their original stake back through `refund()`.
- **Safety**: reentrancy guards, pausable markets, two-step ownership and UUPS upgrades restricted to the owner.

## Repository layout

```
contracts/             Solidity contracts, Hardhat 3 tests, deploy and upgrade scripts
frontend/              Next.js app (PWA, MiniPay friendly)
rangefrenzy-subgraph/  The Graph subgraph indexing the factory and markets
prd.md                 Original product blueprint
```

## Tech stack

| Layer | Choice |
|---|---|
| Contracts | Solidity, Hardhat 3, OpenZeppelin (upgradeable) |
| Chain | Celo mainnet (chain ID 42220) |
| Stake token | G$ (GoodDollar) |
| Frontend | Next.js 16, React 19, Tailwind CSS 4 |
| Wallets | Privy and Web3Auth (email and social login), wagmi and viem |
| Identity and UBI claims | GoodDollar citizen SDK (face verification, daily G$ claim) |
| Indexing | The Graph (`graphql-request` on the client) |
| Backend data | Supabase (profiles, stakes, rewards, notifications) |
| Push | Web Push with VAPID keys |
| Hosting | Vercel |

## Features

**Public**
- Home with active markets and category filters
- Market page with live range distribution, price chart and stake modal
- My Bets for active and past positions, with claim and refund
- Leaderboard of top earners
- Profile with balances (CELO and G$), history and PnL
- Earn tab: first-bet bonus, daily streak, referrals and social-follow rewards
- Shareable bet and market cards with generated Open Graph images
- Installable PWA with push notifications

**Admin** (`/admin`, protected)
- Create markets, close betting, resolve, cancel, pause and unpause
- View all markets and their status

## Getting started

### Prerequisites

- Node.js 20 or newer
- npm (the root workspace uses npm; the frontend also ships a pnpm lockfile)
- A Supabase project, a Privy app, and a Celo RPC endpoint for deployments

### Install

```bash
npm install
```

### Run the frontend

```bash
npm run dev      # http://localhost:3000
npm run build
```

Create `frontend/.env.local` with the variables listed under [Environment variables](#environment-variables).

### Contracts

```bash
npm run compile
npm run test:contracts

cd contracts
npm run deploy     # hardhat run scripts/deploy.ts --network celo
npm run upgrade    # hardhat run scripts/upgrade.ts --network celo
```

Deploy and upgrade scripts read `CELO_RPC_URL` and `CELO_PRIVATE_KEY` through Hardhat config variables (`npx hardhat keystore set CELO_PRIVATE_KEY`), plus the script variables below.

### Database

Run `frontend/supabase-schema.sql` in the Supabase SQL editor. It is idempotent and safe to re-run. It extends `profiles` and `markets` and creates `stakes`, `social_rewards`, `notifications`, `bonus_earnings`, `referrals` and `push_subscriptions`. `supabase-rls-fix.sql` at the repo root holds the row-level security fixes.

### Subgraph

```bash
cd rangefrenzy-subgraph
yarn codegen
yarn build
yarn deploy           # The Graph Studio
yarn deploy-local     # local graph-node via docker-compose
```

The factory address and start block live in `networks.json`. Point `NEXT_PUBLIC_SUBGRAPH_URL` at the deployed endpoint.

## Environment variables

**Frontend** (`frontend/.env.local`)

| Variable | Purpose |
|---|---|
| `NEXT_PUBLIC_FACTORY_ADDRESS` | MarketFactory proxy address |
| `NEXT_PUBLIC_G_TOKEN_ADDRESS` | G$ token address |
| `NEXT_PUBLIC_STAKE_TOKEN` | Stake token address |
| `NEXT_PUBLIC_USDM_CELO` | USDm token address on Celo |
| `NEXT_PUBLIC_SUBGRAPH_URL` | Subgraph query endpoint |
| `NEXT_PUBLIC_PRIVY_APP_ID`, `NEXT_PUBLIC_PRIVY_CLIENT_ID` | Privy auth |
| `NEXT_PUBLIC_WEB3AUTH_CLIENT_ID` | Web3Auth |
| `NEXT_PUBLIC_WC_PROJECT_ID` | WalletConnect |
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Supabase client |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase server routes (never expose to the client) |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` | Web Push |
| `NEXT_PUBLIC_ADMIN_PASSWORD` | Admin route gate |

**Contract scripts**

| Variable | Used by | Purpose |
|---|---|---|
| `STAKE_TOKEN` | deploy | Stake token (G$ on mainnet) |
| `FEE_RECIPIENT` | deploy | Receives the 2% resolution fee |
| `FACTORY_PROXY`, `MARKET_PROXY`, `NEW_IMPL` | upgrade | Proxy and implementation addresses |

## Deployment (Celo mainnet)

| Contract | Address |
|---|---|
| G$ token | `0x62B8B11039FcfE5aB0C56E502b1C372A3d2a9c7A` |
| RangeFrenzyMarket implementation | `0xF056d73Bf1f8a26221F3429899e1263fBa0125c7` |
| MarketFactory (UUPS proxy) | `0xbC03d88dDCB1c5996533DF4C3c3F865b789717c4` |
| Example BTC market | `0x665Ea3c8e5f0084E2a73E1a50884492b0b607Ee4` |

ABIs and a flattened factory source are in `contracts/flattened/`.

## Notes

- Resolution is manual by the admin. There is no oracle or dispute process in this version.
- The admin gate on the frontend is a convenience, not a security boundary. Contract calls are protected by `onlyOwner` on-chain.
