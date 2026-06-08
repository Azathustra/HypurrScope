import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "HypurrScope Pro | Hyperliquid Market Intelligence",
  description:
    "Read-only Hyperliquid intelligence console for HYPE, perps, liquidity, wallet risk, and builder-grade transparency.",
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
