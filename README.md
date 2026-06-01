# HypurrScope

A read-only ecosystem intelligence dashboard for Hyperliquid markets, whales, vaults, Hypurr NFTs and TradFi flows.

## Modules

- Market Pulse: live Hyperliquid perps data via `/api/hyperliquid/info`
- Whale Watch: manual wallet scanner via `clearinghouseState`
- Vault Risk: vault screener via `/api/hyperliquid/vaults`
- Hypurr NFT Pulse: OpenSea-ready NFT stats and recent sales
- TradFi Flow: HYPE ETP / ETF watchlist
- Methodology: scoring logic and builder identity section

## Safety model

This V1 is read-only:

- no wallet connect
- no private keys
- no order routing
- no copy-trading execution
- no smart contracts

## Local setup

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Optional environment variables

Create `.env.local` if you want OpenSea data to work more reliably:

```bash
OPENSEA_API_KEY=your_opensea_api_key
```

The app will still run without this key and will show fallback NFT data.

## Deploy on Vercel

1. Create a GitHub repository.
2. Upload this project.
3. Go to Vercel → New Project → Import GitHub repo.
4. Deploy.
5. Add `OPENSEA_API_KEY` in Vercel environment variables if you have one.
6. Replace `0x...soon` with your public builder wallet.

## Important

The scoring is heuristic and for information only. It is not financial advice and not an automated trading system.
