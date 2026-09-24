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

export function isCampaignRequester(permissions = {}) {
  return permissions.canManage === false && permissions.canReadResults === false
}

export function campaignParticipation(campaign) {
  const {total = 0, submitted = 0, drafts = 0} = campaign.progress || {}
  const complete = total > 0 && submitted >= total
  const closed = ['CLOSED', 'ARCHIVED'].includes(campaignState(campaign))
  const canRespond = campaign.permissions?.canRespond ?? campaignState(campaign) === 'OPEN'
  const singular = total === 1
  return {
    complete,
    label: singular
      ? complete ? 'Réponse envoyée' : closed ? 'Réponse non envoyée' : drafts ? 'Brouillon enregistré' : 'Réponse à compléter'
      : `${submitted} réponse${submitted === 1 ? '' : 's'} envoyée${submitted === 1 ? '' : 's'} sur ${total}`,
    action: complete || !canRespond
      ? singular ? 'Consulter ma réponse' : 'Consulter mes réponses'
      : drafts ? singular ? 'Reprendre ma réponse' : 'Reprendre mes réponses'
        : singular ? 'Compléter ma réponse' : 'Compléter mes réponses'
  }
}

export function singleCampaignResponseHref(campaignId, permissions, responses) {
  if (!isCampaignRequester(permissions) || responses?.total !== 1 || responses.items?.length !== 1) return null
  return `/campagnes/${campaignId}/reponses/${responses.items[0].id}`
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
  const options = items.flatMap(usage => [usage, ...(usage.children || []).map(child => ({...child, parent: usage}))])
  return [...new Map(options.map(usage => [usage.id, usage])).values()]
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

// Index precision is four decimal places, as in the API. BigInt avoids rounding
// large meter readings when checking consecutive values.
function comparableIndex(value) {
  const text = String(value ?? '').trim().replace(',', '.')
  if (!/^\d{1,12}(?:\.\d{1,4})?$/.test(text)) return null
  const [integer, fraction = ''] = text.split('.')
  return BigInt(integer) * 10000n + BigInt(fraction.padEnd(4, '0'))
}

export function validateCampaignIndices(data) {
  const errors = {}
  for (const [index, meter] of (data.meters || []).entries()) {
    const start = comparableIndex(meter.offSeason?.indexStart)
    const middle = comparableIndex(meter.offSeason?.indexEnd)
    const end = comparableIndex(meter.season?.indexEnd)
    if (start !== null && middle !== null && middle < start) {
      errors[`meters.${index}.offSeason.indexEnd`] = 'L’index du 01/06/2026 doit être supérieur ou égal à celui du 31/10/2025.'
    }
    if (end !== null && ((middle !== null && end < middle) || (middle === null && start !== null && end < start))) {
      errors[`meters.${index}.season.indexEnd`] = `L’index du 31/10/2026 doit être supérieur ou égal à celui du ${middle !== null ? '01/06/2026' : '31/10/2025'}.`
    }
  }
  return errors
}

export function validateCampaignAnswer(data) {
  const errors = {}
  const number = (value, path) => {
    if (comparableIndex(value) === null) {
      errors[path] = 'Saisissez un nombre positif ou zéro, avec au plus 12 chiffres avant la virgule et 4 après.'
    }
  }
  const period = (value, path, numericFields) => {
    for (const field of numericFields) number(value?.[field], `${path}.${field}`)
    if (!value?.usageId) errors[`${path}.usageId`] = 'Choisissez un usage.'
    if (!value?.crops?.trim()) errors[`${path}.crops`] = 'Précisez les cultures, ou indiquez « aucune ».'
  }
  for (const [index, meter] of (data.meters || []).entries()) {
    if (!meter.serialNumber?.trim()) errors[`meters.${index}.serialNumber`] = 'Renseignez le numéro du compteur.'
    period(meter.offSeason, `meters.${index}.offSeason`, ['indexStart', 'indexEnd', 'surface'])
    period(meter.season, `meters.${index}.season`, ['indexEnd', 'surface'])
  }
  if (!data.meters?.length) errors.meters = 'Renseignez au moins un compteur.'
  for (const season of ['season', 'offSeason']) period(data.needs?.[season], `needs.${season}`, ['flow', 'volume', 'surface'])
  return {...errors, ...validateCampaignIndices(data)}
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
