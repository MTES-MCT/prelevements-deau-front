import {flatMap} from 'lodash-es'

import {getFile} from '@/app/api/dossiers.js'

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

  return files.flatMap(file => file?.result?.data?.map(({pointPrelevement}) => pointPrelevement))
}

export async function getDossierFiles(dossier) {
  if (!dossier.files) {
    return []
  }

  return Promise.all(dossier.files.map(async file => {
    const [hash] = file.storageKey.split('-')
    return getFile(dossier._id, hash)
  }))
}

export function getPersonnePhysiqueFullName({civilite, nom, prenom}) {
  return nom && prenom
    ? `${civilite}. ${nom || ''} ${prenom || ''}`
    : 'Nom et prénom non renseignés'
}
