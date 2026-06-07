"use client";

/**
 * GoodDollar helpers using @goodsdks/citizen-sdk.
 *
 * Read-only checks use the SDK's exported ABI directly with viem — no
 * SDK instantiation needed.  For face-verification (which requires message
 * signing) the IdentitySDK class is used with a connected wallet client.
 *
 * The SDK is installed at workspace root node_modules; both viem instances
 * are structurally identical so `as any` casts are safe here.
 *
 * Docs:
 *   Identity  → https://docs.gooddollar.org/for-developers/apis-and-sdks/sybil-resistance/identity-viem-wagmi
 *   Claiming  → https://docs.gooddollar.org/for-developers/apis-and-sdks/ubi/claim-ubi-viem-wagmi
 */

import { createPublicClient, http, zeroAddress } from "viem";
import { celo } from "viem/chains";
import { identityV2ABI } from "@goodsdks/citizen-sdk";

/** Shared read-only Celo client for identity checks (no wallet needed). */
const publicClient = createPublicClient({
  chain: celo,
  transport: http("https://forno.celo.org"),
});
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const celoPublicClient: any = publicClient;

/**
 * Production identity contract address on Celo.
 * (Matches the address in the GoodDollar docs.)
 */
const IDENTITY_CONTRACT = "0xC361A6E67822a0EDc17D899227dd9FC50BD62F42" as const;

/**
 * Check if an address is GoodDollar-verified on Celo.
 * Pure read via viem — no wallet or SDK instance required.
 * getWhitelistedRoot returns the root address; non-zero = whitelisted.
 */
export async function isAddressVerified(address: string): Promise<boolean> {
  try {
    const root = await publicClient.readContract({
      address: IDENTITY_CONTRACT,
      abi: identityV2ABI,
      functionName: "getWhitelistedRoot",
      args: [address as `0x${string}`],
    });
    return root !== zeroAddress;
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
    // celoPublicClient is `any` — needed to avoid viem version mismatch with SDK
    publicClient: celoPublicClient,
    walletClient,
    env: "production",
  });
  // generateFVLink(popupMode?, callbackUrl?, chainId?)
  return sdk.generateFVLink(false, callbackUrl, 42220);
}

export type { WalletClaimStatus } from "@goodsdks/citizen-sdk";
