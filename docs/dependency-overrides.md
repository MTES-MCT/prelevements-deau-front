# Exceptions de sécurité des dépendances

## Exception temporaire pour les outils de développement (5 octobre 2026)

L’extension de cette exception au front a été autorisée le 5 octobre 2026.
Le contrôle et sa politique sont repris sans modification du commit API `d33b659`.

La politique concerne uniquement [GHSA-vfj7-8cjw-p6xm](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm)
pour `braces@3.0.3` dans les dépendances de développement. Aucune version corrigée
n’est publiée au moment de la préparation, le 4 octobre 2026. Dans le front, cette dépendance est
utilisée par AVA et le plugin ESLint Next, via `globby`, `fast-glob` et `micromatch`.

L’exception expire le **11 octobre 2026 à 00 h, heure de Paris**
(`2026-10-10T22:00:00Z`). Elle ne corrige pas le paquet. Le contrôle
`node scripts/security/audit-dependencies.js` conserve le rapport npm brut et
signale explicitement les alertes couvertes. Il vérifie les chemins du lockfile et
les causes transitives : une autre alerte, un chemin de production, une erreur
d’audit ou l’expiration restent bloquants. Les tests de la politique protègent ces
limites, y compris une expiration pendant l’audit.

L’audit de production, les contrôles de l’image, les tests et les builds restent
inchangés et bloquants. Dès qu’une version officielle corrigée est disponible,
mettre à jour le lockfile, retirer l’exception, puis rejouer les audits et les tests.

## Suppression de sprintf-js dans les outils de test (6 octobre 2026)

L’override `supertap → js-yaml → argparse@2.0.1` retire `sprintf-js`, affecté par
[GHSA-hp3w-g68c-fv3c](https://github.com/advisories/GHSA-hp3w-g68c-fv3c), dont aucune
version publiée n’est corrigée à cette date. AVA, supertap et js-yaml conservent
leurs versions : supertap utilise `yaml.safeDump`, supprimé dans js-yaml 4.

La suite AVA, la sortie TAP avec succès et diagnostics d’échec, ainsi que les
conversions YAML/JSON ont été vérifiées. Limite connue : le binaire tiers
`js-yaml --version` affiche une valeur vide avec argparse 2 ; ce binaire n’est
pas utilisé par le projet. Le chemin TAP d’AVA ne charge pas argparse.

Retirer cet override lorsque supertap adoptera une chaîne corrigée compatible,
puis rejouer ces vérifications et les audits. L’exception braces et son échéance
restent inchangées.
