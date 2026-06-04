import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["fef3-105-119-2-153.ngrok-free.app"],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
    ],
  },
  headers: async () => [
    {
      source: "/sw.js",
      headers: [
        {
          key: "Cache-Control",
          value: "public, max-age=0, must-revalidate",
        },
        {
          key: "Service-Worker-Allowed",
          value: "/",
        },
      ],
    },
  ],
  webpack: (config) => {
    // pino-pretty is an optional CLI formatter — not needed in the browser.
    // WalletConnect's pino logger tries to require it; stub it out.
    config.resolve.alias = {
      ...config.resolve.alias,
      "pino-pretty": false,
      // MetaMask SDK pulls in React Native async-storage in its browser bundle.
      // Stub it out so webpack doesn't error on the missing native module.
      "@react-native-async-storage/async-storage": false,
    };
    return config;
  },
};

export default nextConfig;
