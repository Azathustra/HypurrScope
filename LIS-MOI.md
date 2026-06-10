# LIS-MOI — Mise en ligne de ton site réparé + Risk Ticket

## Ce que contient ce dossier

**Ton site COMPLET, prêt à mettre en ligne.** Pas un morceau : tout.

C'est ta bonne version (celle avec le mode Beginner/Pro, les alertes Telegram et
Signal History — uploadée le 10 juin à 8h17, je l'ai retrouvée dans l'historique
de ton GitHub), avec en plus :

1. **2 bugs corrigés** dans `app/api/cron/update-signal-outcomes/route.ts`.
   C'étaient eux qui faisaient échouer tous tes déploiements Vercel.
2. **La nouvelle page `/trade`** (le Risk Ticket) : dossier `app/trade/`.
3. **Une ligne ajoutée** dans `package.json` (l'outil Hyperliquid) et **un lien
   "Trade — Risk Ticket"** dans le menu de gauche.

Tout le reste est identique à ta version, au caractère près.

## Étape 1 — Mettre en ligne (ta méthode habituelle)

1. Dézippe le fichier → tu obtiens un dossier `hypurrscope-site`
2. Va sur github.com → ton repo `Azathustra/HypurrScope`
3. Supprime ce qu'il y a actuellement (comme tu fais d'habitude : chaque
   fichier/dossier → `...` → Delete). Ne t'inquiète pas : tout reste dans
   l'historique, rien n'est jamais vraiment perdu.
4. Bouton **Add file** → **Upload files** → ouvre le dossier `hypurrscope-site`
   sur ton ordi, sélectionne TOUT ce qu'il y a DEDANS (Ctrl+A / Cmd+A) et
   glisse-le dans la page GitHub
5. Bouton vert **Commit changes**
6. Vercel construit le site tout seul (2-3 min). Va dans Vercel → Deployments :
   le déploiement doit passer au **vert (Ready)** — pour la première fois
   depuis un moment.
7. Vérifie : hypurrscope.xyz fonctionne, et hypurrscope.xyz/trade affiche le
   Risk Ticket.

## Étape 2 — Réglages Vercel (pour le builder code)

Vercel → ton projet → **Settings** → **Environment Variables** → ajoute :

| Nom | Valeur |
|---|---|
| `NEXT_PUBLIC_HL_TESTNET` | `1` (pour commencer en mode test) |
| `NEXT_PUBLIC_HL_BUILDER_ADDRESS` | ton adresse builder `0x…` (voir étape 3) |
| `NEXT_PUBLIC_HL_BUILDER_FEE_TENTH_BPS` | `10` (= 0,01 % par trade) |

Puis **Deployments** → bouton `...` du dernier déploiement → **Redeploy**
(obligatoire après chaque changement de variable).

## Étape 3 — Devenir builder (5 minutes, une seule fois)

1. Choisis le wallet qui encaissera tes commissions (un wallet dédié, c'est
   plus propre)
2. Dépose **au moins 100 USDC** sur son compte **Perps** Hyperliquid (condition
   du protocole)
3. Mets son adresse dans `NEXT_PUBLIC_HL_BUILDER_ADDRESS` + Redeploy
4. Tes commissions se réclament ensuite sur app.hyperliquid.xyz →
   **Referrals** → **Rewards**

Tant que cette adresse n'est pas configurée, la page /trade fonctionne mais
le volume n'est pas compté pour toi (un bandeau te le rappelle).

## Étape 4 — Tester en mode test AVANT le vrai argent

1. Avec `NEXT_PUBLIC_HL_TESTNET=1`, la page affiche un badge **TESTNET**
2. Va sur https://app.hyperliquid-testnet.xyz, connecte un wallet de test,
   récupère des faux USDC (faucet)
3. Sur hypurrscope.xyz/trade : connecte ce wallet, place un ticket
   (ex. BTC, long, je risque 25 $, stop 2 %, TP 2R)
4. Vérifie sur le site testnet Hyperliquid : la position est ouverte avec ses
   2 ordres de protection (stop + target)
5. Quand tout est bon : supprime la variable `NEXT_PUBLIC_HL_TESTNET` sur
   Vercel + Redeploy → tu es en réel

## Important

- Ton site ne touche **jamais** aux clés privées de personne : chaque trade
  est signé dans le wallet de l'utilisateur, sur son écran.
- L'utilisateur approuve ton fee (0,01 % max) une fois, et peut le révoquer
  quand il veut sur app.hyperliquid.xyz/builderCodes — c'est affiché en clair
  dans la page.
- Tu passes d'un site d'information à une interface qui exécute des ordres
  contre rémunération : pense à des conditions d'utilisation et vérifie le
  cadre réglementaire. Ce module n'est pas un avis juridique.
