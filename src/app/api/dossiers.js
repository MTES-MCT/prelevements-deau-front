import {executeRequest} from './util/request.js'

export async function getDossiers() {
  const response = await executeRequest('api/dossiers')
  return response.json()
}

export async function getDossier(_id) {
  const response = await executeRequest(`api/dossiers/${_id}`)
  return response.json()
}

export async function getFile(dossierId, storageHash) {
  const response = await executeRequest(`api/dossiers/${dossierId}/files/${storageHash}`)
  if (!response.ok) {
    throw new Error('Failed to fetch file')
  }

  return response.blob()
}

export async function getDownloadableFile(dossierId, storageHash) {
  const response = await executeRequest(`api/dossiers/${dossierId}/files/${storageHash}/download`)
  if (!response.ok) {
    throw new Error('Failed to fetch file')
  }

  return response.blob()
}

export async function validateFile(buffer, fileType) {
  const response = await executeRequest(
    `validate-file?fileType=${fileType}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/octet-stream'
      },
      body: buffer
    }
  )

  if (!response.ok) {
    throw new Error('Failed to validate file')
  }

  return response.json()
}
