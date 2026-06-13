import type { Metadata } from "next";
import "./globals.css";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "HypurrScope | Risk-First Hyperliquid Execution Ticket",
  description:
    "Build BTC, ETH and HYPE Hyperliquid trade tickets from your maximum loss with position sizing, stop loss, take profit, liquidation safety, fees, slippage and execution preview.",
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
