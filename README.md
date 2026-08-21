# Prélèvements d'eau – Front

Cette application est le front-end du projet de gestion des prélèvements d'eau. Elle est basée sur [Next.js](https://nextjs.org/) et utilise le Design System de l'État via `@codegouvfr/react-dsfr`.

## Prérequis

- **Node.js** 24.x
- **npm**

## Installation

1. Clonez ce dépôt.
2. Installez les dépendances :
   ```bash
   npm install
   ```
3. Créez un fichier `.env` à la racine en vous basant sur `.env.sample` puis renseignez les variables ci-dessous.

## Variables d'environnement

| Nom                           | Description                                                                             |
| ----------------------------- | --------------------------------------------------------------------------------------- |
| `API_URL`                     | URL interne de l'API utilisée par le serveur Next.js. Retombe sur `NEXT_PUBLIC_API_URL`. |
| `API_PERF_LOG`                | Mettre `1` pour journaliser tous les appels serveur vers l'API. Par défaut, seuls les appels lents le sont. |
| `API_SLOW_REQUEST_MS`         | Seuil en millisecondes des appels API considérés comme lents (défaut : `1000`). |
| `NEXT_PUBLIC_API_URL`         | URL de base de l'API métier à laquelle l'application se connecte.                      |
| `NEXT_PUBLIC_FRONTEND_URL`    | URL de base du frontend. Optionnel en production. |
| `NEXT_PUBLIC_PROCEDURE_DS_ID` | Identifiant de la procédure Démarche Numérique pour générer les liens vers les dossiers. |
| `NEXT_PUBLIC_STORAGE_URL`     | URL de base du stockage des documents.                                                 |
| `NEXT_PUBLIC_DEPLOY_ENV`      | Environnement d'affichage (`testing` et `demo` affichent un bandeau, `prod` n'en affiche pas). Optionnel en dev local. |
| `NEXT_PUBLIC_MATOMO_URL`      | URL de base Matomo. Active aussi la collecte anonymisée des Web Vitals si le site ID est défini. |
| `NEXT_PUBLIC_MATOMO_SITE_ID`  | Identifiant du site Matomo. |
| `NEXT_PUBLIC_MATOMO_DISABLED` | Mettre `true` pour désactiver explicitement Matomo, même lorsque son URL et son site sont configurés. |
| `NEXT_PUBLIC_BUILD_SHA`       | Révision déployée associée aux mesures Web Vitals ; injectée automatiquement par la CI. |
| `NEXT_PUBLIC_CRISP_DISABLED`  | Mettre `true` pour désactiver le widget Crisp, par exemple en local. Par défaut, Crisp est actif. |
| `NEXTAUTH_URL`                | URL de l'application NextAuth avec basePath (ex: `http://localhost:3000/auth/nextauth` en dev). |
| `NEXTAUTH_SECRET`             | Clé secrète pour signer les JWT de session. Générez-la avec `openssl rand -base64 32`. |

> **Note** : Cette application utilise NextAuth.js pour l'authentification par lien magique (magic link). 
> - **Sessions persistantes** : Les utilisateurs restent connectés pendant **30 jours** via des cookies HTTP-only sécurisés
> - L'API backend envoie le lien par email, NextAuth gère la session côté front
> 
> **Mode développement** : Pour travailler avec un backend de production tout en exécutant le frontend localement, configurez :
> - `NEXT_PUBLIC_FRONTEND_URL=http://localhost:3000` (pour les magic links)
> - `NEXTAUTH_URL=http://localhost:3000/auth/nextauth` (pour NextAuth avec basePath personnalisé)
> - `NEXT_PUBLIC_API_URL` pointant vers l'API de production

Exemple de fichier `.env` :

```env
NEXT_PUBLIC_API_URL=http://localhost:4000
NEXT_PUBLIC_FRONTEND_URL=http://localhost:3000
NEXT_PUBLIC_PROCEDURE_DS_ID=12345
NEXT_PUBLIC_STORAGE_URL=http://localhost:5000
NEXT_PUBLIC_DEPLOY_ENV=dev
NEXT_PUBLIC_CRISP_DISABLED=true
NEXTAUTH_URL=http://localhost:3000/auth/nextauth
NEXTAUTH_SECRET=votre_secret_genere_avec_openssl
```

## Scripts disponibles

- `npm run dev` : met à jour les icônes DSFR puis lance le serveur de développement.
- `npm run build` : génère la version de production.
- `npm start` : démarre l'application Next.js construite via `npm run build`.
- `npm run update-icons` : force la mise à jour des icônes DSFR.
- `npm run lint` : vérifie la qualité du code avec XO.

## Démarrer en développement

```bash
npm run dev
```

L'application sera alors disponible sur [http://localhost:3000](http://localhost:3000).

Pour générer un build de production :

```bash
npm run build
npm start
```
