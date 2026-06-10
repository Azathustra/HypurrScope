# Ajout du Risk Ticket à ta version actuelle

## Contenu (3 éléments, rien d'autre ne change)
1. `app/trade/`              → NOUVEAU : la page /trade (Risk Ticket)
2. `app/hypurrscope-client.tsx` → REMPLACE le tien : identique + le lien
   "Trade — Risk Ticket" dans le menu (1 seul bloc ajouté)
3. `package.json`            → REMPLACE le tien : identique + 1 ligne
   (l'outil Hyperliquid "@nktkas/hyperliquid")

## Le geste (1 seul commit)
1. Dézippe → ouvre le dossier `ajout-risk-ticket`
2. Sélectionne tout (Ctrl+A) : le dossier `app` + `package.json` (+ ce fichier)
3. GitHub → ton repo → À LA RACINE → Add file → Upload files →
   GLISSE la sélection (pas "choose your files")
4. GitHub fusionne `app` avec l'existant et remplace les 2 fichiers → Commit changes
   ⚠️ NE supprime RIEN avant : cette fois on AJOUTE seulement.
5. Vercel déploie → vert → hypurrscope.xyz/trade existe

## Ensuite (pour que le builder code te rapporte)
Vercel → Settings → Environment Variables :
- NEXT_PUBLIC_HL_TESTNET = 1            (mode test pour commencer)
- NEXT_PUBLIC_HL_BUILDER_ADDRESS = 0x…  (ton adresse builder, ≥100 USDC en perps)
- NEXT_PUBLIC_HL_BUILDER_FEE_TENTH_BPS = 10   (= 0,01 %/trade)
Puis Deployments → "..." → Redeploy (obligatoire après chaque variable).

Test : wallet de test + faux USDC sur app.hyperliquid-testnet.xyz →
place un ticket sur /trade → vérifie position + stop + target sur le testnet.
Quand OK : supprime NEXT_PUBLIC_HL_TESTNET + Redeploy → réel.
