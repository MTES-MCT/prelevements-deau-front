import test from 'ava'
import {formatNativeDate, formatNativeReadingDate, getNativeAssociationWarnings, isNativeDeclaration, REUNION_FILE_TYPES} from './native-declaration.js'

test('les dates natives gardent secondes et fuseau Réunion, y compris au changement d’année', t => {
  t.is(formatNativeDate('2026-07-01T00:01:23.000Z'), '01/07/2026 04:01:23')
  t.is(formatNativeDate('2025-12-31T20:00:00.000Z'), '01/01/2026 00:00:00')
  t.is(formatNativeDate(null), 'Non renseignée')
})

test('le résumé natif ne transforme pas une date métier en heure locale', t => {
  t.is(formatNativeReadingDate(null, '2026-08-01T00:00:00.000Z'), '01/08/2026')
  t.is(formatNativeReadingDate(null, '2026-01-01T00:00:00.000Z'), '01/01/2026')
  t.is(formatNativeReadingDate('2026-08-01', '2026-07-31'), '01/08/2026')
  t.is(formatNativeReadingDate(null, null), 'Non renseignée')
  t.is(formatNativeReadingDate(null, 'invalid'), 'Non renseignée')
})

test('le résumé natif conserve les instants exacts dans le fuseau Réunion', t => {
  t.is(formatNativeReadingDate('2026-07-31T20:00:00.000Z', '2026-08-01'), '01/08/2026 00:00:00')
  t.is(formatNativeReadingDate('2025-12-31T20:00:00.000Z', '2026-01-01'), '01/01/2026 00:00:00')
  t.is(formatNativeReadingDate('2026-08-01T00:01:23.000Z', '2026-08-01'), '01/08/2026 04:01:23')
  t.is(formatNativeReadingDate('2026-01-01T00:01:23.000Z', '2026-01-01'), '01/01/2026 04:01:23')
})

test('seules les déclarations natives utilisent la lecture des valeurs paginées', t => {
  t.true(isNativeDeclaration({metadata: {nativeTemporal: true}}))
  t.true(isNativeDeclaration({chunks: [{metadata: {nativeTemporal: true}}]}))
  t.false(isNativeDeclaration({chunks: [{metadata: {}}]}))
  t.false(isNativeDeclaration(null))
  t.true(REUNION_FILE_TYPES.has('reunion_camion_citerne'))
  t.true(REUNION_FILE_TYPES.has('reunion_multi_param'))
  t.false(REUNION_FILE_TYPES.has('template-file'))
})

const warningChunk = (code, overrides = {}) => ({
  pointPrelevementId: 'point-1', pointPrelevement: {name: '421 — Forage synthétique'},
  metadata: {nativeTemporal: true}, parsingInfo: {issues: [{code}]}, ...overrides
})

test('les avertissements d’exploitation sont regroupés par point et motif, même pour des centaines de séries', t => {
  const chunks = Array.from({length: 300}, () => warningChunk('EXPLOITATION_PERIOD_NOT_COVERED'))
  chunks.push(warningChunk('EXPLOITATION_NOT_FOUND'), warningChunk('EXPLOITATION_AMBIGUOUS'))
  chunks.push(warningChunk('EXPLOITATION_PERIOD_NOT_COVERED', {
    pointPrelevementId: 'point-2', pointPrelevement: null, pointPrelevementName: '422 — Autre forage'
  }))
  t.deepEqual(getNativeAssociationWarnings(chunks), [
    {key: 'point-1:EXPLOITATION_PERIOD_NOT_COVERED', pointName: '421 — Forage synthétique', message: 'aucune exploitation ne couvre toute la période déclarée.'},
    {key: 'point-1:EXPLOITATION_NOT_FOUND', pointName: '421 — Forage synthétique', message: 'aucune exploitation n’est enregistrée pour ce préleveur.'},
    {key: 'point-1:EXPLOITATION_AMBIGUOUS', pointName: '421 — Forage synthétique', message: 'plusieurs exploitations couvrent la période déclarée.'},
    {key: 'point-2:EXPLOITATION_PERIOD_NOT_COVERED', pointName: '422 — Autre forage', message: 'aucune exploitation ne couvre toute la période déclarée.'}
  ])
})

test('les points non reconnus, séries remplacées et autres diagnostics ne sont pas présentés comme un problème d’exploitation natif', t => {
  t.deepEqual(getNativeAssociationWarnings([
    warningChunk('EXPLOITATION_NOT_FOUND', {pointPrelevementId: null}),
    warningChunk('EXPLOITATION_NOT_FOUND', {metadata: {}}),
    warningChunk('EXPLOITATION_NOT_FOUND', {metadata: {nativeTemporal: true, superseded: true}}),
    warningChunk('UNMATCHED_POINT'), warningChunk('UNKNOWN'), warningChunk('__proto__'),
    warningChunk('EXPLOITATION_NOT_FOUND', {parsingInfo: null}),
    warningChunk('EXPLOITATION_NOT_FOUND', {parsingInfo: {issues: [null]}})
  ]), [])
  t.deepEqual(getNativeAssociationWarnings(), [])
})

test('seules les séries rejetées pour chevauchement sont annoncées comme exclues du calcul', t => {
  const chunks = ['PENDING', 'VALIDATED', 'REJECTED', 'REJECTED'].map(instructionStatus => warningChunk('OVERLAPPING_SERIES', {instructionStatus}))
  t.deepEqual(getNativeAssociationWarnings(chunks), [{
    key: 'point-1:OVERLAPPING_SERIES', pointName: '421 — Forage synthétique',
    message: 'une ou plusieurs séries recouvrent des données déjà présentes ; elles sont exclues du calcul pour éviter les doubles comptes.'
  }])
})
