# Crypto Hold-Up / HypurrScope

Plateforme crypto premium en Next.js 15, TypeScript, Tailwind, Supabase et Stripe.

## Stack

- Next.js 15 App Router
- TypeScript strict
- Tailwind CSS
- Lucide React
- Recharts
- Supabase Auth + PostgreSQL + RLS
- Stripe Billing + Customer Portal + webhooks
- Zod
- React Hook Form
- Date-fns
- Sonner

## Commandes

```bash
pnpm install
pnpm dev
pnpm build
pnpm start
```

## Variables d'environnement

Copier `.env.example` vers `.env.local` :

```txt
NEXT_PUBLIC_SITE_URL=http://localhost:3000
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_PRICE_THESES_MONTHLY=
STRIPE_PRICE_PORTFOLIO_ALERTS_MONTHLY=
STRIPE_PRICE_PORTFOLIO_ALERTS_YEARLY=
RESEND_API_KEY=
SENTRY_DSN=
NEXT_PUBLIC_POSTHOG_KEY=
NEXT_PUBLIC_POSTHOG_HOST=
NEXT_PUBLIC_DEMO_ADMIN=false
```

## Supabase

Executer `supabase/schema.sql`, puis `supabase/seed.sql` si un socle demo est souhaite.

Le schema couvre notamment :

- `profiles`, `subscriptions`, `invoices`
- `research_posts`, `alpha_signals`, `reports`
- `portfolios`, `portfolio_allocations`, `portfolio_transactions`, `portfolio_performance_points`
- `rooms`, `room_memberships`, `community_posts`, `comments`, `reactions`
- `watchlists`, `watchlist_items`, `alerts`, `notifications`
- `formation_tracks`, `formation_lessons`, `lesson_progress`
- `bookmarks`, `audit_logs`

RLS est active sur les tables sensibles. Les contenus premium doivent etre servis cote serveur apres verification du plan.

## Stripe

Creer 3 produits/prix :

- `theses_monthly` : 49 EUR/mois
- `portfolio_alerts_monthly` : 99 EUR/mois
- `portfolio_alerts_yearly` : 944 EUR/an

Configurer le webhook Stripe vers :

```txt
https://votre-domaine.com/api/stripe/webhook
```

## Routes principales

Publiques :

- `/`
- `/pricing`
- `/community`
- `/methodologie`
- `/research`
- `/research/[slug]`
- `/about`
- `/faq`
- `/legal/mentions-legales`
- `/legal/cgu`
- `/legal/confidentialite`
- `/legal/risques`
- `/login`
- `/signup`
- `/forgot-password`

Membres :

- `/dashboard`
- `/feed`
- `/rooms`
- `/rooms/[slug]`
- `/posts/[id]`
- `/research/premium`
- `/portfolios`
- `/portfolios/[slug]`
- `/watchlists`
- `/watchlists/[id]`
- `/alerts`
- `/formations`
- `/formations/[slug]`
- `/members`
- `/members/[username]`
- `/notifications`
- `/settings`
- `/settings/profile`
- `/settings/billing`
- `/settings/security`

Admin :

- `/admin`
- `/admin/posts`
- `/admin/posts/new`
- `/admin/posts/[id]/edit`
- `/admin/portfolios`
- `/admin/signals`
- `/admin/users`
- `/admin/subscriptions`

## Disclaimer

Contenu fourni a titre informatif et educatif. Ne constitue pas un conseil en investissement personnalise. Les crypto-actifs sont risques.

## Guides

- `docs/SETUP_SUPABASE.md`
- `docs/SETUP_STRIPE.md`
- `docs/DEPLOY_VERCEL.md`
- `docs/PRODUCTION_CHECKLIST.md`
