# Checklist production

- Supabase Auth email/password active.
- `supabase/schema.sql` execute.
- `supabase/seed.sql` execute si les donnees de depart sont souhaitees.
- Admin defini dans `profiles.role`.
- Prix Stripe renseignes dans Vercel.
- Webhook Stripe configure.
- Pages legales relues.
- Disclaimer visible sur research, portefeuille, pricing et espace membre.
- Donnees demo remplacees par requetes Supabase ou flux verifies.
- Flux crypto et TradFi affichent source + timestamp.
- Aucun contenu premium complet n'est envoye cote client sans verification serveur.
- RLS teste avec utilisateur gratuit, membre, pro et admin.
- Sentry/PostHog ou outil equivalent configure avant ouverture publique.
