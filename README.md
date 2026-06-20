# Insider Crypto

Site web crypto/research premium construit avec Next.js, TypeScript, Tailwind CSS, Recharts et Lucide React.

## Pages incluses

- `/` : accueil premium avec signaux et portefeuilles en vedette
- `/portfolio` : portefeuille Insider Crypto, allocations, transactions, performance et onglets d'analyse
- `/cryptos` : table de cryptos monitorées
- `/hyperliquid` : dashboard HYPE avec métriques et graphique volume/open interest
- `/feed` : alpha feed filtrable
- `/research` : moteur de recherche visuel

## Installation

```bash
pnpm install
pnpm dev
```

Puis ouvrir :

```txt
http://localhost:3000
```

## Build production

```bash
pnpm build
pnpm start
```

## Stack

- Next.js 15
- React 19
- TypeScript
- Tailwind CSS
- Recharts
- Lucide React
- Données mockées locales dans `lib/mock-data.ts`
