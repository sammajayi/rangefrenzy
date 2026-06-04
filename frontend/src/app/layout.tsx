import type { Metadata, Viewport } from "next";
import "./globals.css";

import { Navbar } from "@/components/navbar";
import { WalletProvider } from "@/components/wallet-provider";
import RegisterSW from "@/components/register-sw";

export const metadata: Metadata = {
  title: "RangeFrenzy",
  description:
    "Range-based predictions on Celo. Predict the range. Win the game.",
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
        <link rel="apple-touch-icon" href="/icons/icon-192.svg" />
      </head>
      <body className="min-h-screen bg-background font-sans text-foreground antialiased">
        <div className="relative flex min-h-screen flex-col">
          <WalletProvider>
            <Navbar />
            <main className="flex-1">{children}</main>
          </WalletProvider>
        </div>
        <RegisterSW />
      </body>
    </html>
  );
}
