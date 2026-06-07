/**
 * On-chain contract ABIs and address helpers for RangeFrenzy.
 *
 * Set these env vars in .env.local after deploying:
 *   NEXT_PUBLIC_FACTORY_ADDRESS   — MarketFactory proxy address
 *   NEXT_PUBLIC_G_TOKEN_ADDRESS   — G$ ERC20 address on Celo
 */

// ── Addresses ─────────────────────────────────────────────────────────────────

export const FACTORY_ADDRESS = (process.env.NEXT_PUBLIC_FACTORY_ADDRESS ?? "") as `0x${string}`;

// Deployer address — the only wallet allowed to create/resolve markets on-chain
export const DEPLOYER_ADDRESS = "0x6136c315631f8bf6c0ddc2c948e4908a63b26f55".toLowerCase() as `0x${string}`;

// G$ token on Celo mainnet: 0x62B8B11039FcfE5aB0C56E502b1C372A3d2a9c7A
// G$ token on Alfajores:    0x23b7a53ecE33D6E4B0ADB31B07C6B88d3f598f69
export const G_TOKEN_ADDRESS = (
  process.env.NEXT_PUBLIC_G_TOKEN_ADDRESS ??
  process.env.NEXT_PUBLIC_STAKE_TOKEN ??
  "0x62B8B11039FcfE5aB0C56E502b1C372A3d2a9c7A"
) as `0x${string}`;

// Alias used by our staking hooks
export const STAKE_TOKEN_ADDRESS = G_TOKEN_ADDRESS;

// ── RangeFrenzyMarket ABI (per-market proxy) ──────────────────────────────────

export const MARKET_ABI = [
  // Read
  {
    name: "getMarketSummary",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [
      { name: "question",     type: "string" },
      { name: "cat",          type: "uint8" },
      { name: "deadline",     type: "uint256" },
      { name: "marketStatus", type: "uint8" },
      { name: "pool",         type: "uint256" },
      { name: "numStakers",   type: "uint256" },
      { name: "outcome",      type: "uint256" },
      { name: "isPaused",     type: "bool" },
    ],
  },
  {
    name: "getUserStake",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "user", type: "address" }],
    outputs: [
      { name: "rangeIndex",      type: "uint256" },
      { name: "amount",          type: "uint256" },
      { name: "claimed",         type: "bool" },
      { name: "rangeLabel",      type: "string" },
      { name: "estimatedPayout", type: "uint256" },
    ],
  },
  {
    name: "hasStaked",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "user", type: "address" }],
    outputs: [{ type: "bool" }],
  },
  {
    name: "totalPool",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "uint256" }],
  },
  {
    name: "minStakeAmount",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "uint256" }],
  },
  {
    name: "getAllRanges",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "tuple[]",
        components: [
          { name: "label",       type: "string" },
          { name: "lowerBound",  type: "uint256" },
          { name: "upperBound",  type: "uint256" },
          { name: "totalStaked", type: "uint256" },
        ],
      },
    ],
  },
  {
    name: "previewPayout",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "user", type: "address" }],
    outputs: [{ type: "uint256" }],
  },
  // Write
  {
    name: "stake",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "rangeIndex", type: "uint256" },
      { name: "amount",     type: "uint256" },
    ],
    outputs: [],
  },
  {
    name: "claim",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [],
    outputs: [],
  },
  {
    name: "refund",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [],
    outputs: [],
  },
  {
    name: "resolve",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [{ name: "_actualOutcome", type: "uint256" }],
    outputs: [],
  },
  // Events
  {
    name: "Staked",
    type: "event",
    inputs: [
      { name: "user",         type: "address", indexed: true },
      { name: "rangeIndex",   type: "uint256", indexed: true },
      { name: "amount",       type: "uint256", indexed: false },
      { name: "newTotalPool", type: "uint256", indexed: false },
    ],
  },
] as const;

// ── ERC20 ABI (G$ token — approve + balanceOf) ────────────────────────────────

export const ERC20_ABI = [
  {
    name: "balanceOf",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ type: "uint256" }],
  },
  {
    name: "allowance",
    type: "function",
    stateMutability: "view",
    inputs: [
      { name: "owner",   type: "address" },
      { name: "spender", type: "address" },
    ],
    outputs: [{ type: "uint256" }],
  },
  {
    name: "symbol",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "string" }],
  },
  {
    name: "decimals",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "uint8" }],
  },
  {
    name: "approve",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount",  type: "uint256" },
    ],
    outputs: [{ type: "bool" }],
  },
] as const;

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Format raw G$ wei (18 decimals) to human-readable string */
export function formatGD(wei: bigint, decimals = 2): string {
  return (Number(wei) / 1e18).toFixed(decimals);
}

/** Parse G$ human amount to wei bigint */
export function parseGD(amount: string): bigint {
  return BigInt(Math.round(parseFloat(amount) * 1e18));
}

// ── Aliases for backward compatibility with staking hooks ────────────────────

export const rangeFrenzyMarketAbi = MARKET_ABI;
export const erc20Abi = ERC20_ABI;

// MarketFactory ABI (CRYPTO=0, SPORTS=1, LOCAL=2)
export const CATEGORY_MAP: Record<string, number> = {
  Crypto: 0, Sports: 1, Weather: 1, Stocks: 0, Local: 2,
};

export const marketFactoryAbi = [
  {
    name: "createMarket",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "_question", type: "string" },
      { name: "_category", type: "uint8" },
      { name: "_resolutionDeadline", type: "uint256" },
      { name: "_minStakeAmount", type: "uint256" },
      { name: "_rangeLabels", type: "string[]" },
      { name: "_lowerBounds", type: "uint256[]" },
      { name: "_upperBounds", type: "uint256[]" },
    ],
    outputs: [{ name: "proxyAddress", type: "address" }],
  },
  {
    name: "MarketCreated",
    type: "event",
    inputs: [
      { name: "marketProxy", type: "address", indexed: true },
      { name: "implementation", type: "address", indexed: true },
      { name: "question", type: "string", indexed: false },
      { name: "category", type: "uint8", indexed: false },
      { name: "resolutionDeadline", type: "uint256", indexed: false },
      { name: "minStakeAmount", type: "uint256", indexed: false },
      { name: "createdAt", type: "uint256", indexed: false },
    ],
  },
  {
    name: "getMarketsPage",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "offset", type: "uint256" }, { name: "limit", type: "uint256" }],
    outputs: [{ name: "page", type: "address[]" }],
  },
  {
    name: "getAllMarkets",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "address[]" }],
  },
  {
    name: "totalMarkets",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "uint256" }],
  },
  {
    name: "stakeToken",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "address" }],
  },
] as const;

// MarketStatus mirrors the on-chain enum
export const MarketStatus = {
  OPEN: 0,
  CLOSED: 1,
  RESOLVED: 2,
  CANCELLED: 3,
} as const;
export type MarketStatusValue = (typeof MarketStatus)[keyof typeof MarketStatus];

// Types used by staking hooks
export type OnChainRange = {
  label: string;
  lowerBound: bigint;
  upperBound: bigint;
  totalStaked: bigint;
};

export type OnChainMarketSummary = {
  question: string;
  category: number;
  deadline: bigint;
  status: MarketStatusValue;
  pool: bigint;
  numStakers: bigint;
  outcome: bigint;
  isPaused: boolean;
  ranges: OnChainRange[];
};

export type OnChainUserStake = {
  rangeIndex: bigint;
  amount: bigint;
  claimed: boolean;
  rangeLabel: string;
  estimatedPayout: bigint;
};
