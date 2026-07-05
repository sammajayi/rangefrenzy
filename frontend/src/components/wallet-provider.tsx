"use client";

import { PrivyProvider } from "@privy-io/react-auth";
import { WagmiProvider, createConfig } from "@privy-io/wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { celo } from "viem/chains";
import { http } from "viem";

// @privy-io/wagmi's createConfig already forces multiInjectedProviderDiscovery:
// false and its WagmiProvider already syncs Privy's wallets into wagmi
// (via an internal useSyncPrivyWallets hook) using wagmi's silent reconnect()
// path. A previous hand-rolled connector here called useSetActiveWallet()
// directly on every mount, which — with no persisted wagmi connection yet —
// always fell back to a fresh connect() against the injected provider,
// re-triggering MetaMask's approval popup on every page refresh. Removed in
// favor of relying on @privy-io/wagmi's own (safe) built-in sync.
const wagmiConfig = createConfig({
  chains: [celo],
  transports: {
    [celo.id]: http("https://forno.celo.org"),
  },
});

const queryClient = new QueryClient();

export function WalletProvider({ children }: { children: React.ReactNode }) {
  return (
    <PrivyProvider
      appId={process.env.NEXT_PUBLIC_PRIVY_APP_ID!}
      clientId={process.env.NEXT_PUBLIC_PRIVY_CLIENT_ID!}
      config={{
        loginMethods: ["email", "wallet"],
        embeddedWallets: {
          ethereum: { createOnLogin: "users-without-wallets" },
        },
        defaultChain: celo,
        supportedChains: [celo],
      }}
    >
      <QueryClientProvider client={queryClient}>
        <WagmiProvider config={wagmiConfig}>{children}</WagmiProvider>
      </QueryClientProvider>
    </PrivyProvider>
  );
}
