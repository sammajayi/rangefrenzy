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
  transpilePackages: ["@web3auth/modal"],
  webpack: (config, { isServer }) => {
    // Stub out optional/native-only deps that appear in browser bundles
    config.resolve.alias = {
      ...config.resolve.alias,
      "pino-pretty": false,
      "@react-native-async-storage/async-storage": false,
    };

    if (!isServer) {
      // Polyfill stubs for Node built-ins referenced by Web3Auth / WalletConnect
      config.resolve.fallback = {
        ...config.resolve.fallback,
        crypto: false,
        stream: false,
        http: false,
        https: false,
        zlib: false,
        url: false,
        buffer: false,
      };

      // Increase chunk-load timeout — Web3Auth's vendor bundle is large
      config.output.chunkLoadTimeout = 120_000;

      // Consolidate all @web3auth/* into one vendor chunk so webpack doesn't
      // produce dozens of tiny async chunks that race against the timeout
      const existingCacheGroups =
        config.optimization?.splitChunks?.cacheGroups ?? {};
      config.optimization = {
        ...config.optimization,
        splitChunks: {
          ...config.optimization?.splitChunks,
          cacheGroups: {
            ...existingCacheGroups,
            web3auth: {
              test: /[\\/]node_modules[\\/]@web3auth[\\/]/,
              name: "vendor-web3auth",
              chunks: "all",
              priority: 20,
              enforce: true,
            },
          },
        },
      };
    }

    return config;
  },
};

export default nextConfig;
