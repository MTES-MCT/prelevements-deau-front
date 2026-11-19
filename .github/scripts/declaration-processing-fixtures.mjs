// Synthetic state, isolated by test token. No real database, file, job or mail.
export const declarationProcessingIds = {
  declaration: '15151515-1515-4515-8515-151515151501',
  source: '15151515-1515-4515-8515-151515151502',
  user: '15151515-1515-4515-8515-151515151503'
}
const sessions = new Map()
export const isDeclarationProcessingFixture = (authorization = '') => authorization.startsWith('Bearer browser-test-declaration-processing-')

function quickDeclarationDetail(scenario, withSource) {
  const isVolume = scenario === 'volume'
  const readingDate = '2026-07-10'
  const periodStartDate = '2026-06-12'
  const period = isVolume ? {periodStartDate, periodEndDate: readingDate} : {readingDate}
  const metadata = {measurementType: isVolume ? 'VOLUME' : 'INDEX', ...period}
  const declaration = {
    id: declarationProcessingIds.declaration, code: 'RAPIDE', dataSourceType: 'MANUAL', type: 'quick-declaration',
    processingStatus: 'COMPLETED', createdAt: '2026-07-11T09:00:00.000Z', files: []
  }
  const index = {
    id: 'index-actuel', valueKind: 'DECLARED', metricTypeCode: 'index', unit: 'm³', value: '1525',
    periodStart: readingDate + 'T00:00:00.000Z', periodEnd: readingDate + 'T00:15:00.000Z'
  }
  const volume = {
    id: 'volume', metricTypeCode: 'volume', unit: 'm³',
    valueKind: isVolume ? 'DECLARED' : 'COMPUTED', value: isVolume ? '83' : scenario === 'zero' ? '0' : '25',
    periodStart: periodStartDate + (isVolume ? 'T00:00:00.000Z' : 'T00:15:00.000Z'),
    periodEnd: isVolume ? '2026-07-11T00:00:00.000Z' : index.periodEnd
  }
  const prior = {...index, id: 'index-précédent', value: scenario === 'zero' ? '1525' : '1500',
    periodStart: periodStartDate + 'T00:00:00.000Z', periodEnd: periodStartDate + 'T00:15:00.000Z'}
  const earlier = {...index, id: 'index-historique', value: '1450',
    periodStart: '2026-06-01T00:00:00.000Z', periodEnd: '2026-06-01T00:15:00.000Z'}
  const earlierVolume = {...volume, id: 'volume-historique', value: '10',
    periodStart: '2026-05-25T00:15:00.000Z', periodEnd: earlier.periodEnd}
  const indexes = scenario === 'first' ? [index] : scenario === 'computed' ? [index, prior, earlier] : [index, prior]
  const chunk = {
    id: 'saisie-rapide', pointPrelevementId: 'point-test', pointPrelevement: {id: 'point-test', name: 'Forage des prés'},
    exploitationId: 'exploitation-test', preleveurUserId: declarationProcessingIds.user, flowType: 'PRELEVEMENT', instructionStatus: 'VALIDATED',
    minDate: isVolume ? periodStartDate : readingDate, maxDate: readingDate, metadata: {quickDeclaration: true, ...metadata},
    chunkValues: isVolume ? [volume] : scenario === 'first' ? [index] : [index, volume],
    quickReadingHistory: {
      indexes: isVolume ? [earlier] : indexes,
      volumes: scenario === 'first' ? [] : scenario === 'computed' ? [earlierVolume, volume] : [volume]
    }
  }
  if (scenario === 'intermediate') {
    const nextIndex = {...index, id: 'index-suivant', value: '1567',
      periodStart: '2026-08-08T00:00:00.000Z', periodEnd: '2026-08-08T00:15:00.000Z'}
    chunk.quickReadingHistory.following = {
      indexes: [nextIndex],
      volumes: [{...volume, id: 'volume-suivant', value: '42', periodStart: index.periodEnd, periodEnd: nextIndex.periodEnd}]
    }
  }
  const source = {id: declarationProcessingIds.source, type: 'DECLARATION', status: 'COMPLETED',
    globalInstructionStatus: 'VALIDATED', metadata: {manualQuickDeclaration: true, ...metadata}, chunks: [chunk]}
  return withSource ? {...declaration, source} : {...source, declaration}
}

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
    const quickScenario = ['computed', 'zero', 'first', 'volume', 'intermediate'].find(name => authorization.includes(`-quick-${name}-`))
    if (quickScenario) return respond(200, {success: true, data: quickDeclarationDetail(quickScenario, pathname === declarationPath)})
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
