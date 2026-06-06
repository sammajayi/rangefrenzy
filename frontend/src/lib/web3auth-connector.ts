import { env } from "@/lib/env";

const clientId = env.NEXT_PUBLIC_WEB3AUTH_CLIENT_ID ||
  "BPi5PB_UiIZ-cPz1GtV5i1I2iOSOHuimiXBI0e-Ux9q2qCnxRaFdWgbCXJdVJ_O_3GOeSsYJY-vHJGKcyN6iQ0";

let web3AuthInstance: InstanceType<typeof import("@web3auth/modal").Web3Auth> | null = null;
let initPromise: Promise<void> | null = null;

async function getWeb3Auth() {
  if (!web3AuthInstance) {
    const { Web3Auth } = await import("@web3auth/modal");
    const { CHAIN_NAMESPACES, WEB3AUTH_NETWORK } = await import("@web3auth/base");

    web3AuthInstance = new Web3Auth({
      clientId,
      web3AuthNetwork: WEB3AUTH_NETWORK.SAPPHIRE_MAINNET,
      chains: [
        {
          chainNamespace: CHAIN_NAMESPACES.EIP155,
          chainId: "0xa4ec",
          rpcTarget: "https://forno.celo.org",
          displayName: "Celo Mainnet",
          blockExplorerUrl: "https://celoscan.io",
          ticker: "CELO",
          tickerName: "Celo",
        },
      ],
      defaultChainId: "0xa4ec",
    });
  }
  return web3AuthInstance;
}

export async function initWeb3Auth() {
  const instance = await getWeb3Auth();
  if (!initPromise) {
    initPromise = instance.init();
  }
  await initPromise;
  return instance;
}

export async function loginWithWeb3Auth(email: string) {
  const instance = await initWeb3Auth();
  const connection = await instance.connectTo("auth", {
    loginProvider: "email_passwordless",
    loginHint: email,
  });
  return connection?.ethereumProvider ?? null;
}

export async function logoutWeb3Auth() {
  if (!web3AuthInstance) return;
  if (web3AuthInstance.connected) {
    await web3AuthInstance.logout();
  }
}

export async function getWeb3AuthAddress(): Promise<string | null> {
  if (!web3AuthInstance?.connected || !web3AuthInstance.connection?.ethereumProvider) return null;
  const { createWalletClient, custom } = await import("viem");
  const { celo } = await import("wagmi/chains");
  const walletClient = createWalletClient({
    chain: celo,
    transport: custom(web3AuthInstance.connection.ethereumProvider),
  });
  const [address] = await walletClient.getAddresses();
  return address ?? null;
}
