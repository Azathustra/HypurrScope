import type { Metadata } from "next";
import "./globals.css";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "HypurrScope | Hyperliquid Trade Planner",
  description:
    "Plan BTC, ETH and HYPE Hyperliquid trades from target profit and max total risk with position sizing, stop loss, liquidation distance, costs and execution preview.",
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
