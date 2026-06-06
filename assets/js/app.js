(function attachApp(window) {
  "use strict";

  const U = window.HypurrUtils;
  const API = window.HyperliquidAPI;
  const A = window.HypurrAnalytics;
  const Charts = window.HypurrCharts;

  const state = {
    coin: "HYPE",
    markets: [],
    candles: [],
    book: null,
    stats: null,
    signals: [],
    marketSort: "oi",
    marketSearch: "",
    feeRate: 0.0002,
    wallet: null,
    refreshHandle: 0,
    loading: false,
  };

  const el = {};

  document.addEventListener("DOMContentLoaded", init);

  function init() {
    bindElements();
    bindEvents();
    restoreRules();
    loadSnapshot();
    state.refreshHandle = window.setInterval(loadSnapshot, 25000);
    window.addEventListener("resize", U.debounce(renderCharts, 160));
  }

  function bindElements() {
    Object.assign(el, {
      sourceDot: U.$("#sourceDot"),
      sourceText: U.$("#sourceText"),
      refreshBtn: U.$("#refreshBtn"),
      coinSelect: U.$("#coinSelect"),
      heroCoin: U.$("#heroCoin"),
      lastUpdate: U.$("#lastUpdate"),
      marketState: U.$("#marketState"),
      kpiGrid: U.$("#kpiGrid"),
      priceChart: U.$("#priceChart"),
      chartTitle: U.$("#chartTitle"),
      chartSubtitle: U.$("#chartSubtitle"),
      chartMove: U.$("#chartMove"),
      signalList: U.$("#signalList"),
      riskHeatmap: U.$("#riskHeatmap"),
      feeRateInput: U.$("#feeRateInput"),
      feeRateLabel: U.$("#feeRateLabel"),
      feePressureLabel: U.$("#feePressureLabel"),
      marketSearch: U.$("#marketSearch"),
      marketRows: U.$("#marketRows"),
      marketCount: U.$("#marketCount"),
      fundingThreshold: U.$("#fundingThreshold"),
      riskThreshold: U.$("#riskThreshold"),
      alertForm: U.$("#alertForm"),
      ruleOutput: U.$("#ruleOutput"),
      depthTitle: U.$("#depthTitle"),
      depthSubtitle: U.$("#depthSubtitle"),
      depthChart: U.$("#depthChart"),
      bookImbalance: U.$("#bookImbalance"),
      depthStats: U.$("#depthStats"),
      walletForm: U.$("#walletForm"),
      walletInput: U.$("#walletInput"),
      walletKpis: U.$("#walletKpis"),
      walletStatus: U.$("#walletStatus"),
      positionRows: U.$("#positionRows"),
      walletNotes: U.$("#walletNotes"),
    });
  }

  function bindEvents() {
    U.$$("[data-view]").forEach((button) => {
      button.addEventListener("click", () => setView(button.dataset.view));
    });

    U.$$("[data-jump-view]").forEach((button) => {
      button.addEventListener("click", () => setView(button.dataset.jumpView));
    });

    el.refreshBtn.addEventListener("click", loadSnapshot);

    el.coinSelect.addEventListener("change", () => {
      state.coin = el.coinSelect.value;
      loadSnapshot();
    });

    el.feeRateInput.addEventListener("input", () => {
      state.feeRate = U.toNumber(el.feeRateInput.value, 0.0002);
      render();
    });

    el.marketSearch.addEventListener("input", () => {
      state.marketSearch = el.marketSearch.value.trim().toUpperCase();
      renderMarketTable();
      renderRuleHits();
    });

    U.$$(".segmented button").forEach((button) => {
      button.addEventListener("click", () => {
        state.marketSort = button.dataset.sort;
        U.$$(".segmented button").forEach((item) => item.classList.toggle("is-active", item === button));
        renderMarketTable();
      });
    });

    el.alertForm.addEventListener("submit", (event) => {
      event.preventDefault();
      saveRules();
      renderRuleHits();
    });

    el.walletForm.addEventListener("submit", (event) => {
      event.preventDefault();
      scanWallet();
    });
  }

  async function loadSnapshot() {
    if (state.loading) return;
    state.loading = true;
    setSource("loading", "Refreshing");

    try {
      const raw = await API.getCoreSnapshot(state.coin);
      const normalized = A.normalizeSnapshot(raw);
      if (!normalized.markets.length) throw new Error("No market rows returned");
      applySnapshot(normalized);
      U.setCache("lastSnapshot", normalized);
      setSource("live", "Hyperliquid live");
    } catch (error) {
      const cached = U.getCache("lastSnapshot", 6 * 60 * 60 * 1000);
      if (cached && cached.markets && cached.markets.length) {
        applySnapshot(cached);
        setSource("fallback", "Cached snapshot");
      } else {
        applySnapshot(A.fallbackSnapshot(state.coin));
        setSource("error", "Fallback model");
      }
    } finally {
      state.loading = false;
    }
  }

  function applySnapshot(snapshot) {
    state.markets = snapshot.markets || [];
    state.candles = snapshot.candles || [];
    state.book = snapshot.book || null;
    state.stats = A.computeStats(state.markets, state.candles, state.book, state.coin, state.feeRate);
    state.signals = A.deriveSignals(state.markets, state.stats);
    state.fetchedAt = snapshot.fetchedAt || new Date().toISOString();
    syncCoinOptions();
    render();
  }

  function syncCoinOptions() {
    const priority = ["HYPE", "BTC", "ETH", "SOL"];
    const top = state.markets.slice(0, 32).map((market) => market.symbol);
    const options = Array.from(new Set(priority.concat(top)));
    el.coinSelect.innerHTML = options
      .map((symbol) => `<option value="${U.escapeHtml(symbol)}">${U.escapeHtml(symbol)}</option>`)
      .join("");
    el.coinSelect.value = state.coin;
  }

  function render() {
    state.stats = A.computeStats(state.markets, state.candles, state.book, state.coin, state.feeRate);
    state.signals = A.deriveSignals(state.markets, state.stats);
    renderHero();
    renderKpis();
    renderSignals(el.signalList, state.signals);
    renderFeeModel();
    renderMarketTable();
    renderRuleHits();
    renderDepth();
    renderWallet();
    renderCharts();
    Charts.renderHeatmap(el.riskHeatmap, state.markets);
  }

  function renderHero() {
    const stats = state.stats;
    const selected = stats && stats.selected;
    el.heroCoin.textContent = state.coin;
    el.lastUpdate.textContent = state.fetchedAt ? U.timeAgo(state.fetchedAt) : "--";
    el.marketState.textContent = stats && stats.regime ? `${stats.regime.label} ${stats.regime.score}` : "--";
    el.chartTitle.textContent = `${state.coin} 24h tape`;
    el.chartSubtitle.textContent = selected
      ? `${U.formatUsd(selected.volumeUsd)} 24h volume, ${U.formatUsd(selected.openInterestUsd)} OI.`
      : "15m candles from Hyperliquid.";
    el.chartMove.textContent = selected ? U.formatPct(selected.changePct, 2, true) : "--";
    el.chartMove.className = `metric-pill ${selected && selected.changePct < 0 ? "negative" : "positive"}`;
  }

  function renderKpis() {
    const stats = state.stats;
    const selected = stats.selected;
    const hype = stats.hype;
    const cards = [
      {
        label: `${state.coin} price`,
        value: selected ? U.formatUsd(selected.price) : "$--",
        detail: selected ? `24h ${U.formatPct(selected.changePct, 2, true)}` : "Waiting for market",
        tone: selected && selected.changePct < 0 ? "negative" : "positive",
      },
      {
        label: "Open interest",
        value: selected ? U.formatUsd(selected.openInterestUsd) : "$--",
        detail: `${U.formatUsd(stats.totalOi)} total perps OI`,
      },
      {
        label: "Funding",
        value: selected ? U.formatPct(selected.fundingPct, 4, true) : "--",
        detail: `Weighted ${U.formatPct(stats.weightedFunding * 100, 4, true)}`,
        tone: selected && Math.abs(selected.rawFunding) > 0.00025 ? "warning" : "",
      },
      {
        label: "HYPE FDV",
        value: hype && hype.fdvUsd ? U.formatUsd(hype.fdvUsd) : "$--",
        detail: hype ? `${U.formatPct(stats.hypeOiShare, 1, false)} of total OI` : "HYPE market unavailable",
      },
      {
        label: "24h volume",
        value: selected ? U.formatUsd(selected.volumeUsd) : "$--",
        detail: `${U.formatUsd(stats.totalVolume)} total perps volume`,
      },
      {
        label: "Risk score",
        value: selected ? String(selected.risk) : "--",
        detail: "Move + funding + OI + volume + leverage",
        tone: selected && selected.risk >= 75 ? "negative" : selected && selected.risk >= 55 ? "warning" : "positive",
      },
      {
        label: "Book spread",
        value: stats.book ? U.formatPct(stats.book.spreadPct, 4, false) : "--",
        detail: stats.book ? `${U.formatUsd(stats.book.bidUsd)} bids visible` : "Waiting for book",
      },
      {
        label: "Fee pressure",
        value: U.formatUsd(stats.feePressureUsd),
        detail: `${U.formatBps(state.feeRate)} on HYPE volume`,
      },
    ];

    el.kpiGrid.innerHTML = cards
      .map(
        (card) => `
          <article class="kpi-card ${card.tone || ""}">
            <span>${U.escapeHtml(card.label)}</span>
            <strong>${U.escapeHtml(card.value)}</strong>
            <small>${U.escapeHtml(card.detail)}</small>
          </article>
        `,
      )
      .join("");
  }

  function renderSignals(container, signals) {
    container.innerHTML = (signals || [])
      .map(
        (signal) => `
          <article class="signal tone-${signal.tone || "good"}">
            <div class="signal-top">
              <strong>${U.escapeHtml(signal.label)}</strong>
              <span class="${signal.tone === "risk" ? "negative" : signal.tone === "watch" ? "warning" : "positive"}">${U.escapeHtml(signal.value)}</span>
            </div>
            <p>${U.escapeHtml(signal.body)}</p>
          </article>
        `,
      )
      .join("");
  }

  function renderFeeModel() {
    el.feeRateLabel.textContent = U.formatBps(state.feeRate);
    el.feePressureLabel.textContent = state.stats ? U.formatUsd(state.stats.feePressureUsd) : "$--";
  }

  function getSortedMarkets() {
    const query = state.marketSearch;
    const rows = state.markets.filter((market) => !query || market.symbol.includes(query));
    const sorters = {
      oi: (a, b) => b.openInterestUsd - a.openInterestUsd,
      risk: (a, b) => b.risk - a.risk,
      funding: (a, b) => Math.abs(b.rawFunding) - Math.abs(a.rawFunding),
      volume: (a, b) => b.volumeUsd - a.volumeUsd,
    };
    return rows.sort(sorters[state.marketSort] || sorters.oi);
  }

  function renderMarketTable() {
    const rows = getSortedMarkets().slice(0, 80);
    el.marketCount.textContent = `${rows.length} markets shown`;
    if (!rows.length) {
      el.marketRows.innerHTML = '<tr><td colspan="7"><div class="empty-state">No matching markets</div></td></tr>';
      return;
    }

    el.marketRows.innerHTML = rows
      .map((market) => {
        const color = U.riskColor(market.risk);
        const initials = market.symbol.slice(0, 3);
        return `
          <tr>
            <td>
              <div class="coin-cell">
                <span class="coin-badge">${U.escapeHtml(initials)}</span>
                <strong>${U.escapeHtml(market.symbol)}</strong>
              </div>
            </td>
            <td>${U.formatUsd(market.price)}</td>
            <td class="${market.changePct < 0 ? "negative" : "positive"}">${U.formatPct(market.changePct, 2, true)}</td>
            <td>${U.formatUsd(market.openInterestUsd)}</td>
            <td>${U.formatUsd(market.volumeUsd)}</td>
            <td class="${market.rawFunding < 0 ? "negative" : "positive"}">${U.formatPct(market.fundingPct, 4, true)}</td>
            <td>
              <div class="risk-bar" aria-label="Risk ${market.risk}" style="--risk-width:${market.risk}%; --risk-color:${color}">
                <span></span>
              </div>
            </td>
          </tr>
        `;
      })
      .join("");
  }

  function saveRules() {
    const rules = {
      fundingThreshold: U.toNumber(el.fundingThreshold.value, 0.03),
      riskThreshold: U.toNumber(el.riskThreshold.value, 70),
    };
    U.setCache("alertRules", rules);
  }

  function restoreRules() {
    const rules = U.getCache("alertRules");
    if (!rules) return;
    if (el.fundingThreshold) el.fundingThreshold.value = rules.fundingThreshold;
    if (el.riskThreshold) el.riskThreshold.value = rules.riskThreshold;
  }

  function renderRuleHits() {
    const fundingThreshold = U.toNumber(el.fundingThreshold.value, 0.03);
    const riskThreshold = U.toNumber(el.riskThreshold.value, 70);
    const hits = state.markets
      .filter((market) => Math.abs(market.fundingPct) >= fundingThreshold || market.risk >= riskThreshold)
      .sort((a, b) => b.risk - a.risk)
      .slice(0, 8);

    el.ruleOutput.innerHTML = hits.length
      ? hits
          .map(
            (market) => `
              <div class="rule-hit">
                <strong>${U.escapeHtml(market.symbol)}</strong>
                risk ${market.risk}, funding ${U.formatPct(market.fundingPct, 4, true)}, OI ${U.formatUsd(market.openInterestUsd)}
              </div>
            `,
          )
          .join("")
      : '<div class="empty-state">No current hits</div>';
  }

  function renderDepth() {
    const book = state.book;
    el.depthTitle.textContent = `${state.coin} book depth`;
    el.depthSubtitle.textContent = book
      ? `${U.formatUsd(book.bidUsd)} visible bids and ${U.formatUsd(book.askUsd)} visible asks.`
      : "Waiting for visible book levels.";
    el.bookImbalance.textContent = book ? U.formatPct(book.imbalance, 1, true) : "--";
    el.bookImbalance.className = `metric-pill ${book && Math.abs(book.imbalance) > 18 ? "warning" : "positive"}`;

    const stats = book
      ? [
          ["Best bid", U.formatUsd(book.bestBid)],
          ["Best ask", U.formatUsd(book.bestAsk)],
          ["Spread", U.formatPct(book.spreadPct, 4, false)],
          ["Bid depth", U.formatUsd(book.bidUsd)],
          ["Ask depth", U.formatUsd(book.askUsd)],
          ["Imbalance", U.formatPct(book.imbalance, 1, true)],
        ]
      : [["Book", "Waiting"]];

    el.depthStats.innerHTML = stats
      .map(
        (item) => `
          <div class="depth-stat">
            <span>${U.escapeHtml(item[0])}</span>
            <strong>${U.escapeHtml(item[1])}</strong>
          </div>
        `,
      )
      .join("");
  }

  async function scanWallet() {
    const address = el.walletInput.value.trim();
    el.walletStatus.textContent = "Scanning account...";
    setView("wallet");
    try {
      const raw = await API.getWallet(address);
      state.wallet = A.computeWallet(raw, state.markets);
      renderWallet();
    } catch (error) {
      state.wallet = null;
      el.walletStatus.textContent = error.message || "Unable to scan wallet";
      el.walletKpis.innerHTML = "";
      el.positionRows.innerHTML = '<tr><td colspan="7"><div class="empty-state">Wallet scan failed</div></td></tr>';
      el.walletNotes.innerHTML = "";
    }
  }

  function renderWallet() {
    const wallet = state.wallet;
    if (!wallet) {
      if (!el.positionRows.innerHTML) {
        el.positionRows.innerHTML = '<tr><td colspan="7"><div class="empty-state">No wallet loaded</div></td></tr>';
      }
      return;
    }

    el.walletStatus.textContent = `${U.shortAddress(wallet.address)} scanned ${U.timeAgo(wallet.fetchedAt)}`;
    el.walletKpis.innerHTML = [
      ["Account value", U.formatUsd(wallet.accountValue), "Equity available in public account state"],
      ["Total notional", U.formatUsd(wallet.totalNotional), `${wallet.positions.length} open positions`],
      ["Leverage", `${wallet.leverage.toFixed(2)}x`, `Margin use ${U.formatPct(wallet.marginRatio * 100, 1, false)}`],
      ["Risk score", String(wallet.risk), "Leverage + concentration + liquidation distance"],
    ]
      .map(
        (card) => `
          <article class="kpi-card ${card[0] === "Risk score" && wallet.risk >= 70 ? "negative" : ""}">
            <span>${U.escapeHtml(card[0])}</span>
            <strong>${U.escapeHtml(card[1])}</strong>
            <small>${U.escapeHtml(card[2])}</small>
          </article>
        `,
      )
      .join("");

    el.positionRows.innerHTML = wallet.positions.length
      ? wallet.positions
          .map(
            (position) => `
              <tr>
                <td><strong>${U.escapeHtml(position.coin)}</strong></td>
                <td class="${position.side === "Long" ? "positive" : "negative"}">${position.side}</td>
                <td>${U.formatUsd(position.notional)}</td>
                <td>${U.formatUsd(position.entry)}</td>
                <td>${U.formatUsd(position.mark)}</td>
                <td class="${position.pnl < 0 ? "negative" : "positive"}">${position.pnl < 0 ? "-" : "+"}${U.formatUsd(Math.abs(position.pnl))}</td>
                <td>${position.distancePct === null ? "--" : U.formatPct(position.distancePct, 1, false)}</td>
              </tr>
            `,
          )
          .join("")
      : '<tr><td colspan="7"><div class="empty-state">No open perp positions</div></td></tr>';

    renderSignals(el.walletNotes, A.walletNotes(wallet));
  }

  function renderCharts() {
    Charts.drawPriceChart(el.priceChart, state.candles);
    Charts.drawDepthChart(el.depthChart, state.book);
  }

  function setSource(mode, label) {
    el.sourceText.textContent = label;
    el.sourceDot.classList.remove("live", "error");
    if (mode === "live") el.sourceDot.classList.add("live");
    if (mode === "error") el.sourceDot.classList.add("error");
  }

  function setView(view) {
    const target = view || "overview";
    U.$$(".view").forEach((section) => section.classList.toggle("is-active", section.id === `view-${target}`));
    U.$$(".nav-item, .mobile-tab").forEach((button) => button.classList.toggle("is-active", button.dataset.view === target));
    window.location.hash = target;
    window.scrollTo({ top: 0, behavior: "smooth" });
    window.setTimeout(renderCharts, 40);
  }
})(window);
