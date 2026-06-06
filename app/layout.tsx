import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";

export const metadata: Metadata = {
  title: "HypurrScope",
  description: "A live Hyperliquid market, TWAP, buyback, NFT and wallet analytics console.",
  openGraph: {
    title: "HypurrScope",
    description: "Live Hyperliquid dashboard for HYPE, perps, TWAP flow, Hypurr NFTs and wallet scans.",
    type: "website",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
