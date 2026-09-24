// Synthetic campaign fixtures, isolated by token. No real accounts or database.
export const campaignIds = {
  campaign: '91111111-1111-4111-8111-111111111111', response: '92222222-2222-4222-8222-222222222222',
  user: '93333333-3333-4333-8333-333333333333', exploitation: '94444444-4444-4444-8444-444444444444',
  point: '95555555-5555-4555-8555-555555555555', meter: '96666666-6666-4666-8666-666666666666',
  secondMeter: '97777777-7777-4777-8777-777777777777', usage: '98888888-8888-4888-8888-888888888888', secondUsage: '98888888-8888-4888-8888-888888888889',
  collector: '99999999-9999-4999-8999-999999999999', declaration: '90000000-0000-4000-8000-000000000001'
}
const states = new Map()
const uses = [
  {id: campaignIds.usage, kind: 'SUB_USAGE', code: '2A', label: 'Aspersion', parent: {id: 'synthetic-irrigation', code: '2', label: 'Irrigation'}},
  {id: campaignIds.secondUsage, kind: 'SUB_USAGE', code: '2B', label: 'Goutte-à-goutte', parent: {id: 'synthetic-irrigation', code: '2', label: 'Irrigation'}}
]
const point = {id: campaignIds.point, name: 'Point synthétique', communeName: 'Commune de test'}
const preleveur = {userId: campaignIds.user, socialReason: 'Ferme synthétique', siret: '00000000000000', email: 'campaign@example.test', phoneNumber: '0000000000'}
const collecteur = {userId: campaignIds.collector, socialReason: 'Collecteur synthétique'}
const completeData = () => ({
  meters: [{compteurId: campaignIds.meter, serialNumber: 'SYNTH-M1', offSeason: {usageId: campaignIds.usage, indexStart: '10', indexEnd: '20', surface: '2', crops: 'Blé'}, season: {usageId: campaignIds.usage, indexEnd: '30', surface: '2', crops: 'Maïs'}}],
  needs: {season: {usageId: campaignIds.usage, flow: '4', volume: '120', surface: '3', crops: 'Blé'}, offSeason: {usageId: campaignIds.usage, flow: '2', volume: '40', surface: '2', crops: 'Maïs'}}, comment: 'Réponse envoyée'
})

export function isCampaignFixture(authorization) { return /^Bearer browser-test-campaign-/.test(authorization || '') }

export async function handleCampaignFixtureRequest(request, send, response) {
  const authorization = request.headers.authorization
  if (!isCampaignFixture(authorization)) return false
  const {pathname, searchParams} = new URL(request.url, 'http://127.0.0.1:3431')
  const admin = authorization.includes('-admin-')
  const collector = authorization.includes('-collector-')
  const role = admin ? 'ADMIN' : authorization.includes('-instructor-') ? 'INSTRUCTOR' : 'DECLARANT'
  const ended = authorization.includes('-ended-')
  if (!states.has(authorization)) states.set(authorization, {draft: null, submitted: collector || authorization.includes('-review-') ? completeData() : null, revision: 0, requests: [], name: 'Collecte synthétique', status: ended ? 'CLOSED' : admin ? 'DRAFT' : 'OPEN'})
  const state = states.get(authorization)
  const multiple = authorization.includes('-multiple-')
  const respond = (status, data) => { send(status, data); return true }
  const ok = data => respond(200, {success: true, data})
  const permissions = {canManage: admin, canReadResults: admin || collector, canRespond: !admin && !collector && !ended, canDelete: admin, canOpen: admin}
  const campaign = () => ({id: campaignIds.campaign, name: state.name, status: state.status, opensOn: '2026-09-01', closesOn: '2026-12-31', type: 'DROPT_INDEX_NEEDS_2026_2027', collecteurUserId: campaignIds.collector, collecteur, updatedAt: `2026-09-24T00:00:0${state.revision}Z`, exploitationIds: [campaignIds.exploitation], progress: {total: multiple ? 2 : 1, submitted: state.submitted ? 1 : 0, drafts: state.draft ? 1 : 0, remaining: (multiple ? 2 : 1) - (state.submitted ? 1 : 0)}, permissions})
  const item = () => ({id: campaignIds.response, campaignId: campaignIds.campaign, exploitationId: campaignIds.exploitation, revision: state.revision, preleveurUserId: campaignIds.user, exploitation: {id: campaignIds.exploitation, countingCode: '001'}, preleveur, point, countingCode: '001', status: state.submitted ? 'SUBMITTED' : state.draft ? 'DRAFT' : 'NOT_STARTED', hasDraft: Boolean(state.draft), firstSubmittedAt: state.submitted ? '2026-11-01' : null, lastSubmittedAt: state.submitted ? '2026-11-01' : null, publicationStatus: state.submitted ? 'PENDING_REVIEW' : null, publicationIssues: ['Le partage du compteur doit être vérifié.'], volumes: {offSeason: null, season: null, total: null, partial: true}, submittedData: state.submitted, draftData: collector ? null : state.draft})
  const context = () => ({campaign: campaign(), response: item(), exploitation: {id: campaignIds.exploitation, countingCode: '001', declarant: preleveur, pointPrelevement: point}, waterUses: uses, permissions: {...permissions, canEdit: !collector && !admin && !ended, canSubmit: !collector && !admin && !ended && !authorization.includes('-before-')}, meters: authorization.includes('-missing-') ? [] : [{compteurId: campaignIds.meter, serialNumber: 'SYNTH-M1'}, {compteurId: campaignIds.secondMeter, serialNumber: 'SYNTH-M2'}], data: collector ? state.submitted : state.draft || state.submitted, blockers: authorization.includes('-before-') ? ['Le bilan pourra être envoyé à partir du 31 octobre 2026. Vous pouvez enregistrer un brouillon.'] : []})

  if (pathname === '/info' || pathname === '/api/info') return respond(200, {role, declarantRole: collector ? 'COLLECTEUR' : 'PRELEVEUR', permissions: [], user: {id: campaignIds.user, email: 'campaign@example.test', socialReason: preleveur.socialReason}, expiresAt: new Date(Date.now() + 3_600_000).toISOString()})
  if (pathname === '/api/__campaign-requests') return respond(200, state.requests)
  if (pathname === '/api/dashboard/territory') return respond(200, {
    scope: 'DECLARANT', zones: [], selectedZoneCodes: [], metrics: {totalPoints: 1, usageDistribution: []},
    registeredPrelevements: {selectedPeriodType: 'month', selectedPeriod: '2026-09', periodOptions: [], byUsage: []},
    volumesByUsage: {selectedYear: 2026, yearOptions: [], charts: {}}
  })
  if (pathname === '/api/dashboard/map') return respond(200, {points: [], capabilities: {}})
  if (pathname === '/api/aggregated-series/options') return respond(200, {parameters: []})
  if (pathname === '/api/declarations/allowed-types') return respond(200, {data: [], meta: {canCreateDeclaration: true, canCreateQuickDeclaration: true}})
  if (pathname === `/api/declarations/${campaignIds.declaration}` || pathname === '/api/sources/synthetic-source') {
    const source = {id: 'synthetic-source', type: 'DECLARATION', status: 'COMPLETED', globalInstructionStatus: 'VALIDATED', metadata: {manualQuickDeclaration: true, measurementType: 'INDEX', collectionCampaignId: campaignIds.campaign, collectionResponseId: campaignIds.response}, chunks: [campaignIds.meter, campaignIds.secondMeter].map((compteurId, index) => ({
      id: `synthetic-chunk-${index}`, pointPrelevement: point, pointPrelevementId: point.id, exploitationId: campaignIds.exploitation, exploitation: {countingCode: '001'}, compteurId, metadata: {serialNumber: `SYNTH-M${index + 1}`, readingDate: '2026-10-31'}, usage: uses[0], flowType: 'PRELEVEMENT', minDate: '2026-10-31', maxDate: '2026-10-31',
      chunkValues: [{id: `synthetic-value-${index}`, value: 30 + index, metricTypeCode: 'index', unit: 'm³', periodStart: '2026-10-31', periodEnd: '2026-10-31', valueKind: 'DECLARED'}],
      latestIndexReadings: [{id: `synthetic-history-${index}`, value: 30 + index, metricTypeCode: 'index', unit: 'm³', periodStart: '2026-10-31', periodEnd: '2026-10-31', compteurId, serialNumber: `SYNTH-M${index + 1}`}]
    }))}
    const declaration = {id: campaignIds.declaration, code: 'SYNTH', type: 'quick-declaration', dataSourceType: 'MANUAL', createdAt: '2026-11-01', files: [], canReconcile: false}
    return ok(pathname.startsWith('/api/sources/') ? {...source, declaration} : {...declaration, source})
  }
  if (pathname === '/api/campaigns/summary') return ok({hasCampaigns: true, items: [campaign()]})
  if (pathname === '/api/campaigns/candidates') {
    const items = [{id: campaignIds.exploitation, point, preleveur, countingCode: '001', usage: {id: 'parent', code: '2', label: 'Irrigation'}}]
    return ok({items, total: 1, page: 1, pageSize: 25, collecteurs: [collecteur], usages: [], ...(searchParams.get('selectAll') === 'true' ? {selectedIds: [campaignIds.exploitation]} : {})})
  }
  if (pathname === `/api/campaigns/${campaignIds.campaign}/responses`) {
    const items = [item()]
    if (multiple) items.push({...item(), id: '92222222-2222-4222-8222-222222222223', exploitationId: '94444444-4444-4444-8444-444444444445', countingCode: '002'})
    return ok({items, total: items.length, page: 1, pageSize: 25})
  }
  if (pathname === `/api/campaigns/${campaignIds.campaign}/results`) return ok({items: state.submitted ? [item()] : [], total: state.submitted ? 1 : 0, page: 1, pageSize: 25, totals: {requestedSeasonVolume: 120, requestedOffSeasonVolume: 40, publishedVolumes: {offSeason: null, season: 0, total: 0, partial: true}}})
  if (pathname === `/api/campaigns/${campaignIds.campaign}/meters/${campaignIds.meter}/review`) return ok({compteurId: campaignIds.meter, serialNumber: 'SYNTH-M1', expectedHash: '1'.repeat(64), canApprove: true, contradictoryReadings: false, blockedReasons: [], beneficiaries: [
    {exploitationId: campaignIds.exploitation, responseId: campaignIds.response, countingCode: '001', preleveurName: preleveur.socialReason, pointName: point.name, submitted: true, inCampaign: true, meter: completeData().meters[0]},
    {exploitationId: campaignIds.point, responseId: null, countingCode: '002', preleveurName: 'Ferme hors campagne', pointName: point.name, submitted: false, inCampaign: false, meter: null}
  ]})
  if (pathname === `/api/campaigns/${campaignIds.campaign}/meters/${campaignIds.meter}/approve`) {
    const parts = []
    for await (const part of request) parts.push(part)
    state.requests.push({path: pathname, method: request.method, body: JSON.parse(Buffer.concat(parts).toString())})
    return ok({status: 'PUBLISHED', published: 2})
  }
  if (pathname === `/api/campaigns/${campaignIds.campaign}/export`) {
    state.requests.push({path: pathname, method: request.method})
    response.writeHead(200, {'Content-Type': 'text/csv; charset=utf-8'})
    response.end('\uFEFFPréleveur;Code comptage;Volume demandé\r\nFerme synthétique;001;120\r\n')
    return true
  }
  if (pathname.startsWith(`/api/campaigns/${campaignIds.campaign}/responses/`)) {
    if (!pathname.includes(campaignIds.response)) return respond(404, {message: 'Réponse introuvable.'})
    if (request.method === 'GET') return ok(context())
    const parts = []
    for await (const part of request) parts.push(part)
    const body = JSON.parse(Buffer.concat(parts).toString())
    state.requests.push({path: pathname, method: request.method, body})
    if (collector || admin) return respond(403, {message: 'Lecture seule.'})
    if (authorization.includes('-forbidden-')) return respond(403, {message: 'Droits insuffisants.'})
    if (authorization.includes('-conflict-')) return respond(409, {message: 'La réponse a été modifiée.'})
    if (authorization.includes('-closed-')) return respond(409, {code: 409, message: 'Cette campagne n’est pas ouverte à la saisie.'})
    if (authorization.includes('-invalid-')) return respond(400, {code: 400, message: 'Vérifiez les champs de la réponse.', data: {fields: {'meters.0.offSeason.indexStart': 'Le relevé du compteur doit être vérifié.'}}})
    if (body.revision !== state.revision) return respond(409, {message: 'Révision périmée.'})
    state.revision++
    if (pathname.endsWith('/submit')) { state.submitted = body.data; state.draft = null } else state.draft = body.data
    return ok(context())
  }
  if (pathname === '/api/campaigns' || pathname === `/api/campaigns/${campaignIds.campaign}`) {
    if (request.method === 'POST' || request.method === 'PATCH') {
      const parts = []
      for await (const part of request) parts.push(part)
      const body = JSON.parse(Buffer.concat(parts).toString())
      state.requests.push({path: pathname, method: request.method, body})
      state.name = body.name
      return ok(campaign())
    }
    return ok(pathname === '/api/campaigns' ? {items: [campaign()], total: 1, page: 1, pageSize: 25} : {campaign: campaign(), permissions})
  }
  return false
}
