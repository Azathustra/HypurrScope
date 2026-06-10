import type { Metadata } from "next";
import "./globals.css";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "HypurrScope | BTC ETH HYPE Hyperliquid Risk Radar",
  description:
    "Track BTC, ETH and HYPE perps on Hyperliquid with live price, open interest, funding, liquidity, flow events, closest setups and alerts.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
