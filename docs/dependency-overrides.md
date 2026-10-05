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
