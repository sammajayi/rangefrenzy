import type { Metadata, Viewport } from "next";
import "./globals.css";

import { WalletProvider } from "@/components/wallet-provider";
import RegisterSW from "@/components/register-sw";

export const metadata: Metadata = {
  title: "RangeFrenzy",
  description:
    "A range-based prediction market on Celo. Stake G$ on outcome ranges for crypto, sports, weather and local cultural/political events.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "RangeFrenzy",
  },
};

export const viewport: Viewport = {
  themeColor: "#07955F",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <meta name="talentapp:project_verification" content="97b86451041e1f4ce8c5f94b1c2820be64ac2e14715561dbdd2a8cde1ac7150fdb31461c2599f0f13d27a78ac6bf4750a0573d2ccc6b39a0babab81933c66254" />
        <link rel="apple-touch-icon" href="/icons/icon-192.svg" />
      </head>
      <body className="min-h-screen bg-background font-sans text-foreground antialiased">
        <div className="relative flex min-h-screen flex-col">
          <WalletProvider>
            <main className="flex-1">{children}</main>
          </WalletProvider>
        </div>
        <RegisterSW />
      </body>
    </html>
  );
}
