export const collectorPointIds = {
  collector: '12121212-1212-4212-8212-121212121211',
  preleveur: '12121212-1212-4212-8212-121212121212',
  point: '12121212-1212-4212-8212-121212121213',
  created: '12121212-1212-4212-8212-121212121214',
  zone: '12121212-1212-4212-8212-121212121215',
  usage: '12121212-1212-4212-8212-121212121216',
  declarationType: '12121212-1212-4212-8212-121212121217',
  declarationTypeLink: '12121212-1212-4212-8212-121212121218',
  secondDeclarationType: '12121212-1212-4212-8212-121212121219',
  firstExploitation: '12121212-1212-4212-8212-121212121221',
  secondExploitation: '12121212-1212-4212-8212-121212121222',
  manualMeter: '12121212-1212-4212-8212-121212121231',
  sharedMeter: '12121212-1212-4212-8212-121212121232',
  externalMeter: '12121212-1212-4212-8212-121212121233',
  historicalMeter: '12121212-1212-4212-8212-121212121234',
  campaign: '12121212-1212-4212-8212-121212121241',
  secondCampaign: '12121212-1212-4212-8212-121212121242',
  response: '12121212-1212-4212-8212-121212121243'
}
const sessions = new Map()
const editableFields = ['usageName', 'coordinates', 'communeCode', 'communeName', 'geometryPrecision', 'waterBodyType',
  'nature', 'withdrawalType', 'locationDescription', 'comment', 'commissioningDate', 'depth', 'reservoirNominalVolume',
  'isWaterBodyConnectedToStream', 'isWaterBodyConnectedToGroundwater', 'waterAgencyInternalIdentifier', 'waterBodyIdentifier']
export const isCollectorPointFixture = (authorization = '') => authorization.startsWith('Bearer browser-test-collector-points-')

export async function handleCollectorPointFixture(request, send) {
  const auth = request.headers.authorization
  if (!isCollectorPointFixture(auth)) return false
  const {pathname, searchParams} = new URL(request.url, 'http://127.0.0.1:3431')
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
      right: {canRead: true, canEdit: enabled, canCreateExploitation: enabled, canEditUsageName: true, editScope: enabled ? 'COLLECTOR' : undefined,
        editableFields, canEditLocation: !auth.includes('-exception-'), isShared: true, permissions: []}}}
  sessions.set(auth, state)
  state.exploitations ??= auth.includes('-multi-') ? [
    {id: collectorPointIds.firstExploitation, countingCode: '001', preleveur: {id: collectorPointIds.preleveur, socialReason: 'Ferme synthétique A'},
      usage: {id: collectorPointIds.usage, label: 'Irrigation'}, capabilities: {canEditCountingCode: true, canAddMeter: true},
      meters: [{id: collectorPointIds.manualMeter, serialNumber: '000MANUEL', updatedAt: '2026-10-07T12:00:00.000Z', capabilities: {canEditSerialNumber: true, reason: null}},
        {id: collectorPointIds.sharedMeter, serialNumber: 'PARTAGE', updatedAt: '2026-10-07T12:00:00.000Z', capabilities: {canEditSerialNumber: false, reason: 'SHARED_METER'}}]},
    {id: collectorPointIds.secondExploitation, countingCode: '002', preleveur: {id: collectorPointIds.preleveur, firstName: 'Camille', lastName: 'Test'},
      usage: {id: collectorPointIds.usage, label: 'Irrigation'}, capabilities: {canEditCountingCode: true, canAddMeter: true},
      meters: [{id: collectorPointIds.externalMeter, serialNumber: 'FOURNISSEUR', updatedAt: '2026-10-07T12:00:00.000Z', capabilities: {canEditSerialNumber: false, reason: 'EXTERNAL_METER'}},
        {id: collectorPointIds.historicalMeter, serialNumber: 'HISTORIQUE', updatedAt: '2026-10-07T12:00:00.000Z', capabilities: {canEditSerialNumber: false, reason: 'AMBIGUOUS_HISTORY'}}]}
  ] : []
  const readBody = async () => {
    const chunks = []
    for await (const chunk of request) chunks.push(chunk)
    return JSON.parse(Buffer.concat(chunks).toString())
  }
  const management = {enabled, zoneIds: [zone.id], zones: [zone]}
  const user = {id: admin || readOnly ? collectorPointIds.preleveur : collectorPointIds.collector,
    email: admin || readOnly ? 'agent@example.test' : 'collector@example.test',
    ...(role === 'DECLARANT' ? {declarantRole: 'COLLECTEUR'} : {})}
  const declarationType = {id: collectorPointIds.declarationType, code: 'VOLUMES_ANNUELS',
    name: 'Déclaration annuelle des volumes prélevés', version: 1}
  const availableDeclarationTypes = [declarationType, {id: collectorPointIds.secondDeclarationType,
    code: 'RELEVES_COMPTEURS', name: 'Relevés de compteurs', version: 2}]
  state.declarationLinks ??= [{id: collectorPointIds.declarationTypeLink, declarationTypeId: declarationType.id,
    declarationType, status: 'ACTIVE', startDate: '2026-01-01', endDate: null}]
  const declarationTypesPath = `/api/declarants/${collectorPointIds.collector}/declaration-types`
  const declarationTypesPayload = () => ({data: state.declarationLinks, meta: {canManage: admin, availableDeclarationTypes}})
  const decorateExploitation = exploitation => ({...exploitation, status: exploitation.status || 'EN_ACTIVITE', secondaryUsages: [],
    declarant: {...exploitation.preleveur, declarantRole: 'PRELEVEUR'}, pointPrelevement: state.point,
    right: {canRead: true, canEdit: false, canEditCollectorDetails: enabled, permissions: []}})
  state.contactDetails ??= {phoneNumber: '0600000000', addressLine1: '1 rue du Test', addressLine2: null, poBox: null,
    postalCode: '33000', city: 'Bordeaux', contactEmails: [{email: 'contact@example.test', isPrimary: true}]}
  state.participations ??= {}
  state.campaignOptionReads ??= []
  const campaigns = [{id: collectorPointIds.campaign, name: 'Volumes 2026', eligible: enabled},
    ...(auth.includes('-campaign-multiple-') ? [{id: collectorPointIds.secondCampaign, name: 'Besoins 2027', eligible: enabled}] : [])]
  if (pathname === '/info' || pathname === '/api/info') send(200, {role, user,
    ...(role === 'DECLARANT' ? {} : {permissions}), expiresAt: new Date(Date.now() + 3600000).toISOString()})
  else if (pathname === '/api/__collector-point-writes') send(200, state.writes)
  else if (pathname === '/api/__collector-campaign-option-reads') send(200, state.campaignOptionReads)
  else if (pathname === '/api/collecteurs/me/point-management') {
    if (auth.includes('-management-error-')) send(503, {message: 'Autorisation indisponible.'})
    else send(200, management)
  }
  else if (pathname === '/api/collecteurs/me/campaign-participation-options') {
    const exploitationId = searchParams.get('exploitationId')
    state.campaignOptionReads.push(exploitationId)
    send(200, {campaigns: auth.includes('-no-campaign-') ? [] : campaigns.map(campaign => {
      const responseId = state.participations[`${campaign.id}:${exploitationId}`]
        || (auth.includes('-existing-response-') && exploitationId ? collectorPointIds.response : null)
      return {...campaign, ...(responseId ? {responseId, responseStatus: 'DRAFT', eligible: false} : {})}
    })})
  }
  else if (/^\/api\/campaigns\/[^/]+\/responses$/.test(pathname) && request.method === 'POST') {
    const body = await readBody()
    state.writes.push({path: pathname, method: 'POST', body})
    if (auth.includes('-campaign-closed-')) send(409, {message: 'Cette campagne est fermée.'})
    else {
      const campaignId = pathname.split('/')[3]
      const key = `${campaignId}:${body.exploitationId}`
      const created = !state.participations[key]
      state.participations[key] = collectorPointIds.response
      send(201, {campaignParticipation: {campaignId, responseId: collectorPointIds.response, created}})
    }
  }
  else if (pathname === '/api/collecteurs/me/preleveurs/search') send(200, {items: [{id: collectorPointIds.preleveur,
    socialReason: 'Préleveur synthétique', declarantRole: 'PRELEVEUR', declarantType: 'LEGAL_PERSON', preleveurType: 'IRRIGANT'}],
  total: 1, page: 1, pageSize: 10, totalPages: 1, facets: {}})
  else if (pathname === `/api/declarants/${collectorPointIds.preleveur}/overview`) send(200, {
    id: collectorPointIds.preleveur, role: 'DECLARANT', socialReason: 'Préleveur synthétique', declarantRole: 'PRELEVEUR',
    declarantType: 'LEGAL_PERSON', preleveurType: 'IRRIGANT', ...state.contactDetails,
    pointPrelevements: state.exploitations.map(decorateExploitation), right: {canRead: true, canEditContactDetails: enabled && !auth.includes('-historical-'), permissions: []}
  })
  else if (pathname === `/api/collecteurs/me/preleveurs/${collectorPointIds.preleveur}/contact-details`) {
    if (!enabled) send(403, {message: 'Gestion désactivée.'})
    else if (request.method === 'PATCH') {
      const body = await readBody()
      state.writes.push({path: pathname, method: 'PATCH', body})
      if (auth.includes('-conflict-')) send(409, {message: 'Les coordonnées ont été modifiées. Rechargez la fiche.'})
      else {
        state.contactDetails = {...state.contactDetails, ...body.details}
        send(200, {preleveurId: collectorPointIds.preleveur, details: state.contactDetails, version: 'contacts-2', capabilities: {canEdit: true}})
      }
    } else send(200, {preleveurId: collectorPointIds.preleveur, details: state.contactDetails, version: 'contacts-1', capabilities: {canEdit: true}})
  }
  else if (/^\/api\/collecteurs\/me\/exploitations\/[^/]+\/form$/.test(pathname)) {
    const exploitation = state.exploitations.find(item => item.id === pathname.split('/')[5])
    if (!enabled || !exploitation) send(403, {message: 'Exploitation non modifiable.'})
    else {
      if (request.method === 'PATCH') {
        const body = await readBody()
        state.writes.push({path: pathname, method: 'PATCH', body})
        if (auth.includes('-pending-campaign-')) {
          send(409, {message: 'Terminez le formulaire de campagne avant de clôturer cette exploitation.', pendingCampaignResponses: [
            {campaignId: collectorPointIds.campaign, responseId: collectorPointIds.response, campaignName: 'Volumes 2026'}
          ]})
          return true
        }
        Object.assign(exploitation, body.changes)
      }
      send(200, {exploitation: decorateExploitation(exploitation), meters: exploitation.meters, version: 'exploitation-version', capabilities: {canEdit: true, canAddMeter: true}})
    }
  }
  else if (/^\/api\/exploitations\/[^/]+$/.test(pathname)) {
    const exploitation = state.exploitations.find(item => item.id === pathname.split('/')[3])
    if (exploitation) send(200, decorateExploitation(exploitation))
    else send(404, {message: 'Exploitation introuvable.'})
  }
  else if (/^\/api\/exploitations\/[^/]+\/meter-allocations$/.test(pathname)) send(200, {meterAllocations: []})
  else if (pathname === '/api/aggregated-series/options') send(200, {parameters: []})
  else if (pathname === '/api/points-prelevement/batch') send(200, [state.point])
  else if (pathname.endsWith('/documents') || pathname.endsWith('/regles')) send(200, [])
  else if (pathname === '/api/collecteurs/me/point-management/preleveurs') send(200, [{id: collectorPointIds.preleveur, socialReason: 'Préleveur synthétique', declarantType: 'LEGAL_PERSON', preleveurType: 'IRRIGANT'}])
  else if (pathname === `/api/collecteurs/${collectorPointIds.collector}/point-management`) {
    if (request.method === 'PATCH') {
      const body = await readBody()
      state.writes.push({path: pathname, body})
      state.management = {...body, zones: body.zoneIds.length ? [zone] : []}
    }
    send(200, state.management)
  } else if (pathname === '/api/collecteurs/me/points-prelevement' || pathname === `/api/collecteurs/me/points-prelevement/${collectorPointIds.point}/exploitations`) {
    const body = await readBody()
    state.writes.push({path: pathname, body})
    if (!enabled) send(403, {message: 'Gestion désactivée.'})
    else if (auth.includes('-campaign-closed-') && body.campaignId) send(409, {message: 'Cette campagne est fermée. Choisissez une autre campagne ou décochez son ajout.'})
    else {
      state.point = {...state.point, ...body.point, id: body.point ? collectorPointIds.created : collectorPointIds.point}
      const result = {point: state.point, preleveurId: body.preleveurId ?? collectorPointIds.preleveur,
        exploitationId: collectorPointIds.firstExploitation, replayed: false, notification: {status: body.notifyAccountCreation ? 'failed' : 'not_requested'},
        ...(body.campaignId ? {campaignParticipation: {campaignId: body.campaignId, responseId: collectorPointIds.response, created: true}} : {})}
      if (auth.includes('-retry-') && !state.uncertainCreation) {
        state.uncertainCreation = result
        send(503, {message: 'La réponse a été interrompue.'})
      } else send(201, state.uncertainCreation || result)
    }
  } else if (pathname === `/api/collecteurs/me/points-prelevement/${state.point.id}/form`) {
    if (!enabled) send(403, {message: 'Gestion désactivée.'})
    else if (auth.includes('-form-error-')) send(503, {message: 'Formulaire indisponible.'})
    else if (request.method === 'GET') send(200, {point: state.point, exploitations: state.exploitations})
    else if (request.method === 'PATCH') {
      const body = await readBody()
      state.writes.push({path: pathname, method: 'PATCH', body})
      if (auth.includes('-conflict-')) send(409, {message: 'Ce point a été modifié depuis son ouverture. Rechargez la fiche avant de réessayer.'})
      else {
        state.point = {...state.point, ...body.point, updatedAt: '2026-10-07T13:00:00.000Z'}
        for (const changes of body.exploitations) {
          const exploitation = state.exploitations.find(item => item.id === changes.id)
          if (Object.hasOwn(changes, 'countingCode')) exploitation.countingCode = changes.countingCode
          for (const meter of changes.meters ?? []) {
            if (meter.id) Object.assign(exploitation.meters.find(item => item.id === meter.id), {serialNumber: meter.serialNumber})
            else exploitation.meters.push({...meter, id: `created-${exploitation.meters.length}`, updatedAt: state.point.updatedAt, capabilities: {canEditSerialNumber: true, reason: null}})
          }
        }
        send(200, {point: state.point, exploitations: state.exploitations})
      }
    } else send(405, {message: 'Méthode interdite.'})
  } else if (pathname === '/api/points-prelevement/options') send(200, [state.point])
  else if (pathname === '/api/points-prelevement/map') send(200, [{...state.point, canReadDetail: !auth.includes('-map-restricted-')}])
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
    if (pathname.endsWith('/exploitations')) {
      if (auth.includes('-list-error-')) send(503, {message: 'Liste indisponible.'})
      else send(200, state.exploitations.map(exploitation => ({
        ...exploitation,
        status: 'EN_ACTIVITE',
        declarant: exploitation.preleveur,
        pointPrelevement: state.point,
        right: {canRead: true, canEdit: false, permissions: []}
      })))
    }
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
