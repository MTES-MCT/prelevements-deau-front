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
  getQuickDeclarationEntriesCount,
  getQuickDeclarationEntriesLabel,
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

test('la période d’un lot télérelevé inclut la fenêtre du volume calculé qui précède le jour de remise', t => {
  const volume = {metricTypeCode: 'volume', valueKind: 'COMPUTED', periodStart: '2026-11-16T23:30:00Z', periodEnd: '2026-11-18T08:00:00Z'}
  const chunk = {minDate: '2026-11-18', maxDate: '2026-11-18', chunkValues: [volume]}
  const period = getSourcePeriod({type: 'API', chunks: [chunk]})
  t.is(period.start.toISOString().slice(0, 10), '2026-11-17')
  t.is(period.end.toISOString().slice(0, 10), '2026-11-18')
  t.is(getSourcePeriod({type: 'MANUAL', chunks: [chunk]}).start.toISOString().slice(0, 10), '2026-11-18')
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
  t.is(getTelemetrySourceTitle({metadata: {connector: 'orange_live_objects'}}), 'Télérelève Orange Live Objects')
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

test('la période des relevés couvre toutes les dates de campagne, en détail et en liste', t => {
  const dates = ['2026-05-31', '2026-10-31', '2025-11-01']
  const source = {
    createdAt: '2026-11-18',
    metadata: {manualQuickDeclaration: true, measurementType: 'INDEX', readingDate: dates[0]},
    chunks: dates.map(readingDate => ({metadata: {readingDate}}))
  }
  const detail = {...source, chunks: source.chunks.map(chunk => ({
    ...chunk,
    chunkValues: [{metricTypeCode: 'index', valueKind: 'DECLARED', periodStart: chunk.metadata.readingDate}],
    latestIndexReadings: [{periodStart: '2024-01-01'}]
  }))}
  for (const data of [source, detail]) {
    t.is(getSourceReadingDateLabel(data, {singleDatePrefix: 'Le '}), 'Du 01/11/2025 au 31/10/2026')
    t.is(getSourcePeriodLabel(data), 'Relevés du 01/11/2025 au 31/10/2026')
  }
})

test('les dates des index déclarés dans un même lot excluent les volumes calculés et les fins exclusives', t => {
  const source = {
    metadata: {manualQuickDeclaration: true, measurementType: 'INDEX'},
    chunks: [{
      metadata: {readingDate: '2026-05-01'},
      chunkValues: [
        {metricTypeCode: 'index', periodStart: '2026-07-01', periodEnd: '2026-07-02'},
        {metricTypeCode: 'index', periodStart: '2026-05-01', periodEnd: '2026-05-02'},
        {metricTypeCode: 'volume prélevé', valueKind: 'COMPUTED', periodStart: '2026-02-01'}
      ]
    }]
  }
  t.is(getSourceReadingDateLabel(source), 'Du 01/05/2026 au 01/07/2026')
})

test('plusieurs compteurs relevés le même jour conservent une date unique', t => {
  const source = {metadata: {manualQuickDeclaration: true}, chunks: [
    {minDate: '2026-06-30', maxDate: '2026-06-30'},
    {metadata: {readingDate: '2026-06-30'}}
  ]}
  t.is(getSourceReadingDateLabel(source, {singleDatePrefix: 'Le '}), 'Le 30/06/2026')
  t.is(getSourcePeriodLabel(source), 'Relevé du 30/06/2026')
})

test('les saisies rapides de volume conservent leur date affichée', t => {
  const source = {
    metadata: {manualQuickDeclaration: true, measurementType: 'VOLUME'},
    chunks: [{minDate: '2026-06-01', maxDate: '2026-06-30'}]
  }
  t.is(getSourceReadingDateLabel(source), '30/06/2026')
})

test('le volume directement saisi affiche sa période métier inclusive dans la liste et dans le titre', t => {
  const period = {periodStartDate: '2026-09-01', periodEndDate: '2026-09-30'}
  const metadata = {manualQuickDeclaration: true, measurementType: 'VOLUME'}
  const chunk = {metadata: period, chunkValues: [{metricTypeCode: 'volume', valueKind: 'DECLARED', periodEnd: '2026-10-01'}]}
  for (const source of [{metadata: {...metadata, ...period}}, {metadata, chunks: [chunk]}]) {
    t.is(getSourceReadingDateLabel(source, {singleDatePrefix: 'Le '}), 'Du 01/09/2026 au 30/09/2026')
    t.is(getSourcePeriodLabel(source), 'Du 01/09/2026 au 30/09/2026')
  }
  t.is(getSourcePeriodLabel({metadata: {...metadata, ...period, periodEndDate: period.periodStartDate}}), 'Le 01/09/2026')
})

test('le nombre de relevés exclut les volumes calculés et conserve les saisies des listes sans valeurs détaillées', t => {
  const source = {metadata: {measurementType: 'INDEX'}, chunks: [{chunkValues: [
    {metricTypeCode: 'index', valueKind: 'DECLARED'}, {metricTypeCode: 'volume', valueKind: 'COMPUTED'}
  ]}]}
  t.is(getQuickDeclarationEntriesCount(source), 1)
  t.is(getQuickDeclarationEntriesCount({...source, chunks: [{chunkValues: [{metricTypeCode: 'volume', valueKind: 'COMPUTED'}]}]}), 0)
  t.is(getQuickDeclarationEntriesCount({...source, chunks: [{}, {}]}), 2)
  t.is(getQuickDeclarationEntriesCount({...source, metadata: {entriesCount: 0}}), 0)
})

test('le résumé d’une saisie rapide de volume compte les volumes saisis, même pour un volume nul', t => {
  for (const measurementType of ['VOLUME', 'VOLUME_PRELEVE', 'VOLUME_REJETE']) {
    const metadata = {manualQuickDeclaration: true, measurementType}
    const source = {metadata, chunks: [{chunkValues: [{metricTypeCode: 'volume', valueKind: 'DECLARED', value: 0}]}]}
    t.is(getQuickDeclarationEntriesLabel(source), '1 volume saisi')
    t.is(getQuickDeclarationEntriesLabel({metadata: {...metadata, entriesCount: 3}}), '3 volumes saisis')
    t.is(getQuickDeclarationEntriesLabel({metadata: {...metadata, entriesCount: 0}}), null)
    for (const key of ['collectionCampaignId', 'collectionResponseId']) {
      t.is(getQuickDeclarationEntriesLabel({...source, metadata: {...metadata, [key]: 'campagne'}}), '1 relevé')
    }
  }
  t.is(getQuickDeclarationEntriesLabel({metadata: {measurementType: 'INDEX', entriesCount: 2}}), '2 relevés')
  t.is(getQuickDeclarationEntriesLabel({chunks: [{}]}), '1 relevé')
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
