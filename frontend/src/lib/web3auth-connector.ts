const clientId = "BKRVGx8WqBisbqUUuKUo8dYV5yyyAZgrOOey3UauXJq47XHGlorZLGv8kA_OcmLAWrShLDSetuwsx3G8MOVBawQ";
const web3AuthNetwork = (process.env.NEXT_PUBLIC_WEB3AUTH_NETWORK ?? "sapphire_devnet") as "sapphire_devnet" | "sapphire_mainnet";

let web3AuthInstance: InstanceType<typeof import("@web3auth/modal").Web3Auth> | null = null;
let initPromise: Promise<void> | null = null;

async function getWeb3Auth() {
  if (!web3AuthInstance) {
    const { Web3Auth } = await import("@web3auth/modal");

    web3AuthInstance = new Web3Auth({
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
    });
  }
  return web3AuthInstance;
}

export async function initWeb3Auth() {
  const instance = await getWeb3Auth();
  if (!initPromise) {
    initPromise = instance.init().catch((err) => {
      initPromise = null;
      throw err;
    });
  }
  await initPromise;
  if (instance.status !== "ready") {
    await new Promise<void>((resolve) => {
      instance.once("ready", () => resolve());
    });
  }
  return instance;
}

export async function loginWithWeb3Auth(email: string) {
  const instance = await initWeb3Auth();
  const connection = await instance.connectTo("auth", {
    authConnection: "email_passwordless",
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

export async function getAddressFromProvider(
  ethereumProvider: NonNullable<Awaited<ReturnType<typeof loginWithWeb3Auth>>>
): Promise<string | null> {
  const { createWalletClient, custom } = await import("viem");
  const { celo } = await import("wagmi/chains");
  const walletClient = createWalletClient({
    chain: celo,
    transport: custom(ethereumProvider),
  });
  const [address] = await walletClient.getAddresses();
  return address ?? null;
}
