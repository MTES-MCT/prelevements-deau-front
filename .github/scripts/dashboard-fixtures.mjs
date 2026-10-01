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
  const periodType = parameters.get('periodType') || 'month'
  const period = parameters.get('period') || (periodType === 'week' ? '2026-W39' : '2026-09')
  const year = Number(parameters.get('year')) || 2026
  const usage = {id: 'synthetic-irrigation', code: '2', label: 'Irrigation'}
  const volume = year === 2026 ? 20 : 10
  const waterBodyTypes = parameters.get('waterBodyTypes')

  const result = {
    scope: role === 'DECLARANT' ? 'DECLARANT' : 'ADMIN',
    zones,
    selectedZoneCodes,
    unknownZoneCodes: [],
    metrics: {totalPoints, usageDistribution: []},
    registeredPrelevements: {
      selectedPeriodType: periodType,
      selectedPeriod: period,
      periodOptions: periodType === 'week'
        ? [{value: '2026-W39', label: 'Semaine 39'}, {value: '2026-W38', label: 'Semaine 38'}]
        : [{value: '2026-09', label: 'Septembre 2026'}, {value: '2026-08', label: 'Août 2026'}],
      byUsage: [{
        usage,
        totalPointsCount: totalPoints,
        declaredPointsCount: selectedZoneCodes.length * 2,
        missingPointsCount: selectedZoneCodes.length * 8
      }]
    },
    volumesByUsage: {
      selectedYear: year,
      yearOptions: [2026, 2025],
      selectedWaterBodyTypes: waterBodyTypes === '__none__' ? [] : waterBodyTypes?.split(',') ?? ['SUPERFICIELLE', 'SOUTERRAIN', 'TRANSITION'],
      charts: {withdrawn: {
        key: 'withdrawn', title: 'Volumes prélevés par usage', unit: 'm³',
        usages: [{usage, total: volume, hasData: true}],
        months: [{monthKey: `${year}-01`, shortLabel: 'Janv.', label: `Janvier ${year}`, usages: [{usage, volume}]}]
      }}
    }
  }
  const sections = parameters.get('sections')?.split(',')
  if (sections) {
    for (const section of ['metrics', 'registeredPrelevements', 'volumesByUsage']) {
      if (!sections.includes(section)) delete result[section]
    }
  }
  return result
}

function waterResources(pathname, enabled) {
  if (!enabled || !pathname.endsWith('/flows')) return {stations: [], warnings: []}
  return {
    source: 'Source synthétique', warnings: [],
    stations: [{
      id: 'synthetic-flow', type: 'FLOW_STATION', label: 'Station synthétique du Dropt', stationCode: 'SYNTHETIC001',
      coordinates: {type: 'Point', coordinates: [0.3, 44.7]}, zones: [], latestObservationAt: '2026-09-15T06:00:00Z',
      values: [
        {at: '2026-09-15T00:00:00Z', valueLitersPerSecond: 100, granularity: 'INSTANTANEOUS'},
        {at: '2026-09-15T06:00:00Z', valueLitersPerSecond: 120, granularity: 'INSTANTANEOUS'}
      ]
    }]
  }
}

export async function handleDashboardFixtureRequest(request, send) {
  const role = getDashboardFixtureRole(request.headers.authorization)
  if (!role) return false
  const url = new URL(request.url, 'http://127.0.0.1:3431')
  const {pathname} = url
  const state = sessions.get(request.headers.authorization) ?? {requests: [], allRequests: [], stations: false, holdNext: false, release: null}
  sessions.set(request.headers.authorization, state)
  if (pathname.startsWith('/api/dashboard/') || pathname === '/api/campaigns/summary') state.allRequests.push({pathname, parameters: Object.fromEntries(url.searchParams)})

  if (pathname === '/info' || pathname === '/api/info') {
    send(200, {
      role, declarantRole: role === 'DECLARANT' ? 'PRELEVEUR' : null,
      permissions: ['zone.dashboard.read'],
      user: {id: '11111111-1111-4111-8111-111111111111', firstName: 'Camille', email: 'dashboard@example.test', declarantRole: role === 'DECLARANT' ? 'PRELEVEUR' : null},
      expiresAt: new Date(Date.now() + 3_600_000).toISOString()
    })
  } else if (pathname === '/api/__dashboard-requests') {
    send(200, url.searchParams.has('all') ? state.allRequests : state.requests)
  } else if (pathname === '/api/__dashboard-control' && request.method === 'POST') {
    const chunks = []
    for await (const chunk of request) chunks.push(chunk)
    const command = JSON.parse(Buffer.concat(chunks).toString())
    if (command.holdNext) state.holdNext = true
    if (command.holdStatistics) state.holdStatistics = true
    if (command.holdCampaign) state.holdCampaign = true
    if (command.releaseCampaign && state.releaseCampaign) state.releaseCampaign()
    if (typeof command.stations === 'boolean') state.stations = command.stations
    if (command.releaseStatus && state.release) state.release(command.releaseStatus)
    send(200, {ok: true})
  } else if (pathname === '/api/dashboard/territory') {
    state.requests.push(Object.fromEntries(url.searchParams))
    let status = 200
    if (state.holdNext || (state.holdStatistics && url.searchParams.get('sections') === 'registeredPrelevements,volumesByUsage')) {
      state.holdNext = false
      state.holdStatistics = false
      const pending = Promise.withResolvers()
      state.release = pending.resolve
      status = await pending.promise
      state.release = null
    }
    send(status, status === 200 ? createDashboard(role, url.searchParams) : {message: 'Erreur synthétique de chargement du territoire'})
  } else if (pathname === '/api/dashboard/map') {
    send(200, {points: [], capabilities: {}})
  } else if (pathname.startsWith('/api/dashboard/water-resources/')) {
    send(200, waterResources(pathname, state.stations))
  } else if (pathname === '/api/campaigns/summary') {
    if (state.holdCampaign) {
      state.holdCampaign = false
      const pending = Promise.withResolvers()
      state.releaseCampaign = pending.resolve
      await pending.promise
      state.releaseCampaign = null
    }
    send(200, {success: true, data: {hasCampaigns: false, items: []}})
  } else if (pathname === '/api/declarations/allowed-types') {
    send(200, {data: [], meta: {canCreateDeclaration: false, canCreateQuickDeclaration: false}})
  } else if (pathname === '/api/aggregated-series/options') {
    send(200, {parameters: []})
  } else {
    return false
  }

  return true
}
