import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "HypurrScope",
  description: "Hyperliquid ecosystem intelligence for markets, whales, vaults, Hypurr NFTs and TradFi flows."
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
