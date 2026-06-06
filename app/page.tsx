"use client";

import { ExternalLink, Search, ShieldAlert, Waves, Wallet } from "lucide-react";

const navItems = [
  { label: "Overview", description: "Investor dashboard" },
  { label: "Markets", description: "HYPE + perps" },
  { label: "Buybacks", description: "AF pressure" },
  { label: "HYPE TWAP", description: "Live tape" },
  { label: "Hypurr NFTs", description: "Sales + floor" },
  { label: "HLP", description: "Yield monitor" },
  { label: "ETF volumes", description: "Daily volume" },
  { label: "Wallet scan", description: "Risk lookup" },
];

const markets = [
  { symbol: "HYPE", price: "$59.63", change: "-11.15%", oi: "$1.26B", risk: 72 },
  { symbol: "BTC", price: "$104.82K", change: "+1.20%", oi: "$3.44B", risk: 48 },
  { symbol: "ETH", price: "$5.93K", change: "+2.60%", oi: "$2.11B", risk: 61 },
  { symbol: "SOL", price: "$238.12", change: "-0.90%", oi: "$884M", risk: 39 },
];

const whales = [
  { action: "Long HYPE", wallet: "0x8f...42a1", size: "$4.2M", status: "Aggressive build" },
  { action: "Reduce BTC", wallet: "0x1a...d9c0", size: "$1.1M", status: "Risk-off" },
  { action: "Rotate to ETH", wallet: "0x7d...ee19", size: "$860K", status: "Momentum" },
];

const vaults = [
  { name: "HLP Core", aum: "$412M", apr: "18.4%", status: "Stable" },
  { name: "Basis Vault", aum: "$96M", apr: "23.8%", status: "Watch leverage" },
  { name: "Delta Neutral", aum: "$58M", apr: "14.1%", status: "Low vol" },
];

export default function Home() {
  return (
    <main className="shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-badge">HypurrScope</div>
          <h1>Risk terminal</h1>
          <p>Cleaner contrast, sharper hierarchy, easier scan.</p>
        </div>
        <nav className="nav-group">
          {navItems.map((item, index) => (
            <button key={item.label} className={`nav-item ${index === 0 ? "active" : ""}`}>
              <strong>{item.label}</strong>
              <span>{item.description}</span>
            </button>
          ))}
        </nav>
        <p className="footer-note">This keeps the old structure, removes the off-topic chart card, and stays build-safe.</p>
      </aside>

      <section className="main">
        <div className="topbar">
          <div>
            <div className="label">Live console</div>
            <h2 style={{ margin: "6px 0 0", fontSize: 28 }}>Hyperliquid risk dashboard</h2>
          </div>
          <a className="btn btn-secondary" href="https://hypurrscope.xyz/" target="_blank" rel="noreferrer">
            Open live site <ExternalLink size={16} style={{ marginLeft: 8 }} />
          </a>
        </div>

        <div className="hero">
          <div className="panel hero-card">
            <div className="kicker"><ShieldAlert size={14} /> Clean redesign</div>
            <h2>Same structure, better DA.</h2>
            <p>This version keeps the dashboard layout close to the original, improves contrast, and removes the unrelated chart block from your screenshot.</p>
            <div className="hero-actions">
              <button className="btn btn-primary">Primary action</button>
              <button className="btn btn-secondary">Secondary action</button>
            </div>
          </div>

          <div className="panel hero-card">
            <div className="section-header">
              <div>
                <h3>Wallet monitor</h3>
                <p>Fast lookup box with cleaner focus states</p>
              </div>
            </div>
            <div className="wallet-box">
              <input placeholder="Paste a wallet address" />
              <button className="btn btn-primary"><Search size={16} style={{ marginRight: 8 }} /> Scan</button>
            </div>
            <div className="footer-note">Paste a wallet here, then connect your real scan logic later.</div>
          </div>
        </div>

        <div className="stat-grid">
          <div className="panel stat-card"><div className="label">Crowded risk</div><div className="value">72 / 100</div><div className="delta down">Stress rising across HYPE perps</div></div>
          <div className="panel stat-card"><div className="label">Whale activity</div><div className="value">$8.9M</div><div className="delta up">Large positioning over last hour</div></div>
          <div className="panel stat-card"><div className="label">Vault drawdown</div><div className="value">-3.4%</div><div className="delta warn">Pressure in highest-yield strategies</div></div>
        </div>

        <div className="grid-2">
          <div className="panel content-card">
            <div className="section-header"><div><h3>Market table</h3><p>Same structure, cleaner contrast</p></div></div>
            <table className="table">
              <thead><tr><th>Asset</th><th>Price</th><th>24h</th><th>Open interest</th><th>Risk</th></tr></thead>
              <tbody>
                {markets.map((row) => (
                  <tr key={row.symbol}>
                    <td><strong>{row.symbol}</strong></td>
                    <td>{row.price}</td>
                    <td className={row.change.startsWith("-") ? "muted" : ""}>{row.change}</td>
                    <td>{row.oi}</td>
                    <td><span className={`risk-pill ${row.risk > 66 ? "risk-high" : row.risk > 45 ? "risk-medium" : "risk-low"}`}>{row.risk}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="panel content-card">
            <div className="section-header"><div><h3>Whale tape</h3><p>Compact feed card</p></div></div>
            <div className="list">
              {whales.map((row) => (
                <div className="list-item" key={row.wallet}>
                  <div>
                    <strong>{row.action}</strong>
                    <div className="soft">{row.wallet}</div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <strong>{row.size}</strong>
                    <div className="soft">{row.status}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="grid-2" style={{ marginTop: 18 }}>
          <div className="panel content-card">
            <div className="section-header"><div><h3>Vault monitor</h3><p>Cleaner information density</p></div></div>
            <div className="list">
              {vaults.map((row) => (
                <div className="list-item" key={row.name}>
                  <div>
                    <strong>{row.name}</strong>
                    <div className="soft">AUM {row.aum}</div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <strong>{row.apr}</strong>
                    <div className="soft">{row.status}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="panel content-card">
            <div className="section-header"><div><h3>Design notes</h3><p>What changed</p></div></div>
            <div className="list">
              <div className="list-item"><span><Waves size={16} style={{ marginRight: 8, verticalAlign: "text-bottom" }} /> Same structure</span><span className="soft">kept</span></div>
              <div className="list-item"><span><ShieldAlert size={16} style={{ marginRight: 8, verticalAlign: "text-bottom" }} /> Better contrast</span><span className="soft">done</span></div>
              <div className="list-item"><span><Wallet size={16} style={{ marginRight: 8, verticalAlign: "text-bottom" }} /> Removed off-topic card</span><span className="soft">done</span></div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
