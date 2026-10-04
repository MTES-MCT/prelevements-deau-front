import {normalizeCampaignCrops} from './campaign-crops.js'
import {campaignNumberError} from './campaign-numbers.js'
import {getUsageCode, getUsageRootCode} from './water-uses.js'

const CAMPAIGN_USAGE_FAMILY_CODES = new Set(['2', '12'])

export const CAMPAIGN_TYPE = 'DROPT_INDEX_NEEDS_2026_2027'
export const CAMPAIGN_TYPE_LABEL = 'Collecte des index de prélèvements et des besoins – irrigants OUGC Dropt'
export const CAMPAIGN_LAST_READING_DATE = '2026-10-31'
export const CAMPAIGN_REQUESTER_TITLE = 'Déclarer mes prélèvements et mes besoins'
export const CAMPAIGN_REQUESTER_DESCRIPTION = 'Bilan de campagne 2026-2027 et recensement des besoins 2027-2028'
export const CAMPAIGN_REPLENISHMENT_NOTICE = 'Les points de réalimentation n’ont pas à être déclarés ici'
export const CAMPAIGN_METER_CHANGE_VOLUME_LABEL = 'Non calculé : changement de compteur signalé'

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
  const canRespond = campaign.permissions?.canRespond ?? campaignState(campaign) === 'OPEN'
  return {
    complete,
    label: `${submitted} point${submitted > 1 ? 's' : ''} déclaré${submitted > 1 ? 's' : ''} sur ${total}`,
    action: complete || !canRespond
      ? 'Consulter ma déclaration'
      : drafts || submitted ? 'Reprendre ma déclaration' : 'Commencer ma déclaration'
  }
}

export function singleCampaignResponseHref(campaignId, permissions, responses) {
  if (!isCampaignRequester(permissions) || responses?.total !== 1 || responses.items?.length !== 1) return null
  return `/campagnes/${campaignId}/reponses/${responses.items[0].id}`
}

export function campaignExploitationLabel(item) {
  const point = item?.point || item?.pointPrelevement || item?.exploitation?.pointPrelevement
  const code = item?.countingCode || item?.exploitation?.countingCode
  return `${point?.usageName || point?.name || 'Point de prélèvement'}${code ? ` — Code compteur Agence de l’eau : ${code}` : ''}`
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

export function formatCampaignVolume(value, unavailableLabel = 'En attente de publication') {
  return value === null || value === undefined ? unavailableLabel : `${new Intl.NumberFormat('fr-FR', {maximumFractionDigits: 4}).format(Number(value))} m³`
}

export function campaignMeterChangeReported(response, compteurId) {
  return (response?.publicationIssues || []).some(issue => issue?.code === 'METER_CHANGE_REPORTED' && (!compteurId || issue.compteurId === compteurId))
    || (response?.meterChanges || response?.submittedData?.meters || []).some(meter => (response?.meterChanges || meter.meterChanged) && (!compteurId || meter.compteurId === compteurId))
}

export function campaignPublicationLabel(response) {
  return response?.publicationStatusLabel || (campaignMeterChangeReported(response) ? CAMPAIGN_METER_CHANGE_VOLUME_LABEL : 'Volumes en attente de vérification')
}

export function campaignUsageOptions(usages = []) {
  const items = Array.isArray(usages) ? usages : (usages.items || [])
  const options = items.flatMap(usage => [usage, ...(usage.children || []).map(child => ({...child, parent: usage}))])
  return [...new Map(options.map(usage => [usage.id, usage])).values()]
}

// Restrict new choices only: existing answers and validation still use the full reference.
export function campaignSelectableUsageOptions(usages = []) {
  return campaignUsageOptions(usages).filter(usage => {
    const code = getUsageCode(usage)
    return code === '0' || code === '1' || CAMPAIGN_USAGE_FAMILY_CODES.has(getUsageRootCode(usage))
  })
}

export function campaignRequiresIrrigationDetails(usageId, usages = []) {
  const usage = campaignUsageOptions(usages).find(usage => usage.id === usageId)
  // Only realimentation (including its sub-usages) makes agricultural details
  // optional. Unknown usages retain the existing validation requirements.
  return !/^12(?:[A-Z]|$)/i.test(String(usage?.code ?? ''))
}

export function emptyCampaignPeriod(needs = false) {
  return needs ? {flow: '', volume: '', usageId: '', surface: '', crops: []}
    : {usageId: '', indexStart: '', indexEnd: '', surface: '', crops: []}
}

export function emptyCampaignMeter(meter = {}) {
  return {
    compteurId: meter.compteurId || meter.id || null,
    serialNumber: meter.serialNumber || meter.number || '',
    meterChanged: false,
    meterChangeReason: '',
    offSeason: emptyCampaignPeriod(),
    season: {usageId: '', indexEnd: '', surface: '', crops: []}
  }
}

export function initialCampaignAnswer(data, meters = []) {
  const period = (value, defaults) => ({...defaults, ...value, crops: normalizeCampaignCrops(value?.crops)})
  return normalizeCampaignMeterChanges({
    meters: data?.meters?.length ? data.meters.map(meter => ({...meter, offSeason: period(meter.offSeason, emptyCampaignPeriod()), season: period(meter.season, emptyCampaignMeter().season)})) : (meters.length ? meters.map(emptyCampaignMeter) : [emptyCampaignMeter()]),
    needs: {
      offSeason: period(data?.needs?.offSeason, emptyCampaignPeriod(true)),
      season: period(data?.needs?.season, emptyCampaignPeriod(true))
    },
    comment: data?.comment || ''
  })
}

// Index precision is four decimal places, as in the API. BigInt avoids rounding
// large meter readings when checking consecutive values.
function comparableIndex(value) {
  const text = String(value ?? '').trim().replace(',', '.')
  if (!/^\d{1,12}(?:\.\d{1,4})?$/.test(text)) return null
  const [integer, fraction = ''] = text.split('.')
  return BigInt(integer) * 10000n + BigInt(fraction.padEnd(4, '0'))
}

export function validateCampaignIndices(data, {allowMeterChanges = false} = {}) {
  const errors = {}
  for (const [index, meter] of (data.meters || []).entries()) {
    if (allowMeterChanges && meter.meterChanged && String(meter.meterChangeReason || '').trim()) continue
    const start = comparableIndex(meter.offSeason?.indexStart)
    const middle = comparableIndex(meter.offSeason?.indexEnd)
    const end = comparableIndex(meter.season?.indexEnd)
    if (start !== null && middle !== null && middle < start) {
      errors[`meters.${index}.offSeason.indexEnd`] = 'L’index du 31/05/2026 doit être supérieur ou égal à celui du 01/11/2025.'
    }
    if (end !== null && ((middle !== null && end < middle) || (middle === null && start !== null && end < start))) {
      errors[`meters.${index}.season.indexEnd`] = `L’index du 31/10/2026 doit être supérieur ou égal à celui du ${middle !== null ? '31/05/2026' : '01/11/2025'}.`
    }
  }
  return errors
}

export function normalizeCampaignMeterChanges(data) {
  const inconsistent = new Set(Object.keys(validateCampaignIndices(data)).map(path => Number(path.split('.')[1])))
  return {...data, meters: (data.meters || []).map((meter, index) => ({...meter, meterChanged: meter.meterChanged === true || inconsistent.has(index), meterChangeReason: meter.meterChangeReason || ''}))}
}

export function validateCampaignAnswer(data, usages = []) {
  const errors = {}
  const number = (value, path) => {
    if (comparableIndex(value) === null) {
      errors[path] = campaignNumberError(value, path.split('.').at(-1))
    }
  }
  const period = (value, path, numericFields) => {
    const irrigationDetailsRequired = campaignRequiresIrrigationDetails(value?.usageId, usages)
    for (const field of numericFields) {
      if (field === 'surface' && !irrigationDetailsRequired && String(value?.surface ?? '').trim() === '') continue
      number(value?.[field], `${path}.${field}`)
    }
    if (!value?.usageId) errors[`${path}.usageId`] = 'Choisissez un usage.'
    if (irrigationDetailsRequired && !normalizeCampaignCrops(value?.crops).length) errors[`${path}.crops`] = 'Sélectionnez les cultures, ou choisissez « Aucune ».'
  }
  for (const [index, meter] of (data.meters || []).entries()) {
    if (!String(meter.serialNumber || '').trim()) errors[`meters.${index}.serialNumber`] = 'Renseignez le numéro de série du compteur.'
    if (meter.meterChanged && !String(meter.meterChangeReason || '').trim()) errors[`meters.${index}.meterChangeReason`] = 'Précisez le motif du changement de compteur.'
    period(meter.offSeason, `meters.${index}.offSeason`, ['indexStart', 'indexEnd', 'surface'])
    period(meter.season, `meters.${index}.season`, ['indexEnd', 'surface'])
  }
  if (!data.meters?.length) errors.meters = 'Renseignez au moins un compteur.'
  for (const season of ['season', 'offSeason']) period(data.needs?.[season], `needs.${season}`, ['flow', 'volume', 'surface'])
  return {...errors, ...validateCampaignIndices(data, {allowMeterChanges: true})}
}

export function setCampaignField(data, path, value, {normalizeMeterChanges = true} = {}) {
  const next = structuredClone(data)
  const parts = path.split('.')
  let target = next
  for (const key of parts.slice(0, -1)) target = target[key]
  target[parts.at(-1)] = value
  return normalizeMeterChanges ? normalizeCampaignMeterChanges(next) : next
}

export function getCampaignField(data, path) {
  return path.split('.').reduce((value, key) => value?.[key], data) ?? ''
}
