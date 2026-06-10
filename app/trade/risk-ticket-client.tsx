"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  approveBuilder,
  buildPlan,
  BUILDER_ADDRESS,
  BUILDER_ENABLED,
  BUILDER_FEE_TENTH_BPS,
  BUILDER_MAX_FEE_RATE,
  COINS,
  connectBrowserWallet,
  extractErrorMessage,
  HL_APP_URL,
  hyperliquidTradeUrl,
  IS_TESTNET,
  loadAccount,
  loadBuilderApproval,
  loadMeta,
  loadMids,
  placeRiskTrade,
  shortAddr,
  usd,
  type AccountSnapshot,
  type AssetMeta,
  type BrowserWallet,
  type Coin,
  type PlacedLeg,
  type TicketPlan,
} from "./lib/hl";

type Phase = "idle" | "approving" | "signing" | "done";

const R_CHOICES = [0, 1.5, 2, 3] as const;
const RISK_PRESETS = [0.5, 1, 2] as const; // % of account equity

export default function RiskTicketClient() {
  // --- wallet & account ---
  const [wallet, setWallet] = useState<BrowserWallet | null>(null);
  const [account, setAccount] = useState<AccountSnapshot | null>(null);
  const [approvedTenthBps, setApprovedTenthBps] = useState<number>(0);
  const [connecting, setConnecting] = useState(false);

  // --- market data ---
  const [meta, setMeta] = useState<Record<Coin, AssetMeta> | null>(null);
  const [mids, setMids] = useState<Record<Coin, number> | null>(null);
  const [dataError, setDataError] = useState<string | null>(null);

  // --- ticket inputs ---
  const [coin, setCoin] = useState<Coin>("BTC");
  const [side, setSide] = useState<"long" | "short">("long");
  const [riskStr, setRiskStr] = useState("25");
  const [stopStr, setStopStr] = useState("2");
  const [rMultiple, setRMultiple] = useState<number>(2);

  // --- submission ---
  const [phase, setPhase] = useState<Phase>("idle");
  const [legs, setLegs] = useState<PlacedLeg[] | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Market data: meta once, mids every 5 s.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [m, px] = await Promise.all([loadMeta(), loadMids()]);
        if (cancelled) return;
        setMeta(m);
        setMids(px);
        setDataError(null);
      } catch (e) {
        if (!cancelled) setDataError(extractErrorMessage(e));
      }
    })();
    pollRef.current = setInterval(async () => {
      try {
        const px = await loadMids();
        if (!cancelled) {
          setMids(px);
          setDataError(null);
        }
      } catch {
        /* keep last good prices */
      }
    }, 5000);
    return () => {
      cancelled = true;
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  const refreshAccount = useCallback(async (w: BrowserWallet) => {
    try {
      const [acc, approved] = await Promise.all([
        loadAccount(w.address),
        loadBuilderApproval(w.address),
      ]);
      setAccount(acc);
      setApprovedTenthBps(approved);
    } catch (e) {
      setActionError(extractErrorMessage(e));
    }
  }, []);

  const onConnect = useCallback(async () => {
    setConnecting(true);
    setActionError(null);
    try {
      const w = await connectBrowserWallet();
      setWallet(w);
      await refreshAccount(w);
    } catch (e) {
      setActionError(extractErrorMessage(e));
    } finally {
      setConnecting(false);
    }
  }, [refreshAccount]);

  // --- plan preview (recomputed on every input/price change) ---
  const riskUsd = Number(riskStr);
  const stopPct = Number(stopStr);

  const planState = useMemo<{ plan: TicketPlan | null; error: string | null }>(() => {
    if (!meta || !mids) return { plan: null, error: null };
    try {
      const plan = buildPlan(
        { coin, side, riskUsd, stopPct, rMultiple },
        mids[coin],
        meta[coin],
        account,
      );
      return { plan, error: null };
    } catch (e) {
      return { plan: null, error: extractErrorMessage(e) };
    }
  }, [meta, mids, coin, side, riskUsd, stopPct, rMultiple, account]);

  const plan = planState.plan;
  const blocked =
    !plan || plan.warnings.some((w) => w.includes("at most") || w.includes("at least"));

  const needsApproval = BUILDER_ENABLED && approvedTenthBps < BUILDER_FEE_TENTH_BPS;

  const onPlace = useCallback(async () => {
    if (!wallet || !plan || !meta) return;
    setActionError(null);
    setLegs(null);
    try {
      if (needsApproval) {
        setPhase("approving");
        await approveBuilder(wallet);
        setApprovedTenthBps(BUILDER_FEE_TENTH_BPS);
      }
      setPhase("signing");
      const res = await placeRiskTrade(wallet, plan, meta[coin]);
      setLegs(res.legs);
      setPhase("done");
      await refreshAccount(wallet);
    } catch (e) {
      setActionError(extractErrorMessage(e));
      setPhase("idle");
    }
  }, [wallet, plan, meta, coin, needsApproval, refreshAccount]);

  const resetAfterTrade = useCallback(() => {
    setLegs(null);
    setPhase("idle");
  }, []);

  const setRiskPreset = (pct: number) => {
    if (!account || account.accountValue <= 0) return;
    setRiskStr(((account.accountValue * pct) / 100).toFixed(2));
  };

  // Reward/risk bar geometry (risk red on the left, reward green on the right).
  const rrBar = useMemo(() => {
    if (!plan) return null;
    const reward = plan.rewardUsd ?? 0;
    const total = plan.effectiveRiskUsd + reward;
    if (total <= 0) return null;
    return {
      riskPct: (plan.effectiveRiskUsd / total) * 100,
      rewardPct: (reward / total) * 100,
    };
  }, [plan]);

  return (
    <main className="rt-shell">
      <header className="rt-top">
        <a className="rt-back" href="/">
          ← HypurrScope radar
        </a>
        <div className="rt-top-right">
          {IS_TESTNET && <span className="rt-badge rt-badge-testnet">Testnet</span>}
          {wallet ? (
            <span className="rt-badge">{shortAddr(wallet.address)}</span>
          ) : (
            <button className="rt-connect" onClick={onConnect} disabled={connecting}>
              {connecting ? "Connecting…" : "Connect wallet"}
            </button>
          )}
        </div>
      </header>

      <section className="rt-hero">
        <h1>Risk Ticket</h1>
        <p>
          Say how much you accept to lose. The ticket sizes the position and places entry,
          stop loss and take profit on Hyperliquid in one signature.
        </p>
      </section>

      {dataError && <div className="rt-alert rt-alert-error">{dataError}</div>}

      {!BUILDER_ENABLED && (
        <div className="rt-alert">
          Builder fee is not configured (NEXT_PUBLIC_HL_BUILDER_ADDRESS). Trades will work,
          but no volume will be attributed to HypurrScope.
        </div>
      )}

      <section className="rt-card">
        {/* Account strip */}
        <div className="rt-account">
          {wallet && account ? (
            <>
              <span>
                Equity <strong>{usd(account.accountValue)}</strong>
              </span>
              <span>
                Withdrawable <strong>{usd(account.withdrawable)}</strong>
              </span>
            </>
          ) : (
            <span className="rt-muted">
              Connect a wallet with USDC on Hyperliquid {IS_TESTNET ? "testnet" : ""} perps to
              trade.
            </span>
          )}
        </div>

        {/* Asset */}
        <div className="rt-field">
          <label>Market</label>
          <div className="rt-pills">
            {COINS.map((c) => (
              <button
                key={c}
                className={`rt-pill ${coin === c ? "active" : ""}`}
                onClick={() => setCoin(c)}
              >
                <span>{c}</span>
                <small>{mids ? usd(mids[c], c === "BTC" ? 0 : 2) : "…"}</small>
              </button>
            ))}
          </div>
        </div>

        {/* Direction */}
        <div className="rt-field">
          <label>Direction</label>
          <div className="rt-pills rt-pills-2">
            <button
              className={`rt-pill rt-long ${side === "long" ? "active" : ""}`}
              onClick={() => setSide("long")}
            >
              Long — price goes up
            </button>
            <button
              className={`rt-pill rt-short ${side === "short" ? "active" : ""}`}
              onClick={() => setSide("short")}
            >
              Short — price goes down
            </button>
          </div>
        </div>

        {/* Risk */}
        <div className="rt-field">
          <label htmlFor="rt-risk">If the stop is hit, I lose</label>
          <div className="rt-input-row">
            <div className="rt-input">
              <span className="rt-unit">$</span>
              <input
                id="rt-risk"
                type="number"
                min="0"
                step="any"
                inputMode="decimal"
                value={riskStr}
                onChange={(e) => setRiskStr(e.target.value)}
              />
            </div>
            <div className="rt-presets">
              {RISK_PRESETS.map((p) => (
                <button
                  key={p}
                  onClick={() => setRiskPreset(p)}
                  disabled={!account || account.accountValue <= 0}
                  title={account ? `${p}% of equity` : "Connect wallet first"}
                >
                  {p}%
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Stop */}
        <div className="rt-field">
          <label htmlFor="rt-stop">Stop loss distance</label>
          <div className="rt-input-row">
            <div className="rt-input">
              <input
                id="rt-stop"
                type="number"
                min="0"
                step="any"
                inputMode="decimal"
                value={stopStr}
                onChange={(e) => setStopStr(e.target.value)}
              />
              <span className="rt-unit">%</span>
            </div>
            {plan && (
              <span className="rt-inline-hint">
                stop @ {usd(plan.stopPx, coin === "BTC" ? 0 : 2)}
              </span>
            )}
          </div>
        </div>

        {/* Take profit */}
        <div className="rt-field">
          <label>Take profit</label>
          <div className="rt-pills rt-pills-4">
            {R_CHOICES.map((r) => (
              <button
                key={r}
                className={`rt-pill ${rMultiple === r ? "active" : ""}`}
                onClick={() => setRMultiple(r)}
              >
                {r === 0 ? "Off" : `${r}R`}
              </button>
            ))}
          </div>
          <small className="rt-muted">
            2R = the target pays twice what the stop costs.
          </small>
        </div>
      </section>

      {/* Plan preview — the consequence sentence */}
      <section className="rt-card rt-review">
        {planState.error && <div className="rt-alert rt-alert-error">{planState.error}</div>}

        {plan && (
          <>
            <p className="rt-consequence">
              If the stop is hit you lose <b className="rt-red">{usd(plan.effectiveRiskUsd)}</b>
              {plan.rewardUsd !== null ? (
                <>
                  {" "}
                  · if the target is hit you make{" "}
                  <b className="rt-green">{usd(plan.rewardUsd)}</b>
                </>
              ) : (
                <> · no take profit: you close the trade yourself</>
              )}
              .
            </p>

            {rrBar && (
              <div
                className="rt-rrbar"
                role="img"
                aria-label={`Risk ${usd(plan.effectiveRiskUsd)} versus reward ${usd(plan.rewardUsd)}`}
              >
                <span className="rt-rrbar-risk" style={{ width: `${rrBar.riskPct}%` }} />
                <span className="rt-rrbar-reward" style={{ width: `${rrBar.rewardPct}%` }} />
              </div>
            )}

            <dl className="rt-details">
              <div>
                <dt>Entry (market)</dt>
                <dd>≈ {usd(plan.entryPx, coin === "BTC" ? 0 : 2)}</dd>
              </div>
              <div>
                <dt>Size</dt>
                <dd>
                  {plan.sizeStr} {coin}
                </dd>
              </div>
              <div>
                <dt>Position value</dt>
                <dd>{usd(plan.notionalUsd)}</dd>
              </div>
              <div>
                <dt>Implied leverage</dt>
                <dd>{plan.impliedLeverage ? `${plan.impliedLeverage.toFixed(1)}x` : "—"}</dd>
              </div>
              {BUILDER_ENABLED && (
                <div>
                  <dt>HypurrScope fee</dt>
                  <dd>
                    {BUILDER_MAX_FEE_RATE} ≈ {usd(plan.builderFeeUsd, 4)}
                  </dd>
                </div>
              )}
            </dl>

            {plan.warnings.map((w) => (
              <div key={w} className="rt-alert rt-alert-warn">
                {w}
              </div>
            ))}
          </>
        )}

        {actionError && <div className="rt-alert rt-alert-error">{actionError}</div>}

        {/* Action area */}
        {legs ? (
          <div className="rt-result">
            {legs.map((leg) => (
              <div key={leg.label} className={`rt-leg rt-leg-${leg.status}`}>
                <span>{leg.label}</span>
                <span>{leg.detail}</span>
              </div>
            ))}
            <div className="rt-result-actions">
              <a href={hyperliquidTradeUrl(coin)} target="_blank" rel="noopener noreferrer">
                Manage on Hyperliquid ↗
              </a>
              <button onClick={resetAfterTrade}>New ticket</button>
            </div>
          </div>
        ) : !wallet ? (
          <button className="rt-place" onClick={onConnect} disabled={connecting}>
            {connecting ? "Connecting…" : "Connect wallet to trade"}
          </button>
        ) : (
          <>
            {needsApproval && (
              <p className="rt-approval-note">
                First trade only: your wallet will ask to approve a max HypurrScope fee of{" "}
                {BUILDER_MAX_FEE_RATE} per trade (builder {shortAddr(BUILDER_ADDRESS)}). You can{" "}
                <a
                  href={`${HL_APP_URL}/builderCodes`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  revoke it anytime
                </a>
                .
              </p>
            )}
            <button
              className="rt-place"
              onClick={onPlace}
              disabled={blocked || phase === "approving" || phase === "signing"}
            >
              {phase === "approving"
                ? "Approve the fee in your wallet…"
                : phase === "signing"
                  ? "Sign the order in your wallet…"
                  : side === "long"
                    ? `Place long ${coin}`
                    : `Place short ${coin}`}
            </button>
            <small className="rt-muted rt-sign-hint">
              One signature places entry, stop and target together. The signature authorizes
              this exact order only.
            </small>
          </>
        )}
      </section>

      <footer className="rt-foot">
        <p>
          Perpetuals are leveraged instruments: losses can reach your full margin and stop
          orders can fill with slippage in fast markets. Nothing here is financial advice.
          {BUILDER_ENABLED && (
            <>
              {" "}
              Trades include a {BUILDER_MAX_FEE_RATE} builder fee paid to HypurrScope —{" "}
              <a href={`${HL_APP_URL}/builderCodes`} target="_blank" rel="noopener noreferrer">
                review or revoke
              </a>
              .
            </>
          )}
        </p>
      </footer>
    </main>
  );
}
