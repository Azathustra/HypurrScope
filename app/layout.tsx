import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "HypurrScope",
  description: "HYPE market console for Hyperliquid",
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
