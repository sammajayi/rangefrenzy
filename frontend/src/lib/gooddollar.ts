"use client";

/**
 * GoodDollar helpers using @goodsdks/citizen-sdk.
 *
 * The SDK is installed at workspace root node_modules; both viem instances
 * are structurally identical so `as any` casts are safe here.
 *
 * Docs:
 *   Identity  → https://docs.gooddollar.org/for-developers/apis-and-sdks/sybil-resistance/identity-viem-wagmi
 *   Claiming  → https://docs.gooddollar.org/for-developers/apis-and-sdks/ubi/claim-ubi-viem-wagmi
 */

import { createPublicClient, http } from "viem";
import { celo } from "viem/chains";

/** Shared read-only Celo client for identity checks (no wallet needed). */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const celoPublicClient: any = createPublicClient({
  chain: celo,
  transport: http("https://forno.celo.org"),
});

/**
 * Check if an address is GoodDollar-verified on Celo.
 * Pure read — no wallet required.
 */
export async function isAddressVerified(address: string): Promise<boolean> {
  try {
    const { IdentitySDK } = await import("@goodsdks/citizen-sdk");
    const sdk = new IdentitySDK({
      publicClient: celoPublicClient,
      // walletClient not needed for read-only; cast satisfies required type
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      walletClient: undefined as any,
      env: "production",
    });
    const { isWhitelisted } = await sdk.getWhitelistedRoot(
      address as `0x${string}`
    );
    return isWhitelisted;
  } catch {
    return false;
  }
}

/**
 * Generate a GoodDollar Face Verification link.
 * Requires a connected walletClient because the SDK signs an identifier message.
 *
 * @param walletClient  - The connected wagmi wallet client (cast to any for cross-viem compat)
 * @param callbackUrl   - Where GoodDollar should redirect after verification
 */
export async function generateFVLink(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  walletClient: any,
  callbackUrl: string
): Promise<string> {
  const { IdentitySDK } = await import("@goodsdks/citizen-sdk");
  const sdk = new IdentitySDK({
    publicClient: celoPublicClient,
    walletClient,
    env: "production",
  });
  // generateFVLink(popupMode?, callbackUrl?, chainId?)
  return sdk.generateFVLink(false, callbackUrl, 42220);
}

export type { WalletClaimStatus } from "@goodsdks/citizen-sdk";
