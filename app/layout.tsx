import type { Metadata } from "next";
import "./globals.css";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "HypurrScope | BTC ETH HYPE Risk Radar",
  description:
    "Read-only Hyperliquid risk radar for BTC, ETH and HYPE market structure, flow, OI, funding and alert-ready setups.",
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
