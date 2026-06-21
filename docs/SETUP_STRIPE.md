# Setup Stripe

## Produits

Creer trois prix recurrents :

- Theses : `49 EUR / mois`
- Portefeuille & alertes : `99 EUR / mois`
- Annuel : `944 EUR / an`

Renseigner dans Vercel :

```txt
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_PRICE_THESES_MONTHLY=
STRIPE_PRICE_PORTFOLIO_ALERTS_MONTHLY=
STRIPE_PRICE_PORTFOLIO_ALERTS_YEARLY=
```

## Webhook

Configurer un endpoint :

```txt
https://ton-domaine.com/api/stripe/webhook
```

Evenements :

- `checkout.session.completed`
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `invoice.payment_succeeded`
- `invoice.payment_failed`

Le checkout est deja branche par formulaire sur `/pricing`. En production, il faut lier `checkout.session.completed` au `user_id` via `client_reference_id` ou metadata Supabase.
