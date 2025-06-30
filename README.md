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
| `NEXTAUTH_SECRET`             | Clé secrète utilisée par NextAuth pour signer les sessions.                          |
| `NEXTAUTH_URL`                | URL publique de l'application (ex: `http://localhost:3000`).                            |
| `NEXT_PUBLIC_API_URL`         | URL de base de l'API métier à laquelle l'application se connecte.                      |
| `NEXT_PUBLIC_PROCEDURE_DS_ID` | Identifiant de la procédure Démarches Simplifiées pour générer les liens vers les dossiers. |

Exemple de fichier `.env` :

```env
NEXTAUTH_SECRET=<mysecretkey>
NEXTAUTH_URL=http://localhost:3000
NEXT_PUBLIC_API_URL=http://localhost:4000
NEXT_PUBLIC_PROCEDURE_DS_ID=12345
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

