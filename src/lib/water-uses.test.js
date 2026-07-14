import test from 'ava'

import {
  formatUsageReference,
  formatUsages,
  getUsageCode,
  getUsageColor,
  getUsageId,
  getUsageKey,
  getUsageLabel,
  getUsageReferenceLabel,
  getUsageRootCode,
  getUsageTextColor,
  isSubUsage,
  normalizeUsageOption,
  usageMatchesFilter
} from './water-uses.js'

test('getUsageCode convertit les anciens codes métier en codes SANDRE', t => {
  t.is(getUsageCode('IRRIGATION'), '2')
  t.is(getUsageCode('industrie'), '4')
  t.is(getUsageCode(' 5a '), '5A')
  t.is(getUsageCode({code: '3b'}), '3B')
  t.is(getUsageCode(null), null)
})

test('getUsageRootCode extrait le code racine', t => {
  t.is(getUsageRootCode('6C2'), '6')
  t.is(getUsageRootCode({code: '12E'}), '12')
  t.is(getUsageRootCode('AUTRE'), 'AUTRE')
})

test('getUsageId retourne uniquement les identifiants objet', t => {
  t.is(getUsageId({id: 'usage-id', code: '2'}), 'usage-id')
  t.is(getUsageId('2'), null)
  t.is(getUsageId(null), null)
})

test('getUsageLabel privilégie les libellés API puis les libellés locaux', t => {
  t.is(getUsageLabel({label: 'Usage API', code: '2'}), 'Usage API')
  t.is(getUsageLabel({mnemonic: 'MNEMO', code: '2'}), 'MNEMO')
  t.is(getUsageLabel('2'), 'Irrigation')
  t.is(getUsageLabel('USAGE_LEGACY'), 'USAGE LEGACY')
  t.is(getUsageLabel(null), '')
})

test('isSubUsage détecte les sous-usages via kind ou code', t => {
  t.true(isSubUsage({code: '2A', kind: 'SUB_USAGE'}))
  t.true(isSubUsage({code: '2A', kind: 'subusage'}))
  t.true(isSubUsage('2A'))
  t.false(isSubUsage('2'))
  t.false(isSubUsage(null))
})

test('getUsageReferenceLabel et formatUsageReference rendent les usages lisibles', t => {
  t.is(getUsageReferenceLabel('2A'), 'Sous-usage')
  t.is(getUsageReferenceLabel('2'), 'Usage')
  t.is(formatUsageReference('2'), 'Irrigation')
  t.is(formatUsageReference({code: '2', label: 'Irrigation'}), 'Irrigation')
  t.is(formatUsageReference({code: 'XYZ'}), 'XYZ')
  t.is(formatUsageReference({label: 'Sans code'}), 'Sans code')
})

test('couleurs et textes retombent sur le code racine puis les défauts', t => {
  t.is(getUsageColor('2'), '#2E7D32')
  t.is(getUsageColor('2A'), '#2E7D32')
  t.is(getUsageColor({code: '2', color: '#123456'}), '#123456')
  t.is(getUsageColor('INCONNU_TOTAL'), '#cccccc')

  t.is(getUsageTextColor('2A'), 'var(--text-inverted-grey)')
  t.is(getUsageTextColor('INCONNU_TOTAL'), 'var(--text-default-grey)')
})

test('getUsageKey choisit un identifiant stable', t => {
  t.is(getUsageKey({id: 'usage-id', code: '2'}), 'usage-id')
  t.is(getUsageKey({code: '2'}), '2')
  t.is(getUsageKey({label: 'Usage sans code'}), 'Usage sans code')
})

test('normalizeUsageOption expose le contrat attendu par les selects', t => {
  t.deepEqual(normalizeUsageOption({id: 'id-2', code: '2', label: 'Irrigation API'}), {
    id: 'id-2',
    value: 'id-2',
    code: '2',
    label: 'Irrigation API',
    color: '#2E7D32',
    textColor: 'var(--text-inverted-grey)',
    raw: {id: 'id-2', code: '2', label: 'Irrigation API'}
  })

  t.like(normalizeUsageOption('IRRIGATION'), {
    id: null,
    value: '2',
    code: '2',
    label: 'Irrigation'
  })
})

test('usageMatchesFilter matche id, code, racine et libellé', t => {
  const usage = {id: 'id-2a', code: '2A', label: 'Aspersion'}
  t.true(usageMatchesFilter(usage, 'id-2a'))
  t.true(usageMatchesFilter(usage, '2A'))
  t.true(usageMatchesFilter(usage, '2'))
  t.true(usageMatchesFilter(usage, 'Aspersion'))
  t.false(usageMatchesFilter(usage, '5'))
  t.false(usageMatchesFilter(usage, null))
})

test('formatUsages concatène les libellés non vides', t => {
  t.is(formatUsages(['2', {label: 'Usage API'}, null]), 'Irrigation, Usage API')
  t.is(formatUsages([]), '')
})
