# HypurrScope Pro

HypurrScope Pro is a read-only Hyperliquid market intelligence console. It turns the current HypurrScope idea into a more complete builder product: live perps radar, HYPE tape, funding and OI analytics, order-book depth, wallet risk scoring, local alert rules, and a transparent builder proof page.

## What changed

- Rebuilt the product as a multi-view analytics app instead of a static dashboard.
- Uses the official Hyperliquid Info API directly for `metaAndAssetCtxs`, `candleSnapshot`, `l2Book`, `clearinghouseState`, `userFills`, `frontendOpenOrders`, and `userFunding`.
- Adds computed models for market risk, wallet health, fee-pressure estimates, book imbalance, and regime classification.
- Adds graceful fallback and local caching so the site still renders during API failures.
- Adds professional SEO metadata, responsive layout, and deployment-ready static files.

## Files

- `index.html` - app shell and semantic UI structure.
- `assets/styles.css` - responsive product UI.
- `assets/js/hyperliquid.js` - official API adapter.
- `assets/js/analytics.js` - normalizers and scoring models.
- `assets/js/charts.js` - canvas charts and heatmap rendering.
- `assets/js/app.js` - app state, navigation, rendering, wallet scan, and rules.
- `manifest.webmanifest` - installable app metadata.

## Deploy

This build is static. You can deploy the full `hypurrscope-pro` folder on Vercel, Netlify, Cloudflare Pages, GitHub Pages, or any static host.

For the next production step, add a thin server/API proxy with cache headers and rate limiting. The app works without it because Hyperliquid currently sends permissive CORS headers, but a proxy will look more professional and protect users from transient API issues.

## Suggested next grant-facing improvements

1. Publish the source code with a clear changelog and formula documentation.
2. Add a serverless proxy for third-party modules such as OpenSea, ecosystem directories, and historical archives.
3. Add sharable wallet reports with a stable URL and no private wallet permissions.
4. Add a small test suite around scoring formulas and API normalizers.
