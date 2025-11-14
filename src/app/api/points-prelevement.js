import {executeRequest, getAuthorization, API_URL} from './util/request.js'

export async function getPointsPrelevement() {
  const response = await executeRequest(
    'api/points-prelevement',
    {headers: {Authorization: await getAuthorization()}}
  )
  return response.json()
}

export async function getPointPrelevement(id) {
  const response = await executeRequest(`api/points-prelevement/${id}`, {headers: {Authorization: await getAuthorization()}})
  if (response.ok === false) {
    return null
  }

  return response.json()
}

export async function createPointPrelevement(payload) {
  const response = await executeRequest('api/points-prelevement', {
    headers: {Authorization: await getAuthorization()},
    method: 'POST',
    body: payload
  })
  return response.json()
}

export async function editPointPrelevement(id, payload) {
  const response = await executeRequest(`api/points-prelevement/${id}`, {
    headers: {Authorization: await getAuthorization()},
    method: 'PUT',
    body: payload
  })
  return response.json()
}

export async function deletePointPrelevement(id) {
  const response = await executeRequest(`api/points-prelevement/${id}`, {
    headers: {Authorization: await getAuthorization()},
    method: 'DELETE'
  })
  return response.json()
}

export async function getPreleveur(id) {
  const response = await executeRequest(`api/preleveurs/${id}`, {headers: {Authorization: await getAuthorization()}})
  if (response.ok === false) {
    return null
  }

  return response.json()
}

export async function getDocumentsFromPreleveur(id) {
  const response = await executeRequest(`api/preleveurs/${id}/documents`, {
    headers: {Authorization: await getAuthorization()}
  })

  if (response.ok === false) {
    return null
  }

  return response.json()
}

export async function getPreleveurs() {
  const response = await executeRequest('api/preleveurs', {headers: {Authorization: await getAuthorization()}})
  return response.json()
}

export async function getPointsFromPreleveur(idPreleveur) {
  const response = await executeRequest(
    `api/preleveurs/${idPreleveur}/points-prelevement`,
    {headers: {Authorization: await getAuthorization()}}
  )
  if (response.ok === false) {
    return []
  }

  return response.json()
}

export async function createPreleveur(payload) {
  const response = await executeRequest('api/preleveurs', {
    headers: {Authorization: await getAuthorization()},
    method: 'POST',
    body: payload
  })
  return response.json()
}

export async function updatePreleveur(idPreleveur, payload) {
  const response = await executeRequest(
    `api/preleveurs/${idPreleveur}`,
    {
      headers: {Authorization: await getAuthorization()},
      method: 'PUT',
      body: payload
    }
  )
  return response.json()
}

export async function deletePreleveur(idPreleveur) {
  const response = await executeRequest(
    `api/preleveurs/${idPreleveur}`,
    {
      headers: {Authorization: await getAuthorization()},
      method: 'DELETE'
    }
  )
  return response.json()
}

export async function createDocument(idPreleveur, payload, document) {
  const formData = new FormData()
  for (const [key, value] of Object.entries(payload)) {
    formData.append(key, value)
  }

  formData.append('document', document)

  // On utilise fetch directement car executeRequest ne gère pas FormData
  const response = await fetch(
    `${API_URL}/api/preleveurs/${idPreleveur}/documents`,
    {
      headers: {Authorization: await getAuthorization()},
      method: 'POST',
      body: formData
    }
  )

  return response.json()
}

export async function uploadDocument(idPreleveur, document) {
  const formData = new FormData()
  formData.append('document', document)

  const response = await fetch(
    `${API_URL}/api/preleveurs/${idPreleveur}/documents/upload`,
    {
      headers: {Authorization: await getAuthorization()},
      method: 'POST',
      body: formData
    }
  )

  return response.json()
}

export async function updateDocument(idDocument, payload) {
  const response = await executeRequest(
    `api/documents/${idDocument}`,
    {
      headers: {Authorization: await getAuthorization()},
      method: 'PUT',
      body: payload
    }
  )

  return response.json()
}

export async function deleteDocument(idDocument) {
  const response = await executeRequest(
    `api/documents/${idDocument}`,
    {
      headers: {Authorization: await getAuthorization()},
      method: 'DELETE'
    }
  )

  return response
}

export async function createExploitation(payload) {
  const response = await executeRequest('api/exploitations', {
    headers: {Authorization: await getAuthorization()},
    method: 'POST',
    body: payload
  })
  return response.json()
}

export async function updateExploitation(idExploitation, payload) {
  const response = await executeRequest(
    `api/exploitations/${idExploitation}`,
    {
      headers: {Authorization: await getAuthorization()},
      method: 'PUT',
      body: payload
    }
  )
  return response.json()
}

export async function getExploitation(exploitationId) {
  const response = await executeRequest(
    `api/exploitations/${exploitationId}`,
    {headers: {Authorization: await getAuthorization()}}
  )
  if (response.ok === false) {
    return null
  }

  return response.json()
}

export async function getExploitationsByPointId(pointId) {
  const response = await executeRequest(
    `api/points-prelevement/${pointId}/exploitations`,
    {headers: {Authorization: await getAuthorization()}}
  )
  return response.json()
}

export async function getExploitationFromPreleveur(idPreleveur) {
  const response = await executeRequest(
    `api/preleveurs/${idPreleveur}/exploitations`,
    {headers: {Authorization: await getAuthorization()}}
  )
  return response.json()
}

export async function deleteExploitation(exploitationId) {
  const response = await executeRequest(`api/exploitations/${exploitationId}`, {
    headers: {Authorization: await getAuthorization()},
    method: 'DELETE'
  })
  return response.json()
}

export async function getReglesFromPreleveur(idPreleveur) {
  const response = await executeRequest(
    `api/preleveurs/${idPreleveur}/regles`,
    {headers: {Authorization: await getAuthorization()}}
  )
  if (response.ok === false) {
    return []
  }

  return response.json()
}

export async function getStats(territoire) {
  const path = territoire ? `api/stats/${territoire}` : 'api/stats'
  const response = await executeRequest(path)
  return response.json()
}

export async function getBnpe() {
  const response = await executeRequest(
    'api/referentiels/bnpe',
    {headers: {Authorization: await getAuthorization()}})
  return response.json()
}

export async function getBss() {
  const response = await executeRequest(
    'api/referentiels/bss',
    {headers: {Authorization: await getAuthorization()}}
  )

  return response.json()
}

export async function getMeso() {
  const response = await executeRequest(
    'api/referentiels/meso',
    {headers: {Authorization: await getAuthorization()}})
  return response.json()
}

export async function getMeContinentales() {
  const response = await executeRequest(
    'api/referentiels/me-continentales-bv',
    {headers: {Authorization: await getAuthorization()}}
  )
  return response.json()
}

export async function getBvBdcarthage() {
  const response = await executeRequest(
    'api/referentiels/bv-bdcarthage'
    , {headers: {Authorization: await getAuthorization()}})
  return response.json()
}
