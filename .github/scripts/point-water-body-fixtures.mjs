// Synthetic point records, isolated by browser session; no real API or database.
export const pointWaterBodyIds = {
  existing: '99999999-9999-4999-8999-999999999991',
  created: '99999999-9999-4999-8999-999999999992',
  empty: '99999999-9999-4999-8999-999999999993',
  otherOrigin: '99999999-9999-4999-8999-999999999994'
}
const sessions = new Map()

export function getPointWaterBodyFixtureRole(authorization = '') {
  return /^Bearer browser-test-water-body-(?:edit|readonly)-/.test(authorization) ? 'INSTRUCTOR' : null
}

function createSession(authorization) {
  const canEdit = authorization.includes('-edit-')
  const base = {
    name: 'Retenue synthétique', flowType: 'PRELEVEMENT', pointKind: 'PHYSIQUE',
    waterBodyType: 'SUPERFICIELLE', nature: 'PLAN_EAU',
    coordinates: {type: 'Point', coordinates: [2.2, 46.2]},
    isWaterBodyConnectedToStream: false, isWaterBodyConnectedToGroundwater: null,
    right: {canEdit, permissions: canEdit ? ['pp.update'] : []}
  }
  const existing = {
    ...base, id: pointWaterBodyIds.existing,
    reservoirNominalVolume: 0.5,
    waterBodyIdentifier: `PE-${'IDENTIFIANT-SYNTHETIQUE-'.repeat(4)}`
  }
  return {
    requests: [],
    points: new Map([
      [existing.id, existing],
      [pointWaterBodyIds.empty, {...base, id: pointWaterBodyIds.empty, reservoirNominalVolume: null, waterBodyIdentifier: null}],
      [pointWaterBodyIds.otherOrigin, {...existing, id: pointWaterBodyIds.otherOrigin, nature: 'COURS_EAU'}]
    ])
  }
}

export async function handlePointWaterBodyFixtureRequest(request, send) {
  const authorization = request.headers.authorization
  const role = getPointWaterBodyFixtureRole(authorization)
  if (!role) return false
  const {pathname} = new URL(request.url, 'http://127.0.0.1:3431')
  const state = sessions.get(authorization) ?? createSession(authorization)
  sessions.set(authorization, state)
  const canEdit = authorization.includes('-edit-')

  if (pathname === '/info' || pathname === '/api/info') {
    send(200, {
      role, permissions: canEdit ? ['pp.create', 'pp.update'] : [],
      user: {id: pointWaterBodyIds.existing, email: 'water-body@example.test'},
      expiresAt: new Date(Date.now() + 3_600_000).toISOString()
    })
  } else if (pathname === '/api/__water-body-requests') {
    send(200, state.requests)
  } else if (pathname === '/api/points-prelevement' && request.method === 'POST') {
    if (!canEdit) {
      send(403, {message: 'Droits insuffisants'})
      return true
    }
    const parts = []
    for await (const part of request) parts.push(part)
    const body = JSON.parse(Buffer.concat(parts).toString())
    state.requests.push({method: request.method, body})
    const point = {...body, id: pointWaterBodyIds.created, right: {canEdit: true, permissions: ['pp.update']}}
    state.points.set(point.id, point)
    send(201, point)
  } else if (pathname.startsWith('/api/points-prelevement/') && state.points.has(pathname.split('/').at(-1))) {
    const id = pathname.split('/').at(-1)
    if (request.method === 'PUT') {
      if (!canEdit) {
        send(403, {message: 'Droits insuffisants'})
        return true
      }
      const parts = []
      for await (const part of request) parts.push(part)
      const body = JSON.parse(Buffer.concat(parts).toString())
      state.requests.push({method: request.method, body})
      // Preserve exactly what the front submits: do not hide missing null resets.
      state.points.set(id, {...state.points.get(id), ...body})
    }
    send(200, state.points.get(id))
  } else if (pathname.startsWith('/api/audit-history/')) {
    send(200, {data: [], meta: {total: 0}})
  } else {
    return false
  }
  return true
}
