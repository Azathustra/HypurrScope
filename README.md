# Insider Crypto / HypurrScope

SaaS crypto research premium en Next.js 15, TypeScript, Tailwind, Supabase et Stripe.

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

```bash
NEXT_PUBLIC_SITE_URL=http://localhost:3000
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_PRICE_MEMBER_MONTHLY=
STRIPE_PRICE_MEMBER_YEARLY=
STRIPE_PRICE_DESK_YEARLY=
NEXT_PUBLIC_DEMO_ADMIN=false
```

## Supabase

1. Créer un projet Supabase.
2. Copier `NEXT_PUBLIC_SUPABASE_URL` et `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
3. Copier `SUPABASE_SERVICE_ROLE_KEY` côté serveur uniquement.
4. Exécuter `supabase/schema.sql` dans SQL Editor.
5. Activer l'auth email/password.
6. Définir les admins via `profiles.role = 'admin'`.

Le schéma contient :

- `profiles`
- `subscriptions`
- `research_posts`
- `alpha_signals`
- `portfolios`
- `portfolio_allocations`
- `portfolio_transactions`
- `portfolio_performance_points`
- `reports`
- `bookmarks`

RLS est activé sur les tables sensibles. Les contenus premium doivent être servis côté serveur après vérification du plan.

## Stripe

Créer 3 produits/prix :

- `member_monthly` : 49 €/mois
- `member_yearly` : 399 €/an
- `desk` : 990 €/an ou sur demande

Renseigner :

- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `STRIPE_PRICE_MEMBER_MONTHLY`
- `STRIPE_PRICE_MEMBER_YEARLY`
- `STRIPE_PRICE_DESK_YEARLY`

Configurer le webhook Stripe vers :

```txt
https://votre-domaine.com/api/stripe/webhook
```

Événements suivis :

- `checkout.session.completed`
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `invoice.payment_succeeded`
- `invoice.payment_failed`

## Routes

Publiques :

- `/`
- `/pricing`
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

Membres :

- `/dashboard`
- `/feed`
- `/portfolios`
- `/portfolios/[slug]`
- `/projects`
- `/projects/[slug]`
- `/hyperliquid`
- `/reports`
- `/formations`
- `/account`
- `/account/billing`

Admin :

- `/admin`
- `/admin/posts`
- `/admin/posts/new`
- `/admin/posts/[id]/edit`
- `/admin/portfolios`
- `/admin/signals`
- `/admin/users`
- `/admin/subscriptions`

API :

- `/api/stripe/create-checkout-session`
- `/api/stripe/create-portal-session`
- `/api/stripe/webhook`
- `/api/admin/posts`
- `/api/admin/portfolios`
- `/api/admin/signals`

## Disclaimer

Contenu fourni à titre informatif et éducatif. Ne constitue pas un conseil en investissement personnalisé. Les crypto-actifs sont risqués.
