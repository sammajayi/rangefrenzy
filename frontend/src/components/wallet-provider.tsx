"use client";

import { useEffect } from "react";
import { PrivyProvider, useWallets } from "@privy-io/react-auth";
import { WagmiProvider, createConfig, useSetActiveWallet } from "@privy-io/wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { celo } from "viem/chains";
import { http } from "viem";

const wagmiConfig = createConfig({
  chains: [celo],
  transports: {
    [celo.id]: http("https://forno.celo.org"),
  },
});

const queryClient = new QueryClient();

function PrivyWagmiConnector({ children }: { children: React.ReactNode }) {
  const { wallets } = useWallets();
  const { setActiveWallet } = useSetActiveWallet();

  useEffect(() => {
    if (wallets.length === 0) return;
    const embedded = wallets.find((w) => w.walletClientType === "privy") ?? wallets[0];
    setActiveWallet(embedded);
  }, [wallets, setActiveWallet]);

  return <>{children}</>;
}

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
        <WagmiProvider config={wagmiConfig}>
          <PrivyWagmiConnector>{children}</PrivyWagmiConnector>
        </WagmiProvider>
      </QueryClientProvider>
    </PrivyProvider>
  );
}
