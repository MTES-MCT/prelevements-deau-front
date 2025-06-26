import {executeRequest} from './util/request.js'

export async function getDossiers() {
  return executeRequest('api/dossiers')
}

export async function getDossier(_id) {
  return executeRequest(`api/dossiers/${_id}`)
}

export async function getFile(dossierId, storageHash) {
  return executeRequest(`api/dossiers/${dossierId}/files/${storageHash}`)
}

export async function getFileBlob(dossierId, storageHash) {
  const response = await executeRequest(`api/dossiers/${dossierId}/files/${storageHash}/download`)
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

  return response.json()
}
