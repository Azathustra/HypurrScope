import type { Metadata } from "next";
import "./globals.css";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "HypurrScope | Hyperliquid Fixed Max Loss Risk Ticket",
  description:
    "Build BTC, ETH and HYPE Hyperliquid trade tickets from a fixed dollar risk with position sizing, stop loss, take profit, fees, slippage and liquidation preview.",
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
