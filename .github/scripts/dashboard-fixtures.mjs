// Isolated synthetic dashboard API: no database or external requests.
const sessions = new Map()
const zones = [
  {code: 'DEP-33', type: 'DEPARTEMENT', name: 'Gironde'},
  {code: 'DEP-47', type: 'DEPARTEMENT', name: 'Lot-et-Garonne'},
  {code: 'SAGE-DROPT', type: 'SAGE', name: 'Dropt'}
]

export function getDashboardFixtureRole(authorization = '') {
  const role = /^Bearer browser-test-dashboard-(admin|declarant)-/.exec(authorization)?.[1]
  return role?.toUpperCase() ?? null
}

function createDashboard(role, parameters) {
  const requested = parameters.get('zones')?.split(',') ?? ['DEP-33']
  const selectedZoneCodes = zones.map(zone => zone.code).filter(code => requested.includes(code))
  const totalPoints = selectedZoneCodes.length * 10

  return {
    scope: role === 'DECLARANT' ? 'DECLARANT' : 'ADMIN',
    zones,
    selectedZoneCodes,
    metrics: {totalPoints, usageDistribution: []},
    registeredPrelevements: {
      selectedPeriodType: 'month',
      selectedPeriod: '2026-09',
      periodOptions: [{value: '2026-09', label: 'Septembre 2026'}],
      byUsage: [{
        usage: {id: 'synthetic-irrigation', code: '2', label: 'Irrigation'},
        totalPointsCount: totalPoints,
        declaredPointsCount: selectedZoneCodes.length * 2,
        missingPointsCount: selectedZoneCodes.length * 8
      }]
    },
    volumesByUsage: {
      selectedYear: 2026,
      yearOptions: [{value: 2026, label: '2026'}],
      selectedWaterBodyTypes: ['SUPERFICIELLE', 'SOUTERRAIN', 'TRANSITION'],
      charts: {}
    }
  }
}

export async function handleDashboardFixtureRequest(request, send) {
  const role = getDashboardFixtureRole(request.headers.authorization)
  if (!role) return false
  const url = new URL(request.url, 'http://127.0.0.1:3431')
  const {pathname} = url
  const state = sessions.get(request.headers.authorization) ?? {requests: [], holdNext: false, release: null}
  sessions.set(request.headers.authorization, state)

  if (pathname === '/info' || pathname === '/api/info') {
    send(200, {
      role, declarantRole: role === 'DECLARANT' ? 'PRELEVEUR' : null,
      permissions: ['zone.dashboard.read'],
      user: {id: '11111111-1111-4111-8111-111111111111', firstName: 'Camille', email: 'dashboard@example.test', declarantRole: role === 'DECLARANT' ? 'PRELEVEUR' : null},
      expiresAt: new Date(Date.now() + 3_600_000).toISOString()
    })
  } else if (pathname === '/api/__dashboard-requests') {
    send(200, state.requests)
  } else if (pathname === '/api/__dashboard-control' && request.method === 'POST') {
    const chunks = []
    for await (const chunk of request) chunks.push(chunk)
    const command = JSON.parse(Buffer.concat(chunks).toString())
    if (command.holdNext) state.holdNext = true
    if (command.releaseStatus && state.release) state.release(command.releaseStatus)
    send(200, {ok: true})
  } else if (pathname === '/api/dashboard/territory') {
    state.requests.push(Object.fromEntries(url.searchParams))
    let status = 200
    if (state.holdNext) {
      state.holdNext = false
      const pending = Promise.withResolvers()
      state.release = pending.resolve
      status = await pending.promise
      state.release = null
    }
    send(status, status === 200 ? createDashboard(role, url.searchParams) : {message: 'Erreur synthétique de chargement du territoire'})
  } else if (pathname === '/api/dashboard/map') {
    send(200, {points: [], capabilities: {}})
  } else if (pathname.startsWith('/api/dashboard/water-resources/')) {
    send(200, {stations: [], warnings: []})
  } else if (pathname === '/api/declarations/allowed-types') {
    send(200, {data: [], meta: {canCreateDeclaration: false, canCreateQuickDeclaration: false}})
  } else if (pathname === '/api/aggregated-series/options') {
    send(200, {parameters: []})
  } else {
    return false
  }

  return true
}
