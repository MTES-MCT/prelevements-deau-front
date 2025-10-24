import {executeRequest, getAuthorization} from './util/request.js'

export async function getDossiers() {
  const response = await executeRequest(
    'api/dossiers',
    {headers: {Authorization: await getAuthorization()}})

  return response.json()
}

export async function getDossiersByStatus(status) {
  const response = await executeRequest(
    `api/dossiers?status=${status}`,
    {headers: {Authorization: await getAuthorization()}})

  return response.json()
}

export async function getDossiersStats() {
  const response = await executeRequest(
    'api/dossiers/stats',
    {headers: {Authorization: await getAuthorization()}}
  )

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

export async function getFile(dossierId, attachmentId) {
  const response = await executeRequest(
    `api/dossiers/${dossierId}/files/${attachmentId}`,
    {headers: {Authorization: await getAuthorization()}})

  if (response.ok === false) {
    return null
  }

  return response.json()
}

export async function getFileSeries(dossierId, attachmentId, {withPoint = false} = {}) {
  const search = withPoint ? '?withPoint=1' : ''
  const response = await executeRequest(
    `api/dossiers/${dossierId}/files/${attachmentId}/series${search}`,
    {headers: {Authorization: await getAuthorization()}}
  )

  if (response.ok === false) {
    return null
  }

  return response.json()
}

export async function getFileIntegrations(dossierId, attachmentId, {withPoint = false} = {}) {
  const search = withPoint ? '?withPoint=1' : ''
  const response = await executeRequest(
    `api/dossiers/${dossierId}/files/${attachmentId}/integrations${search}`,
    {headers: {Authorization: await getAuthorization()}}
  )

  if (response.ok === false) {
    return null
  }

  return response.json()
}

export async function getFileBlob(dossierId, attachmentId) {
  const response = await executeRequest(
    `api/dossiers/${dossierId}/files/${attachmentId}/download`,
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
