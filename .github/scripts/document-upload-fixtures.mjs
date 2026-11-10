import {createHash} from 'node:crypto'

// Isolated synthetic documents: no storage, real accounts or external scanner.
export const documentUploadId = 'd0111111-1111-4111-8111-111111111111'
export const documentUploadErrors = {
  unavailable: {code: 503, message: 'L’analyse antivirus est temporairement indisponible. Aucun fichier du dépôt n’a été enregistré. Réessayez dans 30 secondes.', messageIsPublic: true},
  rejected: {code: 422, message: 'Un fichier n’a pas pu être vérifié par l’antivirus. Aucun fichier du dépôt n’a été enregistré. Essayez une version lisible, sans mot de passe, ou contactez l’assistance.'}
}
const attempts = new Map()
export const isDocumentUploadFixture = authorization => /^Bearer browser-test-document-upload-/.test(authorization ?? '')

export async function handleDocumentUploadFixture(request, send) {
  const authorization = request.headers.authorization
  if (!isDocumentUploadFixture(authorization)) return false
  const {pathname} = new URL(request.url, 'http://127.0.0.1:3431')
  const respond = (status, value) => { send(status, value); return true }
  if (pathname === '/info' || pathname === '/api/info') return respond(200, {
    role: 'ADMIN', permissions: [], user: {id: documentUploadId, email: 'document@example.test'},
    expiresAt: new Date(Date.now() + 3_600_000).toISOString()
  })
  if (pathname === `/api/declarants/${documentUploadId}/overview`) return respond(200, {
    id: documentUploadId, userId: documentUploadId, declarantRole: 'PRELEVEUR',
    declarantType: 'LEGAL_PERSON', socialReason: 'Préleveur documentaire synthétique',
    right: {canRead: true, permissions: ['declarant.document.create']}
  })
  if (pathname === '/api/__document-upload-attempts') return respond(200, attempts.get(authorization) ?? [])
  if (pathname === `/api/preleveurs/${documentUploadId}/documents` && request.method === 'POST') {
    const chunks = []
    for await (const chunk of request) chunks.push(chunk)
    const form = await new Response(Buffer.concat(chunks), {
      headers: {'Content-Type': request.headers['content-type']}
    }).formData()
    const document = form.get('document')
    const fields = Object.fromEntries([...form.entries()].filter(([key]) => key !== 'document'))
    const file = {name: document.name, type: document.type, size: document.size,
      sha256: createHash('sha256').update(Buffer.from(await document.arrayBuffer())).digest('hex')}
    attempts.set(authorization, [...(attempts.get(authorization) ?? []), {fields, file}])
    const error = authorization.includes('-unavailable-') ? documentUploadErrors.unavailable : documentUploadErrors.rejected
    return respond(error.code, error)
  }
  return false
}
