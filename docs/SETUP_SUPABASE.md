# Setup Supabase

## 1. Projet

1. Creer un projet Supabase.
2. Copier `NEXT_PUBLIC_SUPABASE_URL` et `NEXT_PUBLIC_SUPABASE_ANON_KEY` dans Vercel.
3. Copier `SUPABASE_SERVICE_ROLE_KEY` uniquement dans les variables serveur Vercel.

## 2. Base de donnees

Executer `supabase/schema.sql` dans SQL Editor, puis `supabase/seed.sql` si les donnees de depart sont souhaitees.

## 3. Auth

Activer email/password dans Supabase Auth. Pour un admin :

```sql
update public.profiles
set role = 'admin'
where email = 'ton-email@example.com';
```

## 4. RLS

Les tables principales ont RLS active :

- contenus publics lisibles si `required_plan = 'free'`
- contenus premium lisibles si l'abonnement actif donne le bon rang
- watchlists, alertes, notifications et progression lisibles par leur proprietaire
- gestion admin reservee a `profiles.role = 'admin'`

Le service role doit rester cote serveur uniquement.
