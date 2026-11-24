# Cotisations Tournoi

Application Next.js gratuite pour enregistrer et suivre les cotisations du tournoi.

## Fonctionnalités

- Connexion par **numéro de téléphone** ; mot de passe par défaut = le numéro lui-même.
- Compte à rebours automatique affiché pour tous : `J-4`, `J-3`, `J-2`, `J-1`, `Jour J`.
- Date limite, nom du tournoi et catégories/tarifs entièrement paramétrables depuis l’interface admin.
- Catégories prévues : 10 000 / 5 000 / 2 000 FCFA (modifiables).
- Enregistrement ou annulation d’un paiement en un clic.
- Ajout individuel et import en masse (`telephone;nom;categorie`).
- Consultation de la liste des payés par les membres.
- Export **PDF** des payés et des restants (+ export CSV).
- Changement de mot de passe pour chaque utilisateur.

## Stack

- Next.js App Router + TypeScript
- Supabase (base Postgres gratuite)
- jspdf / jspdf-autotable pour les PDF
- Sessions signées via cookie `httpOnly`

## Installation locale

1. Installe les dépendances :

   ```bash
   npm install
   ```

2. Crée un projet sur [supabase.com](https://supabase.com) (plan gratuit).
3. Dans **SQL Editor**, colle et exécute le contenu de [`supabase/schema.sql`](./supabase/schema.sql).
4. Récupère les identifiants du projet :
   - **URL** : bouton **Connect** du projet, ou **Project Settings → General**.
   - **Clé secrète** : **Project Settings → API Keys → Secret key** (elle commence par `sb_secret_...`).
     Si ta clé commence par `sb_publishable_...`, ce n’est pas la bonne : elle est publique et ne suffit pas ici.
5. Copie le fichier d’environnement :

   ```bash
   copy .env.example .env.local
   ```

6. Remplis `.env.local` :

   | Variable | Où la trouver |
   | --- | --- |
   | `SUPABASE_URL` | Bouton **Connect** ou Project Settings → General (sans `/rest/v1` à la fin) |
   | `SUPABASE_SECRET_KEY` | Project Settings → API Keys → **Secret key** (`sb_secret_...`) |
   | `SESSION_SECRET` | Une longue chaîne aléatoire de ton choix |
   | `ADMIN_PHONE` | Le numéro du compte administrateur |
   | `ADMIN_PASSWORD` | Son mot de passe initial |
   | `ADMIN_NAME` | Nom affiché de l’administrateur |

   ⚠️ **Ne mets jamais `SUPABASE_SECRET_KEY` dans une variable `NEXT_PUBLIC_*`.**
   L’ancienne clé `service_role` (`eyJ...`) reste acceptée via `SUPABASE_SERVICE_ROLE_KEY`, mais Supabase la déprécie.

7. Lance le serveur :

   ```bash
   npm run dev
   ```

8. Ouvre <http://localhost:3000> et connecte-toi avec `ADMIN_PHONE` / `ADMIN_PASSWORD`.

## Déploiement gratuit (Vercel)

1. Pousse le projet sur GitHub.
2. Importe-le sur [vercel.com](https://vercel.com).
3. Ajoute les mêmes variables d’environnement dans **Project Settings → Environment Variables**.
4. Déploie. Le build utilise `output: "standalone"`, compatible avec un hébergeur Node gratuit.

Le projet Supabase gratuit suffit largement pour ce usage. Garde la clé `sb_secret_...` secrète.

## Utilisation rapide

### Administrateur

- Onglet **Gestion des membres** : ajouter, modifier, supprimer, marquer un paiement.
- Onglet **Catégories & tarifs** : changer les montants (10 000 / 5 000 / 2 000…).
- Onglet **Paramètres** : date limite, nom du tournoi, visibilité de la liste des restants.
- Boutons en haut : **PDF payés**, **PDF restants**, **CSV**.

### Membre

- Se connecte avec son téléphone (mot de passe = téléphone tant qu’il ne l’a pas changé).
- Voit le compte à rebours et la liste des membres ayant payé.
- Peut changer son mot de passe dans **Mon compte**.

## Import en masse

Format accepté (séparateur `;`, `,` ou tabulation) :

```text
+2250700000001;Jean Koffi;Adulte
+2250500000002;Awa Diallo;Étudiant
+2250100000003;Mariam Traoré;Junior
```

Le mot de passe de chaque membre importé est initialisé à son numéro de téléphone.

## Scripts

```bash
npm run dev        # développement
npm run build      # build de production
npm start          # démarrage du build
npm run typecheck  # vérification TypeScript
```
