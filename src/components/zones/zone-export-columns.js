import {
  getDeclarantRoleLabel,
  getDeclarantTitleFromDeclarant
} from '@/lib/declarants.js'
import {formatUsages, getUsageLabel} from '@/lib/water-uses.js'

const ZONE_TYPE_LABELS = {
  REGION: 'Région',
  DEPARTEMENT: 'Département',
  SAGE: 'SAGE'
}

const EXPLOITATION_STATUS_LABELS = {
  EN_ACTIVITE: 'En activité',
  TERMINEE: 'Terminée',
  ABANDONNEE: 'Abandonnée',
  NON_RENSEIGNE: 'Non renseigné'
}

function asArray(value) {
  return Array.isArray(value) ? value : []
}

function formatBoolean(value) {
  if (value === undefined || value === null) {
    return ''
  }

  return value ? 'Oui' : 'Non'
}

function formatDate(value) {
  if (!value) {
    return ''
  }

  return new Intl.DateTimeFormat('fr-FR').format(new Date(value))
}

function formatList(values, mapper = value => value) {
  return asArray(values)
    .map(value => mapper(value))
    .filter(Boolean)
    .join(', ')
}

function formatCoordinates(coordinates) {
  const pointCoordinates = coordinates?.coordinates || coordinates

  if (!Array.isArray(pointCoordinates) || pointCoordinates.length < 2) {
    return ''
  }

  return `${pointCoordinates[1]}, ${pointCoordinates[0]}`
}

function getDeclarantId(declarant) {
  return declarant?.id || declarant?.userId || declarant?.user?.id || declarant?.declarant?.userId || ''
}

function getDeclarantRole(declarant) {
  return declarant?.declarantRole || declarant?.declarant?.declarantRole || ''
}

function getDeclarantTypeLabel(declarant) {
  return declarant?.declarantType === 'LEGAL_PERSON' || declarant?.declarant?.declarantType === 'LEGAL_PERSON'
    ? 'Personne morale'
    : 'Personne physique'
}

function getEmailAliases(entity) {
  return [
    ...asArray(entity?.emailAliases),
    ...asArray(entity?.user?.emailAliases),
    ...asArray(entity?.declarant?.user?.emailAliases)
  ]
}

function formatEmailAliases(entity) {
  return formatList(getEmailAliases(entity), alias => alias.email || alias)
}

function formatAddress(entity) {
  const cityLine = [
    entity?.postalCode,
    entity?.city
  ].filter(Boolean).join(' ')

  return [
    entity?.addressLine1,
    entity?.addressLine2,
    entity?.poBox,
    cityLine
  ].filter(Boolean).join(', ')
}

function formatPoint(point) {
  return [
    point?.name,
    point?.communeName,
    point?.codeBSS ? `BSS ${point.codeBSS}` : null,
    point?.codeBNPE ? `BNPE ${point.codeBNPE}` : null
  ].filter(Boolean).join(' — ')
}

function getPointDeclarants(point) {
  return point?.preleveurs || point?.declarants || []
}

function getCollecteurs(exploitation) {
  return asArray(exploitation?.collecteurs)
    .map(link => link.collecteur)
    .filter(Boolean)
}

function getDeclarantCollecteurLabels(declarant) {
  const labelsByKey = new Map()

  for (const point of asArray(declarant?.points)) {
    for (const collecteur of asArray(point?.collecteurs)) {
      const label = collecteur?.label
        || (collecteur?.collecteur ? getDeclarantTitleFromDeclarant(collecteur.collecteur) : null)
        || collecteur?.email

      if (!label) {
        continue
      }

      labelsByKey.set(collecteur.collecteurUserId || label, label)
    }
  }

  return [...labelsByKey.values()]
}

function formatAccessPeriod(row) {
  if (!row?.startDate && !row?.endDate) {
    return ''
  }

  if (row.startDate && row.endDate) {
    return `Du ${formatDate(row.startDate)} au ${formatDate(row.endDate)}`
  }

  if (row.startDate) {
    return `Depuis le ${formatDate(row.startDate)}`
  }

  return `Jusqu’au ${formatDate(row.endDate)}`
}

export const ZONES_EXPORT_COLUMNS = [
  {label: 'ID zone', value: zone => zone.id},
  {label: 'Nom', value: zone => zone.name},
  {label: 'Type', value: zone => ZONE_TYPE_LABELS[zone.type] || zone.type},
  {label: 'Code', value: zone => zone.code},
  {label: 'Nombre de droits attribués', value: zone => zone.permissions?.length || 0},
  {label: 'Droits attribués', value: zone => (zone.permissions || []).join(', ')},
  {label: 'Points', value: zone => zone.pointsCount},
  {label: 'Déclarants', value: zone => zone.declarantsCount},
  {label: 'Exploitations', value: zone => zone.exploitationsCount},
  {label: 'Agents', value: zone => zone.instructorsCount}
]

export function getZoneDeclarantExportColumns({collecteursOnly = false} = {}) {
  const columns = [
    {label: 'ID déclarant', value: declarant => getDeclarantId(declarant)},
    {label: 'Rôle', value: declarant => getDeclarantRoleLabel(getDeclarantRole(declarant))},
    {label: 'Type', value: declarant => getDeclarantTypeLabel(declarant)},
    {label: collecteursOnly ? 'Collecteur' : 'Déclarant', value: declarant => getDeclarantTitleFromDeclarant(declarant)},
    {label: 'Raison sociale', value: declarant => declarant.socialReason || declarant.declarant?.socialReason},
    {label: 'SIRET', value: declarant => declarant.siret},
    {label: 'Prénom', value: declarant => declarant.firstName || declarant.user?.firstName},
    {label: 'Nom', value: declarant => declarant.lastName || declarant.user?.lastName},
    {label: 'Email principal', value: declarant => declarant.email || declarant.user?.email},
    {label: 'Alias e-mail', value: declarant => formatEmailAliases(declarant)},
    {label: 'Téléphone', value: declarant => declarant.phoneNumber},
    {label: 'Adresse', value: declarant => formatAddress(declarant)},
    {label: 'Commune', value: declarant => declarant.city},
    {label: 'Code postal', value: declarant => declarant.postalCode},
    {label: 'Exploitations / rattachements', value: declarant => declarant.exploitationsCount || declarant.pointPrelevements?.length || declarant.collecteurExploitations?.length || ''},
    {label: 'Préleveurs accessibles', value: declarant => formatList(declarant.preleveurs, getDeclarantTitleFromDeclarant)}
  ]

  if (!collecteursOnly) {
    columns.splice(4, 0, {
      label: 'Collecteur',
      value: declarant => formatList(getDeclarantCollecteurLabels(declarant))
    })
  }

  return columns
}

export const ZONE_POINTS_EXPORT_COLUMNS = [
  {label: 'ID point', value: point => point.id},
  {label: 'Nom', value: point => point.name},
  {label: 'Commune', value: point => point.communeName},
  {label: 'Code commune', value: point => point.communeCode},
  {label: 'Type de milieu', value: point => point.waterBodyType},
  {label: 'Code BSS', value: point => point.codeBSS},
  {label: 'Code BNPE', value: point => point.codeBNPE},
  {label: 'Code AIOT', value: point => point.codeAIOT},
  {label: 'Code PTP', value: point => point.codePTP},
  {label: 'Coordonnées', value: point => formatCoordinates(point.coordinates)},
  {label: 'Déclarants', value: point => formatList(getPointDeclarants(point), getDeclarantTitleFromDeclarant)},
  {label: 'Nombre de déclarants', value: point => getPointDeclarants(point).length},
  {label: 'Usages', value: point => formatUsages(point.usages)},
  {label: 'Modifiable', value: point => formatBoolean(point.right?.canEdit)}
]

export const ZONE_EXPLOITATIONS_EXPORT_COLUMNS = [
  {label: 'ID exploitation', value: exploitation => exploitation.id},
  {label: 'Statut', value: exploitation => EXPLOITATION_STATUS_LABELS[exploitation.status] || exploitation.status},
  {label: 'Période', value: exploitation => formatAccessPeriod(exploitation)},
  {label: 'Date début', value: exploitation => formatDate(exploitation.startDate)},
  {label: 'Date fin', value: exploitation => formatDate(exploitation.endDate)},
  {label: 'Point', value: exploitation => formatPoint(exploitation.pointPrelevement)},
  {label: 'ID point', value: exploitation => exploitation.pointPrelevement?.id || exploitation.pointPrelevementId},
  {label: 'Commune du point', value: exploitation => exploitation.pointPrelevement?.communeName},
  {label: 'Préleveur', value: exploitation => getDeclarantTitleFromDeclarant(exploitation.declarant)},
  {label: 'Email préleveur', value: exploitation => exploitation.declarant?.email || exploitation.declarant?.user?.email},
  {label: 'Alias e-mail préleveur', value: exploitation => formatEmailAliases(exploitation.declarant)},
  {label: 'Collecteurs', value: exploitation => formatList(getCollecteurs(exploitation), getDeclarantTitleFromDeclarant)},
  {label: 'Emails collecteurs', value: exploitation => formatList(getCollecteurs(exploitation), collecteur => collecteur.email || collecteur.user?.email)},
  {label: 'Alias e-mail collecteurs', value: exploitation => formatList(getCollecteurs(exploitation), formatEmailAliases)},
  {label: 'Usage', value: exploitation => getUsageLabel(exploitation.usage)},
  {label: 'Dernière déclaration', value: exploitation => formatDate(exploitation.lastDeclarationAt)},
  {label: 'Connecteurs', value: exploitation => exploitation.connectors?.length || 0},
  {label: 'Modifiable', value: exploitation => formatBoolean(exploitation.right?.canEdit)}
]

export const ZONE_INSTRUCTORS_EXPORT_COLUMNS = [
  {label: 'ID agent', value: instructor => instructor.id},
  {label: 'Prénom', value: instructor => instructor.firstName},
  {label: 'Nom', value: instructor => instructor.lastName},
  {label: 'Email', value: instructor => instructor.email},
  {label: 'Téléphone', value: instructor => instructor.phoneNumber},
  {label: 'Fonction', value: instructor => instructor.jobTitle},
  {label: 'Nombre de droits attribués', value: instructor => instructor.permissions?.length || 0},
  {label: 'Droits attribués', value: instructor => (instructor.permissions || []).join(', ')},
  {label: 'Agent courant', value: instructor => formatBoolean(instructor.isCurrentUser)},
  {label: 'Début accès', value: instructor => formatDate(instructor.startDate)},
  {label: 'Fin accès', value: instructor => formatDate(instructor.endDate)}
]
