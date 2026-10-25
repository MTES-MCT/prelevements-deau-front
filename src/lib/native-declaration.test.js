import test from 'ava'
import {formatNativeDate, isNativeDeclaration, REUNION_FILE_TYPES} from './native-declaration.js'

test('les dates natives gardent secondes et fuseau Réunion, y compris au changement d’année', t => {
  t.is(formatNativeDate('2026-07-01T00:01:23.000Z'), '01/07/2026 04:01:23')
  t.is(formatNativeDate('2025-12-31T20:00:00.000Z'), '01/01/2026 00:00:00')
  t.is(formatNativeDate(null), 'Non renseignée')
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
