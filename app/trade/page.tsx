import type { Metadata } from "next";
import RiskTicketClient from "./risk-ticket-client";
import "./trade.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Risk Ticket | HypurrScope — risk-first trading on Hyperliquid",
  description:
    "Type the dollars you accept to lose; the Risk Ticket sizes the position and places entry, stop loss and take profit on Hyperliquid in one signature.",
};

export default function TradePage() {
  return <RiskTicketClient />;
}
