import test from 'ava'

import {
  buildDeclarationViewFromSource,
  formatFullAddress,
  getDeclarationEntryKind,
  getDeclarationDisplayStatus,
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

test('getDeclarationDisplayStatus privilégie la source puis le statut de traitement', t => {
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
