import {executeRequest, getAuthorization} from './util/request.js'

export async function getDossiers() {
  const response = await executeRequest(
    'api/dossiers',
    {headers: {Authorization: await getAuthorization()}})

  return response.json()
}

export async function getDossier(_id) {
  const response = await executeRequest(
    `api/dossiers/${_id}`,
    {headers: {Authorization: await getAuthorization()}})

  if (response.ok === false) {
    return null
  }

  return response.json()
}

export async function getFile(dossierId, storageHash) {
  const response = await executeRequest(
    `api/dossiers/${dossierId}/files/${storageHash}`,
    {headers: {Authorization: await getAuthorization()}})

  if (response.ok === false) {
    return null
  }

  return response.json()
}

export async function getFileBlob(dossierId, storageHash) {
  const response = await executeRequest(
    `api/dossiers/${dossierId}/files/${storageHash}/download`,
    {headers: {Authorization: await getAuthorization()}})
  if (response.ok === false) {
    return null
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

  return response.json()
}
