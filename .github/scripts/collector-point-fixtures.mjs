export const collectorPointIds = {
  collector: '12121212-1212-4212-8212-121212121211',
  preleveur: '12121212-1212-4212-8212-121212121212',
  point: '12121212-1212-4212-8212-121212121213',
  created: '12121212-1212-4212-8212-121212121214',
  zone: '12121212-1212-4212-8212-121212121215',
  usage: '12121212-1212-4212-8212-121212121216',
  declarationType: '12121212-1212-4212-8212-121212121217',
  declarationTypeLink: '12121212-1212-4212-8212-121212121218',
  secondDeclarationType: '12121212-1212-4212-8212-121212121219'
}
const sessions = new Map()
const editableFields = ['usageName', 'coordinates', 'communeCode', 'communeName', 'geometryPrecision', 'waterBodyType',
  'nature', 'withdrawalType', 'locationDescription', 'comment', 'commissioningDate', 'depth', 'reservoirNominalVolume',
  'isWaterBodyConnectedToStream', 'isWaterBodyConnectedToGroundwater']
export const isCollectorPointFixture = (authorization = '') => authorization.startsWith('Bearer browser-test-collector-points-')

export async function handleCollectorPointFixture(request, send) {
  const auth = request.headers.authorization
  if (!isCollectorPointFixture(auth)) return false
  const {pathname} = new URL(request.url, 'http://127.0.0.1:3431')
  const enabled = !auth.includes('-disabled-')
  const admin = auth.includes('-admin-')
  const readOnly = auth.includes('-readonly-')
  const role = admin ? 'ADMIN' : readOnly ? 'INSTRUCTOR' : 'DECLARANT'
  const permissions = admin
    ? ['declarant.zone.update', 'declarant.invite', 'declarant.delete', 'declarant.declaration-type.read', 'declarant.declaration-type.update']
    : readOnly ? ['declarant.declaration-type.read'] : []
  const zone = {id: collectorPointIds.zone, code: 'dep-test', type: 'DEPARTEMENT', name: 'Territoire synthétique'}
  const state = sessions.get(auth) ?? {writes: [], management: {enabled: false, zoneIds: [zone.id], zones: [zone]},
    point: {id: collectorPointIds.point, name: 'PP-SYNTHETIQUE', usageName: 'Forage partagé',
      waterBodyType: 'SOUTERRAIN', flowType: 'PRELEVEMENT', pointKind: 'PHYSIQUE', nature: 'NAPPE',
      communeCode: '33353', communeName: 'Rimons',
      updatedAt: '2026-10-07T12:00:00.000Z', coordinates: {type: 'Point', coordinates: [2.2, 46.2]},
      declarants: [], preleveurs: [], collecteurs: [], usages: [],
      right: {canRead: true, canEdit: enabled, canEditUsageName: true, editScope: 'COLLECTOR',
        editableFields, canEditLocation: !auth.includes('-exception-'), isShared: true, permissions: []}}}
  sessions.set(auth, state)
  const readBody = async () => {
    const chunks = []
    for await (const chunk of request) chunks.push(chunk)
    return JSON.parse(Buffer.concat(chunks).toString())
  }
  const management = {enabled, zoneIds: [zone.id], zones: [zone]}
  const user = {id: admin || readOnly ? collectorPointIds.preleveur : collectorPointIds.collector,
    email: admin || readOnly ? 'agent@example.test' : 'collector@example.test', declarant: {declarantRole: 'COLLECTEUR'}}
  const declarationType = {id: collectorPointIds.declarationType, code: 'VOLUMES_ANNUELS',
    name: 'Déclaration annuelle des volumes prélevés', version: 1}
  const availableDeclarationTypes = [declarationType, {id: collectorPointIds.secondDeclarationType,
    code: 'RELEVES_COMPTEURS', name: 'Relevés de compteurs', version: 2}]
  state.declarationLinks ??= [{id: collectorPointIds.declarationTypeLink, declarationTypeId: declarationType.id,
    declarationType, status: 'ACTIVE', startDate: '2026-01-01', endDate: null}]
  const declarationTypesPath = `/api/declarants/${collectorPointIds.collector}/declaration-types`
  const declarationTypesPayload = () => ({data: state.declarationLinks, meta: {canManage: admin, availableDeclarationTypes}})
  if (pathname === '/info' || pathname === '/api/info') send(200, {role, user, declarantRole: 'COLLECTEUR', permissions, expiresAt: new Date(Date.now() + 3600000).toISOString()})
  else if (pathname === '/api/__collector-point-writes') send(200, state.writes)
  else if (pathname === '/api/collecteurs/me/point-management') send(200, management)
  else if (pathname === '/api/collecteurs/me/point-management/preleveurs') send(200, [{id: collectorPointIds.preleveur, socialReason: 'Préleveur synthétique', declarantType: 'LEGAL_PERSON', preleveurType: 'IRRIGANT'}])
  else if (pathname === `/api/collecteurs/${collectorPointIds.collector}/point-management`) {
    if (request.method === 'PATCH') {
      const body = await readBody()
      state.writes.push({path: pathname, body})
      state.management = {...body, zones: body.zoneIds.length ? [zone] : []}
    }
    send(200, state.management)
  } else if (pathname === '/api/collecteurs/me/points-prelevement') {
    const body = await readBody()
    state.writes.push({path: pathname, body})
    if (!enabled) send(403, {message: 'Gestion désactivée.'})
    else {
      state.point = {...state.point, ...body.point, id: collectorPointIds.created}
      send(201, {point: state.point, preleveurId: body.preleveurId ?? collectorPointIds.preleveur,
        exploitationId: collectorPointIds.usage, replayed: false, notification: {status: body.notifyAccountCreation ? 'failed' : 'not_requested'}})
    }
  } else if (pathname === '/api/points-prelevement/options') send(200, [state.point])
  else if (pathname === '/api/referentiels/usages-eau') send(200, {items: hierarchicalWaterUses.map(usage => usage.id === usageIds.root
    ? {...usage, id: collectorPointIds.usage, children: usage.children.map(child => ({...child, parentId: collectorPointIds.usage}))} : usage)})
  else if (pathname === '/api/referentiels/communes') send(200, [{code: '33353', name: 'Rimons'}])
  else if (pathname === `/api/declarants/${collectorPointIds.collector}/overview`) send(200, {
    id: collectorPointIds.collector, role: 'DECLARANT', email: 'collector@example.test', socialReason: 'Collecteur synthétique', declarantRole: 'COLLECTEUR',
    declarant: {declarantRole: 'COLLECTEUR'}, right: {canRead: true, permissions}
  })
  else if (pathname === declarationTypesPath || pathname.startsWith(`${declarationTypesPath}/`)) {
    if (request.method === 'GET') send(200, declarationTypesPayload())
    else {
      const body = request.method === 'DELETE' ? null : await readBody()
      state.writes.push({path: pathname, method: request.method, body})
      if (!admin) send(403, {message: 'Droits insuffisants.'})
      else if (auth.includes('-type-error-')) send(409, {message: 'Une autorisation existe déjà sur cette période.'})
      else {
        const linkId = pathname.slice(declarationTypesPath.length + 1)
        if (request.method === 'DELETE') state.declarationLinks = state.declarationLinks.filter(link => link.id !== linkId)
        else {
          const link = {...body, id: linkId || collectorPointIds.secondDeclarationType, status: 'ACTIVE',
            declarationType: availableDeclarationTypes.find(type => type.id === body.declarationTypeId)}
          if (request.method === 'POST') state.declarationLinks.push(link)
          else state.declarationLinks = state.declarationLinks.map(previous => previous.id === linkId ? link : previous)
        }
        send(request.method === 'POST' ? 201 : 200, declarationTypesPayload())
      }
    }
  }
  else if (pathname.startsWith(`/api/declarants/${collectorPointIds.collector}`) && !['GET', 'HEAD'].includes(request.method)) {
    const body = ['POST', 'PUT', 'PATCH'].includes(request.method) && !pathname.endsWith('/notifications/account-creation')
      ? await readBody() : null
    state.writes.push({path: pathname, method: request.method, body})
    send(409, {message: 'Cette action ne doit pas être confirmée dans ce scénario de consultation.'})
  }
  else if (pathname === `/api/declarants/${collectorPointIds.collector}/zones`) send(200, {items: [{zoneId: zone.id, zone}]})
  else if (pathname === '/api/zones/options') send(200, [zone])
  else if (pathname.startsWith('/api/points-prelevement/')) {
    if (pathname.endsWith('/exploitations')) send(200, [])
    else if (request.method === 'PUT') {
      const body = await readBody()
      state.writes.push({path: pathname, body})
      if (auth.includes('-conflict-')) send(409, {message: 'Ce point a été modifié depuis son ouverture. Rechargez la fiche avant de réessayer.'})
      else {state.point = {...state.point, ...body}; send(200, state.point)}
    } else send(200, state.point)
  } else return false
  return true
}
import {hierarchicalWaterUses, usageIds} from './exploitation-usages-fixtures.mjs'
