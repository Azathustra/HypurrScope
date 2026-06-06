(function attachCharts(window) {
  "use strict";

  const U = window.HypurrUtils;

  function prepareCanvas(canvas) {
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const width = Math.max(1, Math.round(rect.width * dpr));
    const height = Math.max(1, Math.round(rect.height * dpr));
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }
    const ctx = canvas.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return { ctx, width: rect.width, height: rect.height };
  }

  function clear(ctx, width, height) {
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = "#0a0d0c";
    ctx.fillRect(0, 0, width, height);
  }

  function drawGrid(ctx, width, height, padding) {
    ctx.strokeStyle = "rgba(255,255,255,0.06)";
    ctx.lineWidth = 1;
    for (let index = 0; index < 5; index += 1) {
      const y = padding.top + ((height - padding.top - padding.bottom) / 4) * index;
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(width - padding.right, y);
      ctx.stroke();
    }
  }

  function drawPriceChart(canvas, candles) {
    if (!canvas) return;
    const { ctx, width, height } = prepareCanvas(canvas);
    clear(ctx, width, height);
    const data = Array.isArray(candles) ? candles.filter((item) => item.close > 0) : [];
    if (data.length < 2) return drawEmpty(ctx, width, height, "Waiting for candles");

    const padding = { top: 24, right: 18, bottom: 30, left: 54 };
    const values = data.map((item) => item.close);
    const min = Math.min.apply(null, values);
    const max = Math.max.apply(null, values);
    const span = Math.max(0.0001, max - min);
    const plotWidth = width - padding.left - padding.right;
    const plotHeight = height - padding.top - padding.bottom;

    drawGrid(ctx, width, height, padding);

    const points = data.map((item, index) => ({
      x: padding.left + (plotWidth * index) / (data.length - 1),
      y: padding.top + plotHeight - ((item.close - min) / span) * plotHeight,
    }));

    const positive = data[data.length - 1].close >= data[0].close;
    const stroke = positive ? "#7cf7c7" : "#ff7a8d";
    const fill = ctx.createLinearGradient(0, padding.top, 0, height - padding.bottom);
    fill.addColorStop(0, positive ? "rgba(124,247,199,0.28)" : "rgba(255,122,141,0.25)");
    fill.addColorStop(1, "rgba(8,10,10,0)");

    ctx.beginPath();
    points.forEach((point, index) => {
      if (index === 0) ctx.moveTo(point.x, point.y);
      else ctx.lineTo(point.x, point.y);
    });
    ctx.lineTo(points[points.length - 1].x, height - padding.bottom);
    ctx.lineTo(points[0].x, height - padding.bottom);
    ctx.closePath();
    ctx.fillStyle = fill;
    ctx.fill();

    ctx.beginPath();
    points.forEach((point, index) => {
      if (index === 0) ctx.moveTo(point.x, point.y);
      else ctx.lineTo(point.x, point.y);
    });
    ctx.strokeStyle = stroke;
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = "#95a49b";
    ctx.font = "12px Inter, system-ui, sans-serif";
    ctx.fillText(U.formatUsd(max), 12, padding.top + 4);
    ctx.fillText(U.formatUsd(min), 12, height - padding.bottom);
    ctx.fillStyle = "#eef6f1";
    ctx.fillText(U.formatUsd(data[data.length - 1].close), width - 112, padding.top + 4);
  }

  function drawDepthChart(canvas, book) {
    if (!canvas) return;
    const { ctx, width, height } = prepareCanvas(canvas);
    clear(ctx, width, height);
    if (!book || !book.bids || !book.asks) return drawEmpty(ctx, width, height, "Waiting for order book");

    const padding = { top: 26, right: 22, bottom: 28, left: 22 };
    const plotWidth = width - padding.left - padding.right;
    const plotHeight = height - padding.top - padding.bottom;
    const maxUsd = Math.max(
      1,
      ...book.bids.map((level) => level.usd),
      ...book.asks.map((level) => level.usd),
    );
    const rowHeight = plotHeight / Math.max(book.bids.length, book.asks.length, 1);
    const center = padding.left + plotWidth / 2;

    ctx.strokeStyle = "rgba(255,255,255,0.08)";
    ctx.beginPath();
    ctx.moveTo(center, padding.top);
    ctx.lineTo(center, height - padding.bottom);
    ctx.stroke();

    drawSide(book.bids, "bid");
    drawSide(book.asks, "ask");

    ctx.fillStyle = "#95a49b";
    ctx.font = "12px Inter, system-ui, sans-serif";
    ctx.fillText("Bids", padding.left, 18);
    ctx.fillText("Asks", center + 12, 18);

    function drawSide(levels, side) {
      levels.slice(0, 18).forEach((level, index) => {
        const y = padding.top + index * rowHeight + 2;
        const barWidth = Math.max(2, (level.usd / maxUsd) * (plotWidth / 2 - 18));
        const x = side === "bid" ? center - barWidth - 8 : center + 8;
        ctx.fillStyle = side === "bid" ? "rgba(124,247,199,0.52)" : "rgba(255,122,141,0.52)";
        ctx.fillRect(x, y, barWidth, Math.max(2, rowHeight - 4));
      });
    }
  }

  function drawEmpty(ctx, width, height, label) {
    ctx.fillStyle = "#95a49b";
    ctx.font = "13px Inter, system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(label, width / 2, height / 2);
    ctx.textAlign = "start";
  }

  function renderHeatmap(container, markets) {
    if (!container) return;
    const items = (markets || [])
      .slice()
      .sort((a, b) => b.risk - a.risk)
      .slice(0, 36);
    if (!items.length) {
      container.innerHTML = '<div class="empty-state">Waiting for markets</div>';
      return;
    }

    container.innerHTML = items
      .map((market) => {
        const risk = U.clamp(market.risk, 0, 100);
        const alpha = 0.16 + risk / 180;
        const color = U.riskColor(risk);
        const border = market.rawFunding >= 0 ? "rgba(124,247,199,0.28)" : "rgba(255,122,141,0.28)";
        return `
          <div class="heat-cell" title="${U.escapeHtml(market.symbol)} risk ${risk}" style="background: linear-gradient(180deg, ${hexToRgba(color, alpha)}, rgba(16,19,18,0.88)); border-color: ${border};">
            <strong>${U.escapeHtml(market.symbol)}</strong>
            <span>${risk} risk</span>
            <span>${U.formatPct(market.fundingPct, 4, true)}</span>
          </div>
        `;
      })
      .join("");
  }

  function hexToRgba(hex, alpha) {
    const normalized = hex.replace("#", "");
    const int = parseInt(normalized, 16);
    const r = (int >> 16) & 255;
    const g = (int >> 8) & 255;
    const b = int & 255;
    return `rgba(${r},${g},${b},${alpha})`;
  }

  window.HypurrCharts = {
    drawPriceChart,
    drawDepthChart,
    renderHeatmap,
  };
})(window);
