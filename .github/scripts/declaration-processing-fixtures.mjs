// Synthetic state, isolated by test token. No real database, file, job or mail.
export const declarationProcessingIds = {
  declaration: '15151515-1515-4515-8515-151515151501',
  source: '15151515-1515-4515-8515-151515151502',
  user: '15151515-1515-4515-8515-151515151503'
}
const sessions = new Map()
export const isDeclarationProcessingFixture = (authorization = '') => authorization.startsWith('Bearer browser-test-declaration-processing-')

export async function handleDeclarationProcessingFixture(request, send) {
  const authorization = request.headers.authorization
  if (!isDeclarationProcessingFixture(authorization)) return false
  const {pathname} = new URL(request.url, 'http://127.0.0.1:3431')
  const respond = (status, data) => {send(status, data); return true}
  const role = authorization.includes('-admin-') ? 'ADMIN' : authorization.includes('-instructor-') ? 'INSTRUCTOR' : 'DECLARANT'
  if (!sessions.has(authorization)) {
    sessions.set(authorization, {processingStatus: 'FAILED', sourceStatus: 'PENDING', reads: []})
  }
  const state = sessions.get(authorization)
  if (pathname === '/api/__declaration-processing-state') {
    if (request.method === 'PATCH') {
      const chunks = []
      for await (const chunk of request) chunks.push(chunk)
      const body = JSON.parse(Buffer.concat(chunks).toString())
      state.processingStatus = body.processingStatus
      state.sourceStatus = body.sourceStatus
    }
    return respond(200, state)
  }
  if (pathname === '/info' || pathname === '/api/info') {
    return respond(200, {
      role, declarantRole: 'PRELEVEUR', permissions: [],
      user: {id: declarationProcessingIds.user, email: 'declaration@example.test'},
      expiresAt: new Date(Date.now() + 3600000).toISOString()
    })
  }
  const declarationPath = `/api/declarations/${declarationProcessingIds.declaration}`
  const sourcePath = `/api/sources/${declarationProcessingIds.source}`
  if (pathname === declarationPath || pathname === sourcePath) {
    state.reads.push(pathname)
    const declaration = {
      id: declarationProcessingIds.declaration, code: 'TEST123', dataSourceType: 'SPREADSHEET',
      type: 'gespoint', declarationType: {name: 'Fichier synthétique'}, createdAt: '2026-10-19T12:00:00.000Z',
      processingStatus: state.processingStatus,
      processingError: 'Prisma P2028 /private/internal/transaction.js synthetic technical detail',
      processingEvents: [{status: state.processingStatus, message: 'Internal SQL synthetic technical detail', createdAt: '2026-10-19T12:01:00.000Z'}],
      declarant: {id: declarationProcessingIds.user, socialReason: 'Préleveur synthétique'},
      files: [{id: 'synthetic-file', filename: 'declaration-synthetique.xlsx', type: 'gespoint', url: '/synthetic-file.xlsx'}]
    }
    const source = {
      id: declarationProcessingIds.source, type: 'DECLARATION', status: state.sourceStatus,
      globalInstructionStatus: 'VALIDATED', createdAt: declaration.createdAt,
      metadata: {totalWaterVolumeWithdrawn: 123456},
      chunks: [{
        id: 'old-chunk', pointPrelevementId: 'old-point', canReconcile: true,
        pointPrelevement: {id: 'old-point', name: 'Ancien point à ne pas afficher', flowType: 'PRELEVEMENT'},
        minDate: '2025-01-01', maxDate: '2025-12-31'
      }]
    }
    return respond(200, {success: true, data: pathname === sourcePath ? {...source, declaration} : {...declaration, source}})
  }
  if (pathname === `${declarationPath}/available-points-prelevements`) {
    state.reads.push(pathname)
    return respond(200, {success: true, data: []})
  }
  return false
}
