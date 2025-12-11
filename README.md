# Prélèvements d'eau – Front

Cette application est le front-end du projet de gestion des prélèvements d'eau. Elle est basée sur [Next.js](https://nextjs.org/) et utilise le Design System de l'État via `@codegouvfr/react-dsfr`.

## Prérequis

- **Node.js** ≥ 22.11 et < 23
- **Yarn** 4 (la version 4.6.0 est recommandée)

## Installation

1. Clonez ce dépôt.
2. Installez les dépendances :
   ```bash
   yarn install
   ```
3. Créez un fichier `.env` à la racine en vous basant sur `.env.sample` puis renseignez les variables ci-dessous.

## Variables d'environnement

| Nom                           | Description                                                                             |
| ----------------------------- | --------------------------------------------------------------------------------------- |
| `NEXT_PUBLIC_API_URL`         | URL de base de l'API métier à laquelle l'application se connecte.                      |
| `NEXT_PUBLIC_FRONTEND_URL`    | URL de base du frontend. Optionnel en production. |
| `NEXT_PUBLIC_PROCEDURE_DS_ID` | Identifiant de la procédure Démarche Numérique pour générer les liens vers les dossiers. |
| `NEXT_PUBLIC_STORAGE_URL`     | URL de base du stockage des documents.                                                 |
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
NEXTAUTH_URL=http://localhost:3000/auth/nextauth
NEXTAUTH_SECRET=votre_secret_genere_avec_openssl
```

## Scripts disponibles

- `yarn dev` : met à jour les icônes DSFR puis lance le serveur de développement.
- `yarn build` : génère la version de production.
- `yarn start` : démarre l'application Next.js construite via `yarn build`.
- `yarn update-icons` : force la mise à jour des icônes DSFR.
- `yarn lint` : vérifie la qualité du code avec XO.

## Démarrer en développement

```bash
yarn dev
```

L'application sera alors disponible sur [http://localhost:3000](http://localhost:3000).

Pour générer un build de production :

```bash
yarn build
yarn start
```

