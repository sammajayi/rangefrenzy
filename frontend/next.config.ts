import type { NextConfig } from "next";
import path from "path";

const solanaStubAbs = path.resolve("./src/lib/stubs/solana.js");
const solanaStubRel = "./src/lib/stubs/solana.js";

// Turbopack has no regex alias support — list every known package in the chain.
// Webpack uses NormalModuleReplacementPlugin below (one regex covers all of them).
const turbopackSolanaAliases: Record<string, string> = {
  "x402": solanaStubRel,
  "@solana-program/system": solanaStubRel,
  "@solana-program/token": solanaStubRel,
  "@solana-program/token-2022": solanaStubRel,
  "@solana/web3.js": solanaStubRel,
  "@solana/spl-token": solanaStubRel,
  "@solana/addresses": solanaStubRel,
  "@solana/rpc-types": solanaStubRel,
  "@solana/sysvars": solanaStubRel,
  "@solana/codecs-core": solanaStubRel,
  "@solana/codecs-strings": solanaStubRel,
  "@solana/codecs-data-structures": solanaStubRel,
  "@solana/codecs-numbers": solanaStubRel,
  "@solana/assertions": solanaStubRel,
  "@solana/errors": solanaStubRel,
  "@solana/keys": solanaStubRel,
  "@solana/signers": solanaStubRel,
  "@solana/transactions": solanaStubRel,
  "@solana/rpc": solanaStubRel,
  "@solana/kit": solanaStubRel,
  "@solana-program/compute-budget": solanaStubRel,
  "@solana-program/associated-token-account": solanaStubRel,
};

const nextConfig: NextConfig = {
  allowedDevOrigins: ["fef3-105-119-2-153.ngrok-free.app"],
  images: {
    remotePatterns: [{ protocol: "https", hostname: "**" }],
  },
  headers: async () => [
    {
      source: "/sw.js",
      headers: [
        { key: "Cache-Control", value: "public, max-age=0, must-revalidate" },
        { key: "Service-Worker-Allowed", value: "/" },
      ],
    },
  ],
  turbopack: {
    resolveAlias: turbopackSolanaAliases,
  },
  webpack: (config, { webpack }) => {
    // Single regex replaces the entire x402 + @solana/* + @solana-program/* chain
    config.plugins.push(
      new webpack.NormalModuleReplacementPlugin(
        /^(x402$|@solana\/|@solana-program\/)/,
        solanaStubAbs
      )
    );
    config.resolve.alias = {
      ...config.resolve.alias,
      "pino-pretty": false,
      "@react-native-async-storage/async-storage": false,
    };
    return config;
  },
};

export default nextConfig;
