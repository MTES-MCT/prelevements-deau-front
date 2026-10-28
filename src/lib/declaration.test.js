import test from 'ava'

import {
  buildDeclarationViewFromSource,
  getDeclarationAdminCapabilities,
  getDeclarationMapPoints,
  isMeterTelemetrySource,
  formatFullAddress,
  getDeclarationEntryKind,
  getDeclarationDisplayStatus,
  getDeclarationProcessingStatus,
  getPointsPrelevementIdsFromDeclaration,
  getPointsPrelevementIdsFromSource,
  getSourcePeriod,
  getSourcePeriodLabel,
  getSourceReadingDateLabel,
  getTelemetrySourceTitle,
  isDeclarationTreatmentPending,
  isManualQuickDeclarationSource,
  isPointReconciliationRelevant,
  isTelemetrySource,
  shouldLoadAvailablePointsForDeclaration
} from './declaration.js'

test('les télérelèves compteur restent en lecture seule même pour un administrateur', t => {
  const declaration = {id: 'declaration', files: [{id: 'file'}]}
  const source = {type: 'API', metadata: {calculationStrategy: 'METER'}, declaration}
  t.true(isMeterTelemetrySource(source))
  t.deepEqual(getDeclarationAdminCapabilities(source, 'ADMIN'), {canDelete: false, canReplay: false})
  t.deepEqual(getDeclarationAdminCapabilities({declaration, readOnly: true}, 'ADMIN'), {canDelete: false, canReplay: false})
  t.deepEqual(getDeclarationAdminCapabilities({declaration}, 'ADMIN'), {canDelete: true, canReplay: true})
  t.deepEqual(getDeclarationAdminCapabilities({declaration, canDelete: false, canReplay: false}, 'ADMIN'), {canDelete: false, canReplay: false})
  t.deepEqual(getDeclarationAdminCapabilities({declaration}, 'DECLARANT'), {canDelete: false, canReplay: false})
})

test('le rejeu générique est masqué pour les dossiers DN historiques, sans retirer les autres actions', t => {
  const declaration = {id: 'historical-declaration', files: [{id: 'original-file'}]}
  const metadata = {provenance: 'DN', historicalAccepted: true}
  t.deepEqual(getDeclarationAdminCapabilities({declaration, metadata}, 'ADMIN'), {canDelete: true, canReplay: false})
  t.deepEqual(getDeclarationAdminCapabilities({declaration, metadata, canReplay: true}, 'ADMIN'), {canDelete: true, canReplay: false})
  t.deepEqual(getDeclarationAdminCapabilities({declaration: {...declaration, importSourceId: 'reunion:DN:80149:12345'}}, 'ADMIN'), {canDelete: true, canReplay: false})
  t.deepEqual(getDeclarationAdminCapabilities({declaration, metadata: {provenance: 'PE', historicalAccepted: true}}, 'ADMIN'), {canDelete: true, canReplay: true})
  t.deepEqual(getDeclarationAdminCapabilities({declaration, metadata: {provenance: 'DN', historicalAccepted: false}}, 'ADMIN'), {canDelete: true, canReplay: true})
})

test('isTelemetrySource détecte les sources API et les déclarations API', t => {
  t.true(isTelemetrySource({type: 'API'}))
  t.true(isTelemetrySource({type: 'DECLARATION'}, {dataSourceType: 'API'}))
  t.false(isTelemetrySource({type: 'DECLARATION'}, {dataSourceType: 'SPREADSHEET'}))
})

test('isPointReconciliationRelevant cible uniquement les fichiers déclaratifs', t => {
  t.true(isPointReconciliationRelevant({
    dataSourceType: 'SPREADSHEET',
    source: {type: 'DECLARATION'}
  }))
  t.false(isPointReconciliationRelevant({
    dataSourceType: 'MANUAL',
    source: {type: 'DECLARATION'}
  }))
  t.false(isPointReconciliationRelevant({
    dataSourceType: 'SPREADSHEET',
    source: {type: 'API'}
  }))
})

test('shouldLoadAvailablePointsForDeclaration conserve la carte en lecture seule pour un admin', t => {
  const declaration = {dataSourceType: 'SPREADSHEET'}
  const source = {
    type: 'DECLARATION',
    status: 'COMPLETED',
    chunks: [
      {canReconcile: false},
      {canReconcile: false}
    ]
  }

  t.true(shouldLoadAvailablePointsForDeclaration({
    currentRole: 'ADMIN',
    declaration,
    source
  }))
  t.false(shouldLoadAvailablePointsForDeclaration({
    currentRole: 'INSTRUCTOR',
    declaration,
    source
  }))
  t.true(shouldLoadAvailablePointsForDeclaration({
    currentRole: 'INSTRUCTOR',
    declaration,
    source: {
      ...source,
      chunks: [{canReconcile: true}]
    }
  }))
})

test('la carte conserve les points lus dans la déclaration sans droit de rapprochement', t => {
  const point = {id: 'known-point', name: 'Point connu', coordinates: {type: 'Point', coordinates: [55.5, -21]}}
  const chunks = [
    {pointPrelevementId: point.id, pointPrelevement: point, canReconcile: false},
    {pointPrelevementId: point.id, pointPrelevement: point, exploitationId: null},
    {pointPrelevementId: null, metadata: {originalPoint: 'Point non reconnu'}}
  ]
  t.deepEqual(getDeclarationMapPoints(chunks), [{...point, canReconcile: false}])
  t.false(Object.hasOwn(point, 'canReconcile'))
})

test('les candidats associables restent distincts des points consultables', t => {
  const readOnlyPoint = {id: 'readonly-point', name: 'Point historique'}
  const linkedPoint = {id: 'linked-point', name: 'Point lié'}
  const candidate = {...linkedPoint, exploitations: [{id: 'allowed-exploitation'}]}
  const newCandidate = {id: 'candidate-point', name: 'Autre point'}
  t.deepEqual(getDeclarationMapPoints([
    {pointPrelevementId: readOnlyPoint.id, pointPrelevement: readOnlyPoint},
    {pointPrelevementId: linkedPoint.id, pointPrelevement: linkedPoint}
  ], [candidate, newCandidate]), [
    {...readOnlyPoint, canReconcile: false},
    {...candidate, canReconcile: true},
    {...newCandidate, canReconcile: true}
  ])
})

test('la carte ne reconstruit pas de point depuis une référence masquée ou incohérente', t => {
  t.deepEqual(getDeclarationMapPoints([
    {pointPrelevementId: 'redacted-point'},
    {pointPrelevementId: 'known-point', pointPrelevement: {id: 'other-point'}},
    {pointPrelevementId: null, pointPrelevement: {id: 'orphan-point'}}
  ]), [])
})

test('getTelemetrySourceTitle décrit le connecteur si disponible', t => {
  t.is(getTelemetrySourceTitle({metadata: {connector: 'Murgat'}}), 'Télérelève Murgat')
  t.is(getTelemetrySourceTitle({metadata: {}}), 'Données télérelevées')
})

test('buildDeclarationViewFromSource retourne la déclaration existante ou une vue télémétrie', t => {
  const declaration = {id: 'declaration-id'}
  t.is(buildDeclarationViewFromSource({declaration}), declaration)

  t.deepEqual(buildDeclarationViewFromSource({
    id: 'source-id',
    metadata: {connector: 'Murgat'},
    createdAt: '2026-06-30T10:00:00Z',
    declarant: {id: 'declarant-id'}
  }), {
    id: 'source-id',
    code: null,
    title: 'Télérelève Murgat',
    type: 'telemetry',
    declarationType: {name: 'Murgat'},
    dataSourceType: 'API',
    createdAt: '2026-06-30T10:00:00Z',
    files: [],
    declarant: {id: 'declarant-id'},
    createdByDeclarant: null,
    comment: null
  })
})

test('getDeclarationEntryKind classe télémétrie, manuel, fichier et absence', t => {
  t.is(getDeclarationEntryKind({dataSourceType: 'SPREADSHEET'}, {type: 'API'}), 'TELEMETRY')
  t.is(getDeclarationEntryKind({dataSourceType: 'MANUAL'}, {type: 'DECLARATION'}), 'MANUAL')
  t.is(getDeclarationEntryKind({}, {type: 'DECLARATION'}), 'NONE')
})

test('getDeclarationDisplayStatus combine le traitement et le statut d’association de la source', t => {
  t.is(getDeclarationDisplayStatus({
    processingStatus: 'QUEUED',
    source: null
  }), 'QUEUED')

  t.is(getDeclarationDisplayStatus({
    processingStatus: 'QUEUED',
    source: {status: 'PROCESSING'}
  }), 'PROCESSING')

  t.is(getDeclarationDisplayStatus({
    processingStatus: 'COMPLETED',
    source: {status: 'COMPLETED', globalInstructionStatus: 'VALIDATED'}
  }), 'VALIDATED')
})

test('isDeclarationTreatmentPending couvre les statuts sans source', t => {
  t.true(isDeclarationTreatmentPending({processingStatus: 'UPLOADED', source: null}))
  t.true(isDeclarationTreatmentPending({processingStatus: 'QUEUED', source: null}))
  t.false(isDeclarationTreatmentPending({processingStatus: 'COMPLETED', source: null}))
  t.false(isDeclarationTreatmentPending({
    processingStatus: 'COMPLETED',
    source: {status: 'COMPLETED'}
  }))
})

test('un échec de déclaration prévaut sur une source restée en attente ou issue du précédent essai', t => {
  for (const sourceStatus of ['PENDING', 'PROCESSING', 'COMPLETED', 'FAILED']) {
    const source = {status: sourceStatus, globalInstructionStatus: 'VALIDATED', type: 'DECLARATION'}
    const declaration = {processingStatus: 'FAILED', dataSourceType: 'SPREADSHEET', source}
    t.is(getDeclarationProcessingStatus(declaration), 'FAILED')
    t.is(getDeclarationDisplayStatus(declaration), 'FAILED')
    t.false(isDeclarationTreatmentPending(declaration))
    t.false(shouldLoadAvailablePointsForDeclaration({currentRole: 'ADMIN', declaration, source}))
  }
})

test('une nouvelle tentative prévaut sur les données ou l’échec de la source précédente', t => {
  for (const processingStatus of ['CREATED', 'UPLOADED', 'QUEUED', 'PROCESSING']) {
    for (const sourceStatus of ['PENDING', 'COMPLETED', 'FAILED']) {
      const source = {status: sourceStatus, globalInstructionStatus: 'VALIDATED', type: 'DECLARATION'}
      const declaration = {processingStatus, dataSourceType: 'SPREADSHEET', source}
      t.is(getDeclarationDisplayStatus(declaration), processingStatus)
      t.true(isDeclarationTreatmentPending(declaration))
      t.false(shouldLoadAvailablePointsForDeclaration({currentRole: 'ADMIN', declaration, source}))
    }
  }
})

test('les sources sans déclaration conservent leur état et ne pollent pas après un échec', t => {
  t.is(getDeclarationDisplayStatus(null, {status: 'FAILED'}), 'FAILED')
  t.false(isDeclarationTreatmentPending(null, {status: 'FAILED'}))
  t.true(isDeclarationTreatmentPending(null, {status: 'PROCESSING'}))
  t.is(getDeclarationDisplayStatus(null, {status: 'COMPLETED', globalInstructionStatus: 'VALIDATED'}), 'VALIDATED')
})

test('getSourcePeriod calcule les bornes sur tous les chunks', t => {
  const period = getSourcePeriod({
    chunks: [
      {minDate: '2026-05-01', maxDate: '2026-05-31'},
      {minDate: '2026-07-01', maxDate: '2026-07-31'}
    ]
  })

  t.is(period.start.toISOString().slice(0, 10), '2026-05-01')
  t.is(period.end.toISOString().slice(0, 10), '2026-07-31')
  t.deepEqual(getSourcePeriod({chunks: []}), {start: null, end: null})
})

test('isManualQuickDeclarationSource accepte le type MANUAL ou le flag metadata', t => {
  t.true(isManualQuickDeclarationSource({declaration: {dataSourceType: 'MANUAL'}}))
  t.true(isManualQuickDeclarationSource({metadata: {manualQuickDeclaration: true}}))
  t.false(isManualQuickDeclarationSource({declaration: {dataSourceType: 'SPREADSHEET'}}))
})

test('getSourceReadingDateLabel retrouve la meilleure date de relevé', t => {
  t.is(getSourceReadingDateLabel({
    metadata: {manualQuickDeclaration: true, readingDate: '2026-06-30'}
  }), '30/06/2026')

  t.is(getSourceReadingDateLabel({
    metadata: {manualQuickDeclaration: true},
    chunks: [{metadata: {readingDate: '2026-05-15'}}]
  }), '15/05/2026')

  t.is(getSourceReadingDateLabel({metadata: {}}), null)
})

test('getSourcePeriodLabel privilégie les relevés rapides puis les périodes', t => {
  t.is(getSourcePeriodLabel({
    metadata: {manualQuickDeclaration: true, readingDate: '2026-06-30'}
  }), 'Relevé du 30/06/2026')

  t.is(getSourcePeriodLabel({
    chunks: [{minDate: '2026-05-01', maxDate: '2026-06-30'}]
  }), 'mai 2026 à juin 2026')

  t.is(getSourcePeriodLabel({
    chunks: [{minDate: '2026-06-01', maxDate: '2026-06-30'}]
  }), 'juin 2026')

  t.is(getSourcePeriodLabel({chunks: []}), null)
})

test('getPointsPrelevementIdsFromSource et déclaration filtrent les IDs vides', t => {
  const source = {
    chunks: [
      {pointPrelevementId: 'point-1'},
      {pointPrelevementId: null},
      {pointPrelevementId: 'point-2'}
    ]
  }

  t.deepEqual(getPointsPrelevementIdsFromSource(source), ['point-1', 'point-2'])
  t.deepEqual(getPointsPrelevementIdsFromDeclaration({source}), ['point-1', 'point-2'])
})

test('formatFullAddress assemble uniquement les segments renseignés', t => {
  t.is(formatFullAddress({
    addressLine1: '1 rue de la Source',
    addressLine2: 'Bâtiment B',
    poBox: 'BP 12',
    postalCode: '75000',
    city: 'Paris'
  }), '1 rue de la Source, Bâtiment B, BP 12, 75000 Paris')

  t.is(formatFullAddress({postalCode: '75000', city: 'Paris'}), '75000 Paris')
  t.is(formatFullAddress({}), '')
})
