/** Celo mainnet token addresses for balance reads */
export const CELO_TOKEN = {
  cUSD: "0x765DE816845861e75A25fCA122bb6898B8B1282a" as const,
  cUSDM: "0x765DE816845861e75A25fCA122bb6898B8B1282a" as const,
  USDC: "0xcebA9300f2b948710d2653dD7B07f33A8B32118C" as const,
} as const;

/** Set `NEXT_PUBLIC_USDM_CELO` when your USDm contract is known on this chain. */
export function getUsdmTokenAddress(): `0x${string}` | undefined {
  const v = process.env.NEXT_PUBLIC_USDM_CELO;
  return v && v.startsWith("0x") ? (v as `0x${string}`) : undefined;
}
