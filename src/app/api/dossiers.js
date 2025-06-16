const API_URL = process.env.NEXT_PUBLIC_API_URL

export async function getDossiers() {
  const response = await fetch(`${API_URL}/dossiers`)
  const dossiers = await response.json()
  return dossiers
}

export async function getDossier(_id) {
  const response = await fetch(`${API_URL}/dossiers/${_id}`)
  const dossier = await response.json()
  return dossier
}

export async function getFile(dossierId, storageHash) {
  const response = await fetch(`${API_URL}/dossiers/${dossierId}/files/${storageHash}`)
  if (!response.ok) {
    throw new Error('Failed to fetch file')
  }

  return response.blob()
}

export async function getDownloadableFile(dossierId, storageHash) {
  const response = await fetch(`${API_URL}/dossiers/${dossierId}/files/${storageHash}/download`)
  if (!response.ok) {
    throw new Error('Failed to fetch file')
  }

  return response.blob()
}

export async function validateFile(buffer, fileType) {
  const response = await fetch(`${API_URL}/validate-file?fileType=${fileType}`, {
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
