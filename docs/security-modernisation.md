# Maintenance sécurité et CI

## Installer et vérifier

La version de Node est dans `.nvmrc`, celle de npm dans `packageManager`.
Les fichiers internes de npm ne sont jamais modifiés. La version officielle 11.19.1
intègre les correctifs nécessaires ([notes officielles](https://github.com/npm/cli/releases/tag/v11.19.1)).

```sh
nvm use
npm install --global "$(node -p 'require("./package.json").packageManager')" --ignore-scripts --no-audit --no-fund
npm ci
npm audit --include=dev --audit-level=low
npm audit --omit=dev --audit-level=low
bash .github/scripts/check-workflows.sh
```

Utiliser `npm ci`, sans `--force` ni `--legacy-peer-deps`. Les scripts des dépendances
sont autorisés explicitement dans `allowScripts` ; réexaminer ces autorisations à chaque
mise à jour. ShellCheck doit être installé pour valider les workflows.

## Pipelines et déploiement

- Les PR vers testing/demo/prod et les déploiements appellent `quality.yml`.
  Audit, lint et tests ne sont pas recopiés dans les étapes de déploiement.
- Les commandes natives npm et Trivy bloquent sur toute vulnérabilité signalée,
  même sans correctif. Trivy bloque également un OS en fin de support.
  Les erreurs des outils échouent aussi ; aucune liste d'exclusion.
- L'image est scannée par digest avant migration/déploiement. Le digest testé
  est celui déployé, l'alias d'environnement est publié après vérification.
- Les contrôles de cible et de conservation des réglages restent obligatoires :
  pas de remplacement des variables ou secrets par une liste partielle.
- Les audits sont conservés dans les artefacts CI, hors Git.
  Les tests utilisent uniquement des données synthétiques et services jetables.

## Avant la première promotion

- [ ] Corriger les alertes bloquantes et valider les trois projets sur les commits exacts.
- [ ] Préparer sauvegardes et bascule coordonnée API/worker/orchestrateur :
  voir `prelevements-deau-api/docs/bullmq-6-migration.md`. Ne pas purger Redis.
- [ ] Recetter testing : connexion, rôles, déclarations/campagnes, compteurs,
  cartes, fichiers Excel/S3, mails et reprise des tâches.
- [ ] Promouvoir demo puis prod uniquement après décision explicite.

Les contrôles locaux ne valent ni exécution des pipelines GitHub ni recette des
services externes réels. Les branches main, demo et prod ne sont pas modifiées par ce travail.

## Contrôles front

```sh
node --test .github/scripts/deployment-policy.test.mjs
npm run lint
npm test
npm run build
npm run build-storybook
npx --no-install playwright install --with-deps chromium webkit
npm run test:browser
```

Le navigateur utilise une API fictive et un front isolé, jamais les fichiers
d'environnement ni les données réelles. Rapports dans `.artifacts/`.

## Choix de compatibilité

- ESLint 10, maintenu, remplace XO. Les plugins React DOM/JSX maintenus utilisent
  leurs recommandations, complétées par les contrôles de clés, mutation d'état,
  propriétés DOM et les règles officielles des hooks. Pas de forçage des dépendances
  pairs ni de longue liste d'exceptions. Huit tests vérifient ces garde-fous.
  Le vieux plugin React 7 n'est pas compatible avec ESLint 10 ; ESLint 9 est en fin
  de support. La combinaison retenue ne détecte plus les propriétés JSX dupliquées :
  c'est une limite du nouveau plugin, signalée plutôt que corrigée par une règle maison.
- Next 16 utilise Webpack et `proxy.js`. NextAuth reste en version 4 stable.
- Les graphiques utilisent les API publiques MUI X 9. Tailwind 4 conserve les
  couleurs et dimensions du thème existant.
- MapLibre 6 exige WebGL 2. `prepare-maplibre` copie son worker ESM et son
  module partagé depuis le paquet installé vers un chemin local versionné,
  avant dev/build/Storybook. Pas de CDN ni de réécriture du paquet.
  C'est la [méthode documentée pour Next.js](https://maplibre.org/maplibre-gl-js/docs/#esm),
  y compris son mode Webpack, qui n'émet pas le module partagé à côté du worker.
  Le repli sans WebGL laisse les autres fonctions de la page disponibles.
- Les exports tabulaires restent dans le navigateur avec `write-excel-file`
  et son API publique. Les valeurs, titres gras et largeurs sont préservés.
  Aucun convertisseur HTTP, quota de lignes ou verrou global ajouté.
  Une chaîne commençant par `=` reste du texte.
- **Seul le modèle Excel enrichi reste côté serveur**, avec `xlsx-populate`
  via son entrée Node : il conserve les listes déroulantes et la mise en forme
  du modèle. Son bundle navigateur précompilé embarque des dépendances vulnérables.
  L'API authentifiée conserve le contrôle des points et des droits, sans cache.
- SheetJS est installé depuis son archive officielle 0.20.3, pas l'ancienne
  distribution npm. `allow-remote=root` limite les archives distantes
  aux dépendances déclarées directement.
- L'override `uuid@11.1.1`, déjà présent sur testing, est maintenant limité
  à NextAuth. Le réexaminer lors de la mise à jour de NextAuth ; il ne doit pas
  contraindre les futurs consommateurs de uuid.

Les cibles de déploiement sont déclarées une seule fois dans
`.github/scripts/deploy-container.mjs`, utilisées par la validation CI et
le déploiement. Les tests simulent Scaleway : ils n'effectuent aucun déploiement.
