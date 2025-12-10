import {format, isValid} from 'date-fns'
import {fr} from 'date-fns/locale'
import {flatMap} from 'lodash-es'

import {getFile, getFileSeries, getFileIntegrations} from '@/app/api/dossiers.js'

export const validationStatus = {
  success: 'Succès',
  error: 'Erreur',
  warning: 'Avertissement',
  failed: 'Échec'
}

function parseDeclarationMonth(value) {
  if (typeof value !== 'string') {
    return null
  }

  const match = value.match(/^(\d{4})-(\d{2})$/)
  if (!match) {
    return null
  }

  const [, yearStr, monthStr] = match
  const year = Number.parseInt(yearStr, 10)
  const month = Number.parseInt(monthStr, 10)

  if (Number.isNaN(year) || Number.isNaN(month) || month < 1 || month > 12) {
    return null
  }

  const date = new Date(year, month - 1, 1)
  return isValid(date) ? date : null
}

function coercePeriodBounds(start, end) {
  const hasStart = Boolean(start)
  const hasEnd = Boolean(end)

  if (hasStart && hasEnd) {
    return start.getTime() <= end.getTime()
      ? {start, end}
      : {start: end, end: start}
  }

  if (hasStart) {
    return {start, end: start}
  }

  if (hasEnd) {
    return {start: end, end}
  }

  return {start: null, end: null}
}

export function getFileNameFromStorageKey(storageKey) {
  const [, ...fileName] = storageKey.split('-')
  return fileName.join('-')
}

export function getPointsPrelementIdFromDossier(dossier, files) {
  const {pointPrelevement, donneesPrelevements} = dossier

  if (pointPrelevement) {
    return [pointPrelevement]
  }

  if (donneesPrelevements) {
    return dossier.donneesPrelevements.flatMap(({pointsPrelevements}) => flatMap(pointsPrelevements))
  }

  const pointIds = []
  for (const file of files) {
    if (!Array.isArray(file?.series)) {
      continue
    }

    for (const serie of file.series) {
      if (serie?.pointInfo?.id_point && !pointIds.includes(serie.pointInfo.id_point)) {
        pointIds.push(serie.pointInfo.id_point)
      }
    }
  }

  return pointIds
}

export async function getDossierFiles(dossier) {
  if (!dossier.files) {
    return []
  }

  const enriched = await Promise.all(dossier.files.map(async file => {
    const [details, seriesPayload, integrationsPayload] = await Promise.all([
      getFile(dossier._id, file._id),
      getFileSeries(dossier._id, file._id, {withPoint: true}),
      getFileIntegrations(dossier._id, file._id, {withPoint: true})
    ])

    if (!details) {
      return null
    }

    const series = seriesPayload?.series ?? []
    const integrations = integrationsPayload?.integrations ?? []

    return {
      ...details,
      series,
      integrations,
      attachmentId: file._id
    }
  }))

  return enriched.filter(Boolean)
}

export function getDossierPeriod(dossier) {
  if (!dossier || typeof dossier !== 'object') {
    return {start: null, end: null}
  }

  const start = parseDeclarationMonth(dossier.moisDebutDeclaration)
  const end = parseDeclarationMonth(dossier.moisFinDeclaration)

  if (start || end) {
    return coercePeriodBounds(start, end)
  }

  const singleMonth = parseDeclarationMonth(dossier.moisDeclaration)
  if (singleMonth) {
    return {start: singleMonth, end: singleMonth}
  }

  return {start: null, end: null}
}

export function getDossierPeriodLabel(dossier) {
  const {start, end} = getDossierPeriod(dossier)
  if (!start && !end) {
    return null
  }

  const from = start ?? end
  const to = end ?? start

  const fromLabel = from ? format(from, 'MMMM yyyy', {locale: fr}) : null
  const toLabel = to ? format(to, 'MMMM yyyy', {locale: fr}) : null

  if (from && to && (from.getFullYear() !== to.getFullYear() || from.getMonth() !== to.getMonth())) {
    return `${fromLabel} à ${toLabel}`
  }

  return fromLabel ?? toLabel
}

export function getPersonnePhysiqueFullName({civilite, nom, prenom}) {
  return nom && prenom
    ? `${civilite}. ${nom || ''} ${prenom || ''}`
    : 'Nom et prénom non renseignés'
}
