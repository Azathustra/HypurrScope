# Deploiement Vercel

## Variables

Ajouter toutes les variables de `.env.example` dans Vercel.

Minimum pour builder :

```txt
NEXT_PUBLIC_SITE_URL=
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_PRICE_THESES_MONTHLY=
STRIPE_PRICE_PORTFOLIO_ALERTS_MONTHLY=
STRIPE_PRICE_PORTFOLIO_ALERTS_YEARLY=
```

## Build

Vercel doit utiliser :

```txt
pnpm build
```

## Domaine

Configurer le domaine, puis mettre a jour `NEXT_PUBLIC_SITE_URL`. Mettre la meme URL dans les redirects Supabase Auth et dans le webhook Stripe.
