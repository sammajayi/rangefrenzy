import type { Web3AuthContextConfig } from "@web3auth/modal/react";

const clientId = "BKRVGx8WqBisbqUUuKUo8dYV5yyyAZgrOOey3UauXJq47XHGlorZLGv8kA_OcmLAWrShLDSetuwsx3G8MOVBawQ";
const web3AuthNetwork = (
  process.env.NEXT_PUBLIC_WEB3AUTH_NETWORK ?? "sapphire_devnet"
) as "sapphire_devnet" | "sapphire_mainnet";

export const web3AuthContextConfig: Web3AuthContextConfig = {
  web3AuthOptions: {
    clientId,
    web3AuthNetwork,
    chains: [
      {
        chainNamespace: "eip155",
        chainId: "0xa4ec",
        rpcTarget: "https://forno.celo.org",
        displayName: "Celo Mainnet",
        blockExplorerUrl: "https://celoscan.io",
        ticker: "CELO",
        tickerName: "Celo",
        logo: "",
      },
    ],
    defaultChainId: "0xa4ec",
  },
};
