"use client";

/**
 * Helpers for resolving the active Privy wallet.
 *
 * Prefers the embedded wallet (walletClientType === 'privy') when available
 * (email sign-in users). Falls back to the first connected wallet so that
 * external-wallet users (MetaMask, WalletConnect, etc.) can also use
 * GoodDollar identity + UBI claim operations.
 */

import type { ConnectedWallet } from "@privy-io/react-auth";
import { createWalletClient, custom } from "viem";
import { celo } from "viem/chains";

export const ACTIVE_CHAIN = celo;

/**
 * Returns the active wallet from the wallets array.
 * Prefers the embedded wallet if present, otherwise uses the first connected wallet.
 * Throws if no wallets are available at all.
 */
export function getEmbeddedWallet(wallets: ConnectedWallet[]): ConnectedWallet {
  const embedded = wallets.find((w) => w.walletClientType === "privy");
  const wallet = embedded ?? wallets[0];
  if (!wallet) throw new Error("No wallet found. Please sign in again.");
  return wallet;
}

/**
 * Ensures the given wallet is connected to Celo, switching it automatically
 * if it's on a different network. Embedded (Privy) wallets switch silently;
 * external wallets (MetaMask, WalletConnect, etc.) will prompt the user
 * inside their own wallet UI. Throws a friendly error if the user rejects
 * the switch or the wallet doesn't support the Celo network.
 */
export async function ensureCeloChain(wallet: ConnectedWallet): Promise<void> {
  const targetCaip = `eip155:${celo.id}`;
  if (wallet.chainId === targetCaip) return;

  try {
    await wallet.switchChain(celo.id);
  } catch {
    throw new Error(
      "Please switch your wallet's network to Celo to continue."
    );
  }
}

/**
 * Builds a viem WalletClient from the active Privy wallet.
 * Used for GoodDollar identity + UBI claim operations.
 *
 * Automatically detects and switches the wallet to Celo first — this app
 * only operates on Celo, but externally-connected wallets (MetaMask, etc.)
 * may default to a different network (e.g. Ethereum mainnet).
 */
export async function buildEmbeddedViemClient(
  wallets: ConnectedWallet[],
  address: string
) {
  const wallet = getEmbeddedWallet(wallets);
  await ensureCeloChain(wallet);
  const provider = await wallet.getEthereumProvider();
  return createWalletClient({
    account: address as `0x${string}`,
    chain: celo,
    transport: custom(provider),
  });
}
