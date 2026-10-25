# Prélèvements d'eau – Front

Cette application est le front-end du projet de gestion des prélèvements d'eau. Elle est basée sur [Next.js](https://nextjs.org/) et utilise le Design System de l'État via `@codegouvfr/react-dsfr`.

## Prérequis

- **Node.js** : version définie dans [`.nvmrc`](.nvmrc).
- **npm** : version définie par `packageManager` dans [`package.json`](package.json).

## Installation

1. Clonez ce dépôt.
2. Installez les dépendances :

   ```bash
   nvm use
   npm ci
   ```

3. Créez un fichier `.env` à la racine en vous basant sur `.env.sample` puis renseignez les variables ci-dessous.

Utilisez la version npm attendue, sans `--force` ni `--legacy-peer-deps`.
Les scripts d'installation autorisés sont déclarés dans `allowScripts` et doivent
être réexaminés lors des mises à jour.

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
| `MATOMO_URL`                  | URL de base Matomo, lue à l’exécution depuis Scaleway. Active aussi la collecte anonymisée des Web Vitals si le site ID est défini. |
| `MATOMO_SITE_ID`              | Identifiant du site Matomo, lu à l’exécution depuis Scaleway. |
| `MATOMO_DISABLED`             | Mettre `true` pour désactiver explicitement Matomo, même lorsque son URL et son site sont configurés. |
| `NEXT_PUBLIC_BUILD_SHA`       | Révision déployée associée aux mesures Web Vitals ; injectée automatiquement par la CI. |
| `NEXT_PUBLIC_CRISP_DISABLED`  | Mettre `true` pour désactiver le widget Crisp, par exemple en local. Par défaut, Crisp est actif. |
| `NEXTAUTH_URL`                | URL de l'application NextAuth avec basePath (ex: `http://localhost:3000/auth/nextauth` en dev). |
| `NEXTAUTH_SECRET`             | Clé secrète pour signer les JWT de session. Générez-la avec `openssl rand -base64 32`. |

Les anciennes variables `NEXT_PUBLIC_MATOMO_URL`, `NEXT_PUBLIC_MATOMO_SITE_ID`
et `NEXT_PUBLIC_MATOMO_DISABLED` restent temporairement prises en charge en
repli. Les variables serveur `MATOMO_*`, configurées dans Scaleway, sont
prioritaires et sont lues au démarrage et à chaque rendu serveur ; elles ne
sont pas injectées par la CI ni figées dans l’image lors du build.

> **Note** : Cette application utilise NextAuth.js pour établir la session côté front.
> - L’API expose les méthodes actives et leur ordre via `GET /auth/config` ; le front ne propose que ces méthodes.
> - Les méthodes actuellement prises en charge sont le lien de connexion par email (`magic_link`) et le mot de passe (`password`).
> - Les cookies NextAuth sont HTTP-only et la session respecte l’échéance du token renvoyée par l’API.
> - La configuration des méthodes et les secrets de mot de passe restent exclusivement côté API.
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
- `npm run lint` : vérifie la qualité du code avec ESLint.

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

## Recette locale de La Réunion

Les configurations privées sont générées par `scripts/reunion/prepare-local.js`
dans le dépôt API. Après préparation de l'API locale sur le port 5500 et de son
compte de service, lancer le front depuis ce dépôt :

```sh
reunion_runtime="$HOME/.local/share/preservonsleau/imports/reunion-local-20261025/runtime"
npm run prepare-maplibre
npx --no-install react-dsfr update-icons
node --env-file="$reunion_runtime/front-local.env" node_modules/next/dist/bin/next \
  dev --webpack --hostname 127.0.0.1 --port 3300
```

La recette utilise `http://127.0.0.1:3300` et NextAuth sous `/auth/nextauth`.
Les liens de connexion arrivent dans Mailpit sur `http://127.0.0.1:8026` ;
Crisp, Matomo et Sentry sont désactivés par cette configuration.
Les deux formats Réunion passent par le dépôt de déclaration existant. Leur
ouverture aux 244 préleveurs se fait côté API via `enable-local-formats.js`,
indépendamment du statut des dossiers historiques. Les valeurs natives sont
consultables par pages, avec leurs heures et périodes d'origine. Aucun nouveau
parcours d'instruction n'est ajouté. Le déploiement et le décommissionnement
restent à valider séparément de cette recette locale.


## Vérifications et maintenance

```bash
npm audit --include=dev --audit-level=low
npm audit --omit=dev --audit-level=low
npm run lint
npm test
npm run build
npm run build-storybook
npx --no-install playwright install --with-deps chromium webkit
npm run test:browser
```

Les tests navigateur utilisent une API fictive et un front isolé, jamais les
variables d'environnement ni les données réelles. Les rapports sont dans
`.artifacts/`. La validation CI et le déploiement sont décrits dans le
[guide commun des pipelines](https://github.com/MTES-MCT/prelevements-deau-api/blob/testing/docs/pipelines.md).

Pour chaque déploiement, la qualité et la préparation de l'image s'exécutent en
parallèle. La livraison attend leur réussite et utilise le digest exact de
l'image contrôlée ; l'alias d'environnement n'est publié qu'après les sondes de
santé. Le build Next synthétique et Storybook sont partagés par quatre lots
Playwright (Chromium, WebKit et mobile, deux workers par lot), puis le test du
classeur de 500 000 cellules s'exécute séparément. Le rapport final vérifie que
chaque test de l'inventaire est présent exactement une fois avant de fusionner
les rapports et traces. Les exclusions et échecs attendus déclarés par les
tests gardent leur sémantique Playwright.

Les artefacts sont liés au commit, au run et à sa tentative : en cas d'échec,
utiliser **Re-run all jobs**, et non **Re-run failed jobs**, pour reconstruire
un ensemble cohérent. Le cache Next concerne seulement la compilation des
fixtures ; les réponses HTTP mises en cache sont effacées et aucun build
synthétique n'est utilisé pour l'image déployée. Le cache BuildKit de cette
image est séparé par environnement.

Points à préserver lors des mises à jour :

- MapLibre nécessite WebGL 2. `prepare-maplibre`, exécuté avant dev, build et
  Storybook, copie le worker ESM et son module partagé depuis le paquet installé,
  sans réécrire ses fichiers ni utiliser de CDN.
- Les exports tabulaires utilisent `write-excel-file` dans le navigateur.
  Seul le modèle Excel enrichi utilise l'entrée Node de `xlsx-populate` côté
  serveur, pour préserver les listes déroulantes sans importer son ancien bundle
  navigateur. SheetJS provient de l'archive officielle déclarée dans `package.json`.
- L'override `uuid` est limité à NextAuth ; le réexaminer lors de sa mise à jour.
- Les règles ESLint actuelles ne détectent pas les propriétés JSX dupliquées.

Le [contrat de recherche de la carte](docs/point-map-search-contract.md) précise
les champs exposés et leur filtrage selon les droits.
