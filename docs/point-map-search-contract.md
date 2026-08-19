# Contrat de recherche de la carte des points

La page `/points-prelevement` filtre et classe localement les résumés renvoyés par
`GET /api/points-prelevement/map`. Les champs historiques restent inchangés. Le
résumé doit également exposer les champs plats suivants, sans relation `User` ou
`Declarant` complète :

```js
{
  searchAliases: string[],
  searchIdentifiers: string[],
  communeName: string | null,
  managementZones: Array<{id: string, name: string, code: string | null}>,
  exploitationStatuses: Array<
    'EN_ACTIVITE' | 'TERMINEE' | 'ABANDONNEE' | 'NON_RENSEIGNE'
  >,
  preleveurLabels: string[],
  preleveurSirets: string[],
  preleveurTypes: Array<'ICPE' | 'IRRIGANT' | 'GESTIONNAIRE_AEP' | 'AUTRE'>,
  collecteurStatus: 'WITH_COLLECTEUR' | 'WITHOUT_COLLECTEUR',
  connectorStatus: 'WITH_CONNECTOR' | 'WITHOUT_CONNECTOR',
  searchAccess: {
    exploitations: boolean,
    declarants: boolean
  }
}
```

Règles du contrat :

- `managementZones` contient uniquement les zones métier de type `MANAGEMENT`
  visibles par l’utilisateur.
- Les tableaux sont dédupliqués et calculés uniquement depuis les exploitations
  accessibles à l’utilisateur courant.
- `exploitationStatuses: []` signifie « sans exploitation accessible » seulement
  lorsque `searchAccess.exploitations` vaut `true`.
- Les statuts collecteur/connecteur portent sur l’ensemble des exploitations
  accessibles du point : `WITH_*` dès qu’au moins une relation correspond.
- Les champs préleveur sont vides et ne sont ni recherchés ni transformés en
  facette lorsque `searchAccess.declarants` vaut `false`.
- Les agrégats exploitation sont vides et ne deviennent jamais artificiellement
  « sans exploitation », « sans collecteur » ou « sans connecteur » lorsque
  `searchAccess.exploitations` vaut `false`.
- L’API ne renvoie dans ces champs ni email, ni objet utilisateur, ni zone hors
  périmètre. Les identifiants déjà présents (`id`, `codeBSS`) et les `usages`
  historiques complètent ce document de recherche.

Le front accepte l’absence temporaire de ces champs pendant un déploiement
progressif : la recherche historique continue de fonctionner et les facettes
protégées sont simplement omises.
