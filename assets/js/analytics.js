(function attachAnalytics(window) {
  "use strict";

  const U = window.HypurrUtils;

  function fallbackSnapshot(coin) {
    const selectedCoin = coin || "HYPE";
    const now = Date.now();
    const base = selectedCoin === "BTC" ? 104800 : selectedCoin === "ETH" ? 5930 : selectedCoin === "SOL" ? 238 : 58.4;
    const names = ["HYPE", "BTC", "ETH", "SOL", "FARTCOIN", "PUMP", "DOGE", "XRP", "SUI", "BNB", "AVAX", "LINK"];
    const markets = names.map((symbol, index) => {
      const price = symbol === selectedCoin ? base : base * (0.28 + index * 0.21);
      const change = Math.sin(index + 0.7) * 4.8;
      const funding = Math.sin(index * 1.4) * 0.00012;
      const oiUsd = (12 - index * 0.62) * 125000000;
      const volumeUsd = (10 - index * 0.55) * 98000000;
      return {
        symbol,
        price,
        prevPrice: price / (1 + change / 100),
        changePct: change,
        rawFunding: funding,
        fundingPct: funding * 100,
        openInterestUsd: Math.max(15000000, oiUsd),
        volumeUsd: Math.max(8000000, volumeUsd),
        fdvUsd: symbol === "HYPE" ? price * 1000000000 : null,
        maxLeverage: symbol === "BTC" ? 40 : symbol === "ETH" ? 25 : 10,
        risk: scoreMarketRisk({ changePct: change, rawFunding: funding, openInterestUsd: oiUsd, volumeUsd }),
      };
    });

    const rawCandles = Array.from({ length: 80 }, (_, index) => {
      const drift = Math.sin(index / 4) * 0.9 + Math.cos(index / 9) * 0.45 + index * 0.01;
      const close = base + drift;
      return {
        t: now - (79 - index) * 15 * 60 * 1000,
        o: String(close - Math.sin(index) * 0.25),
        c: String(close),
        h: String(close + 0.55),
        l: String(close - 0.58),
        v: String(520000 + Math.abs(Math.sin(index / 3)) * 1600000),
      };
    });

    return {
      coin: selectedCoin,
      markets,
      candles: normalizeCandles(rawCandles),
      book: normalizeBook(fallbackBook(base)),
      fetchedAt: new Date(now).toISOString(),
      source: "fallback",
    };
  }

  function fallbackBook(mid) {
    const levels = [[], []];
    for (let index = 0; index < 20; index += 1) {
      levels[0].push({ px: String(mid * (1 - (index + 1) * 0.00008)), sz: String(18 + index * 7), n: 1 + (index % 4) });
      levels[1].push({ px: String(mid * (1 + (index + 1) * 0.00009)), sz: String(14 + index * 6), n: 1 + (index % 3) });
    }
    return { coin: "HYPE", time: Date.now(), levels };
  }

  function normalizeSnapshot(raw) {
    const markets = normalizeMarkets(raw.rawMarket);
    const candles = normalizeCandles(raw.rawCandles);
    const book = normalizeBook(raw.rawBook);
    return {
      coin: raw.coin,
      markets,
      candles,
      book,
      errors: raw.errors || [],
      fetchedAt: raw.fetchedAt,
      source: raw.source,
    };
  }

  function normalizeMarkets(payload) {
    const meta = Array.isArray(payload) ? payload[0] : null;
    const ctxs = Array.isArray(payload) ? payload[1] : [];
    if (!meta || !Array.isArray(meta.universe) || !Array.isArray(ctxs)) return [];

    return meta.universe
      .map((asset, index) => {
        const ctx = ctxs[index] || {};
        const price = U.toNumber(ctx.markPx || ctx.midPx || ctx.oraclePx);
        const prevPrice = U.toNumber(ctx.prevDayPx);
        const rawFunding = U.toNumber(ctx.funding);
        const sizeOpenInterest = U.toNumber(ctx.openInterest);
        const openInterestUsd = sizeOpenInterest * price;
        const volumeUsd = U.toNumber(ctx.dayNtlVlm);
        const changePct = prevPrice > 0 && price > 0 ? ((price - prevPrice) / prevPrice) * 100 : 0;
        const fdvUsd = asset.name === "HYPE" && price > 0 ? price * 1000000000 : null;

        return {
          symbol: asset.name,
          szDecimals: asset.szDecimals,
          price,
          prevPrice,
          changePct,
          rawFunding,
          fundingPct: rawFunding * 100,
          openInterestUsd,
          volumeUsd,
          fdvUsd,
          maxLeverage: U.toNumber(asset.maxLeverage),
          delisted: Boolean(asset.isDelisted),
          risk: scoreMarketRisk({ changePct, rawFunding, openInterestUsd, volumeUsd, maxLeverage: asset.maxLeverage }),
        };
      })
      .filter((market) => market.symbol && market.price > 0 && !market.delisted)
      .sort((a, b) => {
        if (a.symbol === "HYPE") return -1;
        if (b.symbol === "HYPE") return 1;
        return b.openInterestUsd - a.openInterestUsd;
      });
  }

  function normalizeCandles(payload) {
    const candles = Array.isArray(payload && payload.candles) ? payload.candles : Array.isArray(payload) ? payload : [];
    return candles
      .map((item) => ({
        time: U.toNumber(item.t || item.time || item.timestamp),
        open: U.toNumber(item.o || item.open),
        high: U.toNumber(item.h || item.high),
        low: U.toNumber(item.l || item.low),
        close: U.toNumber(item.c || item.close),
        volume: U.toNumber(item.v || item.volume),
      }))
      .filter((item) => item.time > 0 && item.close > 0)
      .sort((a, b) => a.time - b.time)
      .slice(-96);
  }

  function normalizeBook(payload) {
    if (!payload || !Array.isArray(payload.levels)) return null;
    const bids = (payload.levels[0] || []).map(normalizeLevel).filter(Boolean);
    const asks = (payload.levels[1] || []).map(normalizeLevel).filter(Boolean);
    if (!bids.length || !asks.length) return null;
    const bestBid = bids[0].price;
    const bestAsk = asks[0].price;
    const mid = (bestBid + bestAsk) / 2;
    const bidUsd = bids.reduce((sum, level) => sum + level.usd, 0);
    const askUsd = asks.reduce((sum, level) => sum + level.usd, 0);
    const spreadPct = mid > 0 ? ((bestAsk - bestBid) / mid) * 100 : 0;
    const imbalance = bidUsd + askUsd > 0 ? ((bidUsd - askUsd) / (bidUsd + askUsd)) * 100 : 0;
    return {
      coin: payload.coin,
      time: payload.time,
      bids,
      asks,
      bestBid,
      bestAsk,
      mid,
      bidUsd,
      askUsd,
      spreadPct,
      imbalance,
    };
  }

  function normalizeLevel(level) {
    const price = U.toNumber(level.px);
    const size = U.toNumber(level.sz);
    if (price <= 0 || size <= 0) return null;
    return {
      price,
      size,
      orders: U.toNumber(level.n),
      usd: price * size,
    };
  }

  function scoreMarketRisk(market) {
    const moveScore = Math.min(24, Math.abs(U.toNumber(market.changePct)) * 2.2);
    const fundingScore = Math.min(24, Math.abs(U.toNumber(market.rawFunding)) * 50000);
    const oiScore = Math.min(22, Math.log10(U.toNumber(market.openInterestUsd) / 10000000 + 1) * 9);
    const volumeScore = Math.min(14, Math.log10(U.toNumber(market.volumeUsd) / 10000000 + 1) * 5);
    const levScore = Math.min(10, U.toNumber(market.maxLeverage) / 4);
    return Math.round(U.clamp(12 + moveScore + fundingScore + oiScore + volumeScore + levScore, 1, 99));
  }

  function computeStats(markets, candles, book, selectedCoin, feeRate) {
    const coin = selectedCoin || "HYPE";
    const selected = markets.find((market) => market.symbol === coin) || markets[0] || null;
    const hype = markets.find((market) => market.symbol === "HYPE") || selected;
    const totalOi = markets.reduce((sum, market) => sum + market.openInterestUsd, 0);
    const totalVolume = markets.reduce((sum, market) => sum + market.volumeUsd, 0);
    const weightedFunding =
      totalOi > 0 ? markets.reduce((sum, market) => sum + market.rawFunding * market.openInterestUsd, 0) / totalOi : 0;
    const highRiskCount = markets.filter((market) => market.risk >= 70).length;
    const fundingOutliers = markets
      .filter((market) => Math.abs(market.rawFunding) >= 0.00025)
      .sort((a, b) => Math.abs(b.rawFunding) - Math.abs(a.rawFunding));
    const topRisk = markets.slice().sort((a, b) => b.risk - a.risk)[0] || null;
    const topVolume = markets.slice().sort((a, b) => b.volumeUsd - a.volumeUsd)[0] || null;
    const candleMove = candles.length > 1 ? ((candles[candles.length - 1].close - candles[0].close) / candles[0].close) * 100 : 0;
    const feePressureUsd = (hype ? hype.volumeUsd : 0) * U.toNumber(feeRate || 0.0002);

    return {
      selected,
      hype,
      totalOi,
      totalVolume,
      weightedFunding,
      highRiskCount,
      fundingOutliers,
      topRisk,
      topVolume,
      candleMove,
      feePressureUsd,
      hypeOiShare: totalOi > 0 && hype ? (hype.openInterestUsd / totalOi) * 100 : 0,
      book,
      regime: classifyRegime({ weightedFunding, highRiskCount, candleMove, book }),
    };
  }

  function classifyRegime(stats) {
    const pressure =
      Math.abs(stats.weightedFunding) * 60000 +
      stats.highRiskCount * 3 +
      Math.abs(stats.candleMove) * 2 +
      (stats.book ? Math.abs(stats.book.imbalance) * 0.22 : 0);
    if (pressure >= 68) return { label: "Volatile", tone: "risk", score: Math.round(U.clamp(pressure, 0, 100)) };
    if (pressure >= 38) return { label: "Active", tone: "watch", score: Math.round(pressure) };
    return { label: "Balanced", tone: "good", score: Math.round(pressure) };
  }

  function deriveSignals(markets, stats) {
    const selected = stats.selected;
    const signals = [];

    if (selected) {
      signals.push({
        label: `${selected.symbol} 24h move`,
        value: U.formatPct(selected.changePct, 2, true),
        tone: selected.changePct >= 0 ? "good" : "risk",
        body: `${U.formatUsd(selected.volumeUsd)} volume and ${U.formatUsd(selected.openInterestUsd)} open interest.`,
      });
    }

    signals.push({
      label: "Weighted funding",
      value: U.formatPct(stats.weightedFunding * 100, 4, true),
      tone: Math.abs(stats.weightedFunding) > 0.00025 ? "watch" : "good",
      body: "Positive funding means longs are paying shorts; negative funding means shorts are paying longs.",
    });

    if (stats.book) {
      signals.push({
        label: "Book imbalance",
        value: U.formatPct(stats.book.imbalance, 1, true),
        tone: Math.abs(stats.book.imbalance) > 18 ? "watch" : "good",
        body: `${U.formatUsd(stats.book.bidUsd)} bids versus ${U.formatUsd(stats.book.askUsd)} asks in visible depth.`,
      });
    }

    if (stats.topRisk) {
      signals.push({
        label: "Highest stress",
        value: `${stats.topRisk.symbol} ${stats.topRisk.risk}`,
        tone: stats.topRisk.risk >= 75 ? "risk" : "watch",
        body: `Move ${U.formatPct(stats.topRisk.changePct, 2, true)}, funding ${U.formatPct(stats.topRisk.fundingPct, 4, true)}.`,
      });
    }

    if (stats.hype) {
      signals.push({
        label: "HYPE OI share",
        value: U.formatPct(stats.hypeOiShare, 1, false),
        tone: stats.hypeOiShare > 18 ? "watch" : "good",
        body: `${U.formatUsd(stats.hype.openInterestUsd)} HYPE open interest versus ${U.formatUsd(stats.totalOi)} total.`,
      });
    }

    if (stats.fundingOutliers.length) {
      const leader = stats.fundingOutliers[0];
      signals.push({
        label: "Funding outlier",
        value: leader.symbol,
        tone: "watch",
        body: `${U.formatPct(leader.fundingPct, 4, true)} funding with ${U.formatUsd(leader.openInterestUsd)} OI.`,
      });
    }

    return signals.slice(0, 6);
  }

  function computeWallet(rawWallet, markets) {
    const account = rawWallet.state || {};
    const cross = account.crossMarginSummary || {};
    const margin = account.marginSummary || {};
    const marketMap = new Map(markets.map((market) => [market.symbol, market]));
    const accountValue = U.toNumber(margin.accountValue || cross.accountValue);
    const marginUsed = U.toNumber(margin.totalMarginUsed || cross.totalMarginUsed);
    const rawPositions = Array.isArray(account.assetPositions) ? account.assetPositions : [];

    const positions = rawPositions
      .map((entry) => entry.position || entry)
      .filter((position) => Math.abs(U.toNumber(position.szi)) > 0)
      .map((position) => {
        const coin = position.coin || "--";
        const size = U.toNumber(position.szi);
        const market = marketMap.get(coin);
        const mark = market ? market.price : U.toNumber(position.markPx || position.midPx);
        const notional = U.toNumber(position.positionValue) || Math.abs(size * mark);
        const liq = U.toNumber(position.liquidationPx);
        const distancePct = liq > 0 && mark > 0 ? (Math.abs(mark - liq) / mark) * 100 : null;
        const leverageValue =
          typeof position.leverage === "object" ? U.toNumber(position.leverage.value) : U.toNumber(position.leverage);

        return {
          coin,
          side: size > 0 ? "Long" : "Short",
          size,
          notional,
          entry: U.toNumber(position.entryPx),
          mark,
          pnl: U.toNumber(position.unrealizedPnl),
          liquidation: liq,
          distancePct,
          leverage: leverageValue,
        };
      })
      .sort((a, b) => b.notional - a.notional);

    const totalNotional = positions.reduce((sum, position) => sum + position.notional, 0);
    const leverage = accountValue > 0 ? totalNotional / accountValue : 0;
    const marginRatio = accountValue > 0 ? marginUsed / accountValue : 0;
    const maxPosition = positions[0] ? positions[0].notional : 0;
    const concentration = totalNotional > 0 ? maxPosition / totalNotional : 0;
    const distances = positions.map((position) => position.distancePct).filter((distance) => distance !== null);
    const minDistance = distances.length ? Math.min.apply(null, distances) : null;
    const risk = Math.round(
      U.clamp(
        leverage * 12 +
          marginRatio * 42 +
          concentration * 24 +
          (minDistance === null ? 8 : Math.max(0, 36 - minDistance)) +
          positions.length * 2,
        0,
        99,
      ),
    );

    return {
      address: rawWallet.address,
      accountValue,
      marginUsed,
      totalNotional,
      leverage,
      marginRatio,
      concentration,
      minDistance,
      risk,
      positions,
      fills: Array.isArray(rawWallet.fills) ? rawWallet.fills : [],
      openOrders: Array.isArray(rawWallet.openOrders) ? rawWallet.openOrders : [],
      funding: Array.isArray(rawWallet.funding) ? rawWallet.funding : [],
      fetchedAt: rawWallet.fetchedAt,
    };
  }

  function walletNotes(wallet) {
    if (!wallet) return [];
    const notes = [
      {
        label: "Wallet risk",
        value: String(wallet.risk),
        tone: wallet.risk >= 75 ? "risk" : wallet.risk >= 50 ? "watch" : "good",
        body: `${U.formatUsd(wallet.totalNotional)} notional on ${U.formatUsd(wallet.accountValue)} account value.`,
      },
      {
        label: "Effective leverage",
        value: `${wallet.leverage.toFixed(2)}x`,
        tone: wallet.leverage >= 5 ? "risk" : wallet.leverage >= 2 ? "watch" : "good",
        body: `Margin used ${U.formatUsd(wallet.marginUsed)} (${U.formatPct(wallet.marginRatio * 100, 1, false)} of account value).`,
      },
      {
        label: "Concentration",
        value: U.formatPct(wallet.concentration * 100, 1, false),
        tone: wallet.concentration >= 0.55 ? "watch" : "good",
        body: wallet.positions[0] ? `${wallet.positions[0].coin} is the largest open exposure.` : "No open perp exposure found.",
      },
    ];

    if (wallet.minDistance !== null) {
      notes.push({
        label: "Closest liquidation",
        value: U.formatPct(wallet.minDistance, 1, false),
        tone: wallet.minDistance < 8 ? "risk" : wallet.minDistance < 18 ? "watch" : "good",
        body: "Distance is computed from current mark and public liquidation price.",
      });
    }

    return notes;
  }

  window.HypurrAnalytics = {
    fallbackSnapshot,
    normalizeSnapshot,
    normalizeMarkets,
    normalizeCandles,
    normalizeBook,
    computeStats,
    deriveSignals,
    computeWallet,
    walletNotes,
  };
})(window);
