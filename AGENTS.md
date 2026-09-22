# Consignes pour le front Partageons l’Eau

## Périmètre et repères

- Ce dépôt contient l’interface Next.js App Router / React, en JavaScript ESM.
- `src/app/` porte les pages, layouts et routes HTTP ; `src/components/` porte l’interface.
- `src/server/actions/` regroupe les Server Actions ; `src/server/api-wrapper.js` centralise les appels API authentifiés et leurs erreurs.
- `src/lib/` et `src/utils/` contiennent les fonctions réutilisables ; `src/contexts/` porte les contextes clients.
- `src/proxy.js`, `src/server/auth.js` et `src/lib/public-paths.js` participent à la protection des routes et sessions.
- `src/**/*.test.js` est exécuté par AVA ; `tests/browser/` par Playwright ; les stories sont proches des composants.
- L’API métier et l’orchestrateur sont des dépôts distincts : ne les modifier que si le périmètre demandé le nécessite.

## Commandes

Exécuter depuis la racine de ce dépôt, avec Node défini dans `.nvmrc` et npm défini par `packageManager` dans `package.json`.

```sh
nvm use
npm ci
npm run dev
```

- Configuration locale : suivre `README.md` et `.env.sample`, sans lire ni recopier des secrets pour une tâche qui n’en a pas besoin.
- `npm run lint` : ESLint, sans réécriture automatique.
- `npm test` : tous les tests AVA ; ciblage possible, par exemple `npm test -- src/lib/dashboard-api.test.js`.
- `npm run build` : build Next de production ; `npm start` : démarrage du build.
- `npm run storybook` : développement des stories ; `npm run build-storybook` : génération de `storybook-static/`.
- Utiliser le lockfile avec `npm ci`, sans `--force` ni `--legacy-peer-deps`. Réexaminer `allowScripts` lors des mises à jour.

Pour la suite navigateur complète, préparer les deux builds et les moteurs :

```sh
npm run build
npm run build-storybook
npx --no-install playwright install --with-deps chromium webkit
npm run test:browser
```

- Playwright démarre un front standalone et une API synthétique via `.github/scripts/`, sans base métier réelle.
- Les tests de stories nécessitent `storybook-static/` ; les tests du front nécessitent `.next/standalone/server.js` à jour.
- Pour cibler : `npm run test:browser -- tests/browser/dashboard-zone-selection.spec.js --project=chromium`.
- La configuration couvre Chromium, WebKit et mobile ; vérifier `playwright.config.mjs` lors de l’ajout d’un fichier de tests.
- Les rapports et captures sont dans `.artifacts/`. Ne pas lancer simultanément plusieurs suites qui utilisent les mêmes serveurs de test.

## Code, interface et accessibilité

- Suivre `eslint.config.js` : indentation de deux espaces, quotes simples, pas de points-virgules ; conserver les imports ESM et les alias `@/` existants.
- Réutiliser les composants DSFR, les composants partagés et les couleurs métier existantes ; libellés destinés aux usagers en français.
- Intégrer une fonctionnalité à son point d’entrée naturel ; ne pas multiplier les onglets ou variantes d’un même parcours.
- Pour un composant partagé, rechercher ses consommateurs et conserver le comportement existant par défaut ; rendre les nouvelles interactions optionnelles si nécessaire.
- Préserver les labels accessibles, la navigation clavier, Échap, la restitution du focus, les états désactivés et l’affichage mobile.
- Sur les filtres à validation explicite, les cases et actions groupées modifient un brouillon ; appliquer une fois, annuler sans requête, éviter un rechargement pour une sélection identique.
- Pendant un chargement ou après une erreur, ne pas présenter l’ancien résultat comme s’il correspondait au nouveau filtre.
- Garder distincts une vraie valeur zéro, une absence de données et une erreur ; ne pas inventer de chiffres ou de dates de déploiement.
- Les cartes et visualisations lourdes utilisent le chargement différé existant. MapLibre requiert WebGL 2 ; conserver `prepare-maplibre` et ses ressources locales.

## Serveur, contrats et données

- Garder les appels authentifiés dans la couche serveur existante ; ne pas importer de module serveur ou de dépendance Node dans un composant client.
- `API_URL` sert aux appels serveur, avec repli existant sur `NEXT_PUBLIC_API_URL`. Aucune clé secrète ne doit devenir une variable `NEXT_PUBLIC_*`.
- Préserver les méthodes d’authentification annoncées par `/auth/config`, les cookies de session et l’expiration du jeton API.
- Les contrôles visuels ne remplacent pas les autorisations de l’API. Tester les rôles et capacités concernés, notamment pour les exports et les données de compteurs.
- Toute modification des chemins publics doit rester cohérente entre proxy et garde client ; `/stats` public n’autorise pas automatiquement des sous-routes.
- Consommer les contrats métier de l’API ; les connecteurs, secrets fournisseurs, synchronisations et calculs métier ne doivent pas être réimplémentés dans le navigateur.
- Lorsqu’un contrat API change, coordonner producteur, Server Actions, consommateurs et fixtures ; préserver la compatibilité nécessaire aux déploiements séparés.
- Pour la carte, respecter `docs/point-map-search-contract.md` : les champs absents faute de droits ne signifient pas une absence métier.
- Les exports métier passent par `src/server/actions/exports.js`. Les classeurs tabulaires locaux utilisent `src/lib/tabular-spreadsheet.js`.
- Garder `xlsx-populate` côté Node dans `src/server/declaration-template.js`, sans réintroduire son ancien bundle navigateur.
- Distinguer les dates métier sans heure des instants exacts des compteurs. Préserver les secondes, le fuseau d’affichage prévu et les fins de périodes exclusives.
- Réutiliser `src/lib/meter-period.js` pour les périodes METER ; ne pas interpréter les anciennes dates seules comme des instants de télérelève.

## Vérification et livraison

- Commencer par `git status` et préserver les modifications existantes ; limiter le diff au besoin demandé.
- Adapter la validation au diff : documentation seule = relecture, chemins/commandes vérifiés et `git diff --check`, sans rebuild local systématique.
- Pour du code, exécuter lint et tests pertinents ; ajouter le build si les imports, routes ou bundles changent, et les scénarios navigateur pour une interaction ou un rendu.
- Pour une dépendance, vérifier installation verrouillée, audits, tests et builds concernés ; ne pas contourner les barrières de sécurité.
- Les tests navigateur doivent utiliser des fixtures synthétiques ; figer le temps lorsqu’une assertion dépend d’une date, plutôt que d’un jour réel d’exécution.
- Signaler précisément les contrôles effectués, ceux non exécutés et leurs limites ; ne pas déclarer un déploiement réussi sur la seule base d’un push.
- Commit, push et déploiement uniquement dans le périmètre demandé. Un push sur `testing`, `demo` ou `prod` déclenche le workflow de déploiement correspondant.
- Passer par les workflows existants, qui imposent qualité et vérification de l’image ; ne pas lancer de déploiement direct ni promouvoir vers un autre environnement sans demande.
- Ne jamais publier de secrets, données personnelles, exports réels ou détails d’accès privés dans ce dépôt.
