# Insider Crypto

Site web crypto/research premium construit avec Next.js, TypeScript, Tailwind CSS, Recharts et Lucide React.

## Pages incluses

- `/` : page d'accueil publique avec accès premium simulé
- `/portfolio` : portefeuille Insider Crypto, allocations, transactions, performance et onglets d'analyse
- `/cryptos` : table de cryptos monitorées
- `/hyperliquid` : dashboard HYPE conservé dans le code, non affiché dans la navigation
- `/feed` : alpha feed filtrable
- `/research` : moteur de recherche visuel
- `/formation` : parcours de formation premium

## Accès membre

La home reste publique. Les autres pages sont verrouillées tant que l'utilisateur n'a pas activé l'accès premium simulé.

Cette logique est volontairement côté frontend pour la maquette. Elle peut ensuite être remplacée par une vraie intégration Auth + Stripe.

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
