import {flatMap} from 'lodash-es'
import moment from 'moment'
import 'moment/locale/fr'

import {getFileAction, getFileSeriesAction, getFileIntegrationsAction} from '@/server/actions/index.js'

moment.locale('fr')

export const validationStatus = {
  success: 'Succès',
  error: 'Erreur',
  warning: 'Avertissement',
  failed: 'Échec'
}

function parseMonth(value) {
  if (!value) {
    return null
  }

  const m = moment.utc(value)
  return m.isValid() ? m.startOf('month') : null
}

export function getDossierPeriod({startMonth, endMonth} = {}) {
  const start = parseMonth(startMonth)
  const end = parseMonth(endMonth)

  if (!start && !end) {
    return {start: null, end: null}
  }

  if (!start) {
    return {start: end.toDate(), end: end.toDate()}
  }

  if (!end) {
    return {start: start.toDate(), end: start.toDate()}
  }

  const [from, to] = start.isSameOrBefore(end) ? [start, end] : [end, start]
  return {start: from.toDate(), end: to.toDate()}
}

export function getDossierPeriodLabel(dossier) {
  const {start, end} = getDossierPeriod(dossier)
  if (!start && !end) {
    return null
  }

  const from = moment.utc(start ?? end)
  const to = moment.utc(end ?? start)

  const fromLabel = from.format('MMMM YYYY')
  const toLabel = to.format('MMMM YYYY')

  return from.isSame(to, 'month') ? fromLabel : `${fromLabel} à ${toLabel}`
}

export function getFileNameFromStorageKey(storageKey) {
  const [, ...fileName] = storageKey.split('-')
  return fileName.join('-')
}

export function getPointsPrelevementIdsFromDeclaration(declaration) {
  const source = declaration.source
  const chunks = source?.chunks || []

  return chunks.map(chunk => chunk.pointPrelevementId).filter(Boolean)
}

export async function getDossierFiles(dossier) {
  if (!dossier.files) {
    return []
  }

  const enriched = await Promise.all(dossier.files.map(async file => {
    const [detailsResult, seriesResult, integrationsResult] = await Promise.all([
      getFileAction(dossier.id, file.id),
      getFileSeriesAction(dossier.id, file.id, {withPoint: true}),
      getFileIntegrationsAction(dossier.id, file.id, {withPoint: true})
    ])

    if (!detailsResult.success || !detailsResult.data) {
      return null
    }

    const details = detailsResult.data
    const series = seriesResult.success ? (seriesResult.data?.series ?? []) : []
    const integrations = integrationsResult.success ? (integrationsResult.data?.integrations ?? []) : []

    return {
      ...details,
      series,
      integrations,
      attachmentId: file.id
    }
  }))

  return enriched.filter(Boolean)
}

export function getPersonnePhysiqueFullName(
  {civility, user: {lastName, firstName} = {}} = {}
) {
  if (!lastName || !firstName) {
    return 'Nom et prénom non renseignés'
  }

  return civility
    ? `${civility}. ${lastName} ${firstName}`
    : `${lastName} ${firstName}`
}

export function formatFullAddress({addressLine1, addressLine2, poBox, postalCode, city} = {}) {
  const parts = [
    addressLine1,
    addressLine2,
    poBox,
    [postalCode, city].filter(Boolean).join(' ')
  ]

  return parts.filter(Boolean).join(', ')
}
