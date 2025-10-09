import {flatMap} from 'lodash-es'

import {getFile, getFileIntegrations, getFileSeries} from '@/app/api/dossiers.js'

export const validationStatus = {
  success: 'Succès',
  error: 'Erreur',
  warning: 'Avertissement',
  failed: 'Échec'
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
      integrations
    }
  }))

  return enriched.filter(Boolean)
}

export function getPersonnePhysiqueFullName({civilite, nom, prenom}) {
  return nom && prenom
    ? `${civilite}. ${nom || ''} ${prenom || ''}`
    : 'Nom et prénom non renseignés'
}
