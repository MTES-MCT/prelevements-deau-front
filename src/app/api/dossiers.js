import {executeRequest} from './util/request.js'

export async function getDossiers() {
  return executeRequest({url: '/dossiers'})
}

export async function getDossier(_id) {
  const response = await executeRequest({url: `/dossiers/${_id}`})
  const dossier = await response.json()
  return dossier
}

export async function getFile(dossierId, storageHash) {
  const response = await executeRequest({url: `/dossiers/${dossierId}/files/${storageHash}`})
  if (!response.ok) {
    throw new Error('Failed to fetch file')
  }

  return response.blob()
}

export async function getDownloadableFile(dossierId, storageHash) {
  const response = await executeRequest({url: `/dossiers/${dossierId}/files/${storageHash}/download`})
  if (!response.ok) {
    throw new Error('Failed to fetch file')
  }

  return response.blob()
}

export async function validateFile(buffer, fileType) {
  const response = await executeRequest({
    url: `/validate-file?fileType=${fileType}`,
    method: 'POST',
    headers: {
      'Content-Type': 'application/octet-stream'
    },
    body: buffer
  })

  if (!response.ok) {
    throw new Error('Failed to validate file')
  }

  return response.json()
}
