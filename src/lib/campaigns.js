export const CAMPAIGN_TYPE = 'DROPT_INDEX_NEEDS_2026_2027'
export const CAMPAIGN_TYPE_LABEL = 'Collecte des index de prélèvements et des besoins – irrigants OUGC Dropt'
export const CAMPAIGN_LAST_READING_DATE = '2026-10-31'

export const CAMPAIGN_STATUS_LABELS = {
  DRAFT: 'Brouillon', OPEN: 'Ouverte', CLOSED: 'Clôturée', ARCHIVED: 'Archivée'
}
export const RESPONSE_STATUS_LABELS = {
  NOT_STARTED: 'À compléter', DRAFT: 'Brouillon', SUBMITTED: 'Envoyé'
}

export function campaignState(campaign) {
  return campaign.status === 'OPEN' && (campaign.closedAt || (campaign.closesOn && campaign.closesOn.slice(0, 10) < new Date().toISOString().slice(0, 10))) ? 'CLOSED' : campaign.status
}

export function campaignDate(value) {
  if (!value) return 'Non renseignée'
  return new Intl.DateTimeFormat('fr-FR', {timeZone: 'UTC'}).format(new Date(value))
}

export function campaignPersonLabel(person) {
  return person?.socialReason || person?.label || person?.name
    || [person?.firstName, person?.lastName].filter(Boolean).join(' ') || 'Préleveur'
}

export function campaignExploitationLabel(item) {
  const point = item?.point || item?.pointPrelevement || item?.exploitation?.pointPrelevement
  const code = item?.countingCode || item?.exploitation?.countingCode
  return `${point?.usageName || point?.name || 'Point de prélèvement'}${code ? ` — Code comptage : ${code}` : ''}`
}

export function campaignData(result) {
  if (!result?.success) throw new Error(result?.error || 'Impossible de charger la campagne.')
  return result.data?.data ?? result.data
}

export function campaignResponseHref(source, currentRole) {
  const {collectionCampaignId, collectionResponseId} = source?.metadata || {}
  if (!collectionCampaignId || !collectionResponseId || !['ADMIN', 'DECLARANT'].includes(currentRole)) return null
  const base = currentRole === 'ADMIN' ? '/administration/campagnes' : '/campagnes'
  return `${base}/${collectionCampaignId}/reponses/${collectionResponseId}`
}

export function formatCampaignVolume(value) {
  return value === null || value === undefined ? 'En attente de publication' : `${new Intl.NumberFormat('fr-FR', {maximumFractionDigits: 4}).format(Number(value))} m³`
}

export function campaignUsageOptions(usages = []) {
  const items = Array.isArray(usages) ? usages : (usages.items || [])
  return items.flatMap(usage => usage.children?.length
    ? usage.children.map(child => ({...child, parent: usage}))
    : (['SUB_USAGE', 'SUBUSAGE'].includes(usage.kind) || /[A-Z]/.test(usage.code || '') ? [usage] : []))
}

export function emptyCampaignPeriod(needs = false) {
  return needs ? {flow: '', volume: '', usageId: '', surface: '', crops: ''}
    : {usageId: '', indexStart: '', indexEnd: '', surface: '', crops: ''}
}

export function emptyCampaignMeter(meter = {}) {
  return {
    compteurId: meter.compteurId || meter.id || null,
    serialNumber: meter.serialNumber || meter.number || '',
    offSeason: emptyCampaignPeriod(),
    season: {usageId: '', indexEnd: '', surface: '', crops: ''}
  }
}

export function initialCampaignAnswer(data, meters = []) {
  return {
    meters: data?.meters?.length ? data.meters.map(meter => ({...meter, offSeason: {...emptyCampaignPeriod(), ...meter.offSeason}, season: {usageId: '', indexEnd: '', surface: '', crops: '', ...meter.season}})) : (meters.length ? meters.map(emptyCampaignMeter) : [emptyCampaignMeter()]),
    needs: {
      offSeason: {...emptyCampaignPeriod(true), ...data?.needs?.offSeason},
      season: {...emptyCampaignPeriod(true), ...data?.needs?.season}
    },
    comment: data?.comment || ''
  }
}

export function validateCampaignAnswer(data) {
  const errors = {}
  const number = (value, path) => {
    if (value === '' || value === null || value === undefined || !Number.isFinite(Number(value)) || Number(value) < 0) {
      errors[path] = 'Saisissez un nombre positif ou zéro.'
    }
  }
  const period = (value, path, numericFields) => {
    for (const field of numericFields) number(value?.[field], `${path}.${field}`)
    if (!value?.usageId) errors[`${path}.usageId`] = 'Choisissez un sous-usage.'
    if (!value?.crops?.trim()) errors[`${path}.crops`] = 'Précisez les cultures, ou indiquez « aucune ».'
  }
  for (const [index, meter] of (data.meters || []).entries()) {
    if (!meter.serialNumber?.trim()) errors[`meters.${index}.serialNumber`] = 'Renseignez le numéro du compteur.'
    period(meter.offSeason, `meters.${index}.offSeason`, ['indexStart', 'indexEnd', 'surface'])
    period(meter.season, `meters.${index}.season`, ['indexEnd', 'surface'])
  }
  if (!data.meters?.length) errors.meters = 'Renseignez au moins un compteur.'
  for (const season of ['season', 'offSeason']) period(data.needs?.[season], `needs.${season}`, ['flow', 'volume', 'surface'])
  return errors
}

export function setCampaignField(data, path, value) {
  const next = structuredClone(data)
  const parts = path.split('.')
  let target = next
  for (const key of parts.slice(0, -1)) target = target[key]
  target[parts.at(-1)] = value
  return next
}

export function getCampaignField(data, path) {
  return path.split('.').reduce((value, key) => value?.[key], data) ?? ''
}
