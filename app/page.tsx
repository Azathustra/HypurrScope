"use client";

import { ArrowUpRight, ExternalLink, Search, ShieldAlert, Waves, Wallet } from "lucide-react";

const navItems = [
  { id: "overview", label: "Overview", description: "Investor dashboard" },
  { id: "markets", label: "Markets", description: "HYPE + perps" },
  { id: "vaults", label: "Vaults", description: "Yield monitor" },
  { id: "flows", label: "ETF flows" },
  { id: "wallet", label: "Wallet scan" },
];

const marketRows = [
  { symbol: "HYPE", price: "$59.63", change: "-11.15%", oi: "$1.26B", risk: "High" },
  { symbol: "BTC", price: "$104.82K", change: "+1.20%", oi: "$3.44B", risk: "Low" },
  { symbol: "ETH", price: "$5.93K", change: "+2.60%", oi: "$2.11B", risk: "Medium" },
  { symbol: "SOL", price: "$238.12", change: "-0.90%", oi: "$884M", risk: "Low" },
];

const whaleRows = [
  { wallet: "0x8f...42a1", action: "Long HYPE", size: "$4.2M", status: "Aggressive build" },
  { wallet: "0x1a...d9c0", action: "Reduce BTC", size: "$1.1M", status: "Risk-off" },
  { wallet: "0x7d...ee19", action: "Rotate to ETH", size: "$860K", status: "Momentum" },
];

const vaultRows = [
  { name: "HLP Core", aum: "$412M", apr: "18.4%", status: "Stable" },
  { name: "Basis Vault", aum: "$96M", apr: "23.8%", status: "Watch leverage" },
  { name: "Delta Neutral", aum: "$58M", apr: "14.1%", status: "Low vol" },
];

function riskClass(risk: string) {
  if (risk === "High") return "risk-pill risk-high";
  if (risk === "Medium") return "risk-pill risk-medium";
  return "risk-pill risk-low";
}

export default function HomePage() {
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
            <button key={item.id} className={`nav-item ${index === 0 ? "active" : ""}`}>
              <strong>{item.label}</strong>
              <span>{item.description}</span>
            </button>
          ))}
        </nav>

        <p className="footer-note">
          This version is a clean visual base that you can expand section by section.
        </p>
      </aside>

      <section className="main">
        <div className="topbar">
          <div>
            <div className="label">Live console</div>
            <h2 style={{ margin: "6px 0 0", fontSize: 28 }}>Hyperliquid risk dashboard</h2>
          </div>
          <a className="btn btn-secondary" href="https://hypurrscope.xyz/" target="_blank" rel="noopener noreferrer">
            Open live site <ExternalLink size={16} style={{ marginLeft: 8 }} />
          </a>
        </div>

        <div className="hero">
          <div className="panel hero-card">
            <div className="kicker"><ShieldAlert size={14} /> High-signal design refresh</div>
            <h2>See market stress before the crowd does.</h2>
            <p>
              This redesign gives HypurrScope a cleaner premium feel: stronger contrast, tighter hierarchy,
              calmer surfaces and clearer action zones for markets, vaults and wallet monitoring.
            </p>
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
            <div className="footer-note">Tip: keep search, results and risk summary inside the same visual card.</div>
          </div>
        </div>

        <div className="stat-grid">
          <div className="panel stat-card">
            <div className="label">Crowded risk</div>
            <div className="value">72 / 100</div>
            <div className="delta down">Stress rising across HYPE perps</div>
          </div>
          <div className="panel stat-card">
            <div className="label">Whale activity</div>
            <div className="value">$8.9M</div>
            <div className="delta up">Large positioning over last hour</div>
          </div>
          <div className="panel stat-card">
            <div className="label">Vault drawdown</div>
            <div className="value">-3.4%</div>
            <div className="delta warn">Pressure in highest-yield strategies</div>
          </div>
        </div>

        <div className="grid-2">
          <div className="panel content-card">
            <div className="section-header">
              <div>
                <h3>Market table</h3>
                <p>Example of stronger contrast and clearer risk tagging</p>
              </div>
            </div>
            <table className="table">
              <thead>
                <tr>
                  <th>Asset</th>
                  <th>Price</th>
                  <th>24h</th>
                  <th>Open interest</th>
                  <th>Risk</th>
                </tr>
              </thead>
              <tbody>
                {marketRows.map((row) => (
                  <tr key={row.symbol}>
                    <td><strong>{row.symbol}</strong></td>
                    <td>{row.price}</td>
                    <td className={row.change.startsWith("-") ? "muted" : ""}>{row.change}</td>
                    <td>{row.oi}</td>
                    <td><span className={riskClass(row.risk)}>{row.risk}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="panel content-card">
            <div className="section-header">
              <div>
                <h3>Whale tape</h3>
                <p>Compact feed card</p>
              </div>
            </div>
            <div className="list">
              {whaleRows.map((row) => (
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

        <div className="grid-2" style={{ marginTop: 20 }}>
          <div className="panel content-card">
            <div className="section-header">
              <div>
                <h3>Vault monitor</h3>
                <p>Cleaner information density for yield and drawdown sections</p>
              </div>
            </div>
            <div className="list">
              {vaultRows.map((row) => (
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
            <div className="section-header">
              <div>
                <h3>Design notes</h3>
                <p>Why this version feels better</p>
              </div>
            </div>
            <div className="list">
              <div className="list-item"><span><Waves size={16} style={{ marginRight: 8, verticalAlign: "text-bottom" }} /> Better surface depth</span><span className="soft">Cards separate clearly</span></div>
              <div className="list-item"><span><ArrowUpRight size={16} style={{ marginRight: 8, verticalAlign: "text-bottom" }} /> Stronger hierarchy</span><span className="soft">Data first, chrome second</span></div>
              <div className="list-item"><span><Wallet size={16} style={{ marginRight: 8, verticalAlign: "text-bottom" }} /> Cleaner inputs</span><span className="soft">More readable and reassuring</span></div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
