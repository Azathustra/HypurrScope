(function attachUtils(window) {
  "use strict";

  const cachePrefix = "hypurrscope:";

  function $(selector, root) {
    return (root || document).querySelector(selector);
  }

  function $$(selector, root) {
    return Array.from((root || document).querySelectorAll(selector));
  }

  function toNumber(value, fallback) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback || 0;
  }

  function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
  }

  function formatUsd(value, options) {
    const amount = toNumber(value, NaN);
    if (!Number.isFinite(amount)) return "$--";
    const abs = Math.abs(amount);
    const sign = amount < 0 ? "-" : "";
    const maximumFractionDigits = options && options.decimals !== undefined ? options.decimals : 2;

    if (abs >= 1e12) return `${sign}$${(abs / 1e12).toFixed(2)}T`;
    if (abs >= 1e9) return `${sign}$${(abs / 1e9).toFixed(2)}B`;
    if (abs >= 1e6) return `${sign}$${(abs / 1e6).toFixed(2)}M`;
    if (abs >= 1e3) return `${sign}$${(abs / 1e3).toFixed(2)}K`;
    if (abs >= 1) return `${sign}$${abs.toLocaleString("en-US", { maximumFractionDigits })}`;
    return `${sign}$${abs.toPrecision(3)}`;
  }

  function formatNumber(value, digits) {
    const amount = toNumber(value, NaN);
    if (!Number.isFinite(amount)) return "--";
    return amount.toLocaleString("en-US", {
      maximumFractionDigits: digits === undefined ? 2 : digits,
    });
  }

  function formatPct(value, digits, signed) {
    const amount = toNumber(value, NaN);
    if (!Number.isFinite(amount)) return "--";
    const sign = signed && amount > 0 ? "+" : "";
    return `${sign}${amount.toFixed(digits === undefined ? 2 : digits)}%`;
  }

  function formatBps(decimalRate) {
    const bps = toNumber(decimalRate) * 10000;
    return `${bps.toFixed(1)} bps`;
  }

  function escapeHtml(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function shortAddress(address) {
    if (!address || address.length < 12) return address || "--";
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  }

  function timeAgo(dateLike) {
    const date = dateLike instanceof Date ? dateLike : new Date(dateLike);
    if (!Number.isFinite(date.getTime())) return "--";
    const seconds = Math.max(1, Math.round((Date.now() - date.getTime()) / 1000));
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.round(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.round(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return date.toLocaleDateString("en-US");
  }

  function setCache(key, value) {
    try {
      localStorage.setItem(`${cachePrefix}${key}`, JSON.stringify({ value, savedAt: Date.now() }));
    } catch (error) {
      return false;
    }
    return true;
  }

  function getCache(key, maxAgeMs) {
    try {
      const raw = localStorage.getItem(`${cachePrefix}${key}`);
      if (!raw) return null;
      const payload = JSON.parse(raw);
      if (maxAgeMs && Date.now() - payload.savedAt > maxAgeMs) return null;
      return payload.value;
    } catch (error) {
      return null;
    }
  }

  function riskColor(score) {
    const risk = clamp(toNumber(score), 0, 100);
    if (risk >= 75) return "#ff7a8d";
    if (risk >= 55) return "#f2c66d";
    return "#35d58a";
  }

  function debounce(fn, delay) {
    let handle = 0;
    return function debounced() {
      const args = arguments;
      window.clearTimeout(handle);
      handle = window.setTimeout(() => fn.apply(null, args), delay);
    };
  }

  window.HypurrUtils = {
    $,
    $$,
    toNumber,
    clamp,
    formatUsd,
    formatNumber,
    formatPct,
    formatBps,
    escapeHtml,
    shortAddress,
    timeAgo,
    setCache,
    getCache,
    riskColor,
    debounce,
  };
})(window);
