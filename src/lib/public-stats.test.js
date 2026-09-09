import test from 'ava'

import {
  formatStatsCount,
  formatStatsDate,
  formatStatsMonth,
  formatStatsPercentage,
  getPublicStatsUrl,
  getSelectableStatsMonths,
  getStatsConnections,
  getStatsProfiles,
  isStatsMonth
} from './public-stats.js'

test('distingue une vraie valeur zéro d’une donnée absente ou invalide', t => {
  t.is(formatStatsCount(0), '0')
  t.is(formatStatsCount(1200), '1\u202F200')
  for (const value of [null, undefined, '', '12', Number.NaN, -1, Number.POSITIVE_INFINITY]) {
    t.is(formatStatsCount(value), 'Indisponible')
  }
})

test('affiche les taux nuls sans transformer les taux absents en zéro', t => {
  t.is(formatStatsPercentage(0), '0 %')
  t.is(formatStatsPercentage(100), '100 %')
  t.is(formatStatsPercentage(12.345), '12,3 %')
  t.is(formatStatsPercentage(null), 'Indisponible')
  t.is(formatStatsPercentage(101), 'Indisponible')
})

test('valide le mois sans accepter de paramètres ou valeurs malformées', t => {
  t.true(isStatsMonth('2026-08'))
  for (const value of ['2026-00', '2026-13', '2026-1', '2026-08&admin=true', ['2026-08'], null]) {
    t.false(isStatsMonth(value))
  }
})

test('formate les dates et mois en français sans dépendre du fuseau du serveur', t => {
  t.is(formatStatsMonth('2026-08'), 'août 2026')
  t.is(formatStatsMonth('2026-08', {short: true}), 'août 2026')
  t.is(formatStatsMonth('invalid'), 'Indisponible')
  t.is(formatStatsDate('2026-09-08T23:30:00Z'), '9 septembre 2026')
  t.is(formatStatsDate('not-a-date'), 'Indisponible')
  t.is(formatStatsDate(null), 'Indisponible')
})

test('propose uniquement les mois clos, dédoublonnés et triés, selon l’heure de Paris', t => {
  const months = ['2026-10', '2026-09', '2026-08', '2026-07', '2026-08', 'invalid']
  t.deepEqual(getSelectableStatsMonths(months, new Date('2026-08-31T22:30:00Z')), ['2026-08', '2026-07'])
  t.deepEqual(getSelectableStatsMonths(null), [])
})

test('les profils conservent les catégories autres et inconnues', t => {
  const profiles = [
    {key: 'AGRICULTURE', label: 'Agriculteurs', count: 6},
    {key: 'OTHER', label: 'Autres', count: 2},
    {key: 'UNKNOWN', label: 'Non renseigné', count: 2},
    {key: 'INDUSTRY', label: 'Industriels', count: 0}
  ]
  const result = getStatsProfiles(profiles)
  t.true(result.available)
  t.is(result.total, 10)
  t.deepEqual(result.profiles.map(profile => [profile.key, profile.percentage]), [
    ['AGRICULTURE', 60],
    ['OTHER', 20],
    ['UNKNOWN', 20]
  ])
  t.is(profiles.length, 4)
})

test('une répartition absente reste distincte d’un territoire sans préleveur', t => {
  t.deepEqual(getStatsProfiles(undefined), {available: false, total: null, profiles: []})
  t.deepEqual(getStatsProfiles([{key: 'OTHER', count: null}]), {available: false, total: null, profiles: []})
  t.deepEqual(getStatsProfiles([]), {available: true, total: 0, profiles: []})
})

test('les mois sans historique ne sont jamais affichés comme des zéros mesurés', t => {
  const result = getStatsConnections([
    {
      month: '2026-06', administration: 0, declarants: 0, total: 0, status: 'unavailable'
    },
    {
      month: '2026-07', administration: 0, declarants: 0, total: 0, status: 'available'
    },
    {
      month: '2026-08', administration: 2, declarants: 3, total: 5, status: 'partial'
    }
  ])
  t.false(result[0].available)
  t.is(result[0].total, null)
  t.true(result[1].available)
  t.is(result[1].total, 0)
  t.true(result[2].available)
  t.is(result[2].status, 'partial')
})

test('les connexions gardent les six derniers mois dans l’ordre sans modifier la réponse', t => {
  const months = Array.from({length: 8}, (_, index) => ({
    month: `2026-0${8 - index}`,
    administration: 1,
    declarants: 2,
    total: 3,
    status: 'available'
  }))
  t.deepEqual(getStatsConnections(months).map(item => item.month), [
    '2026-03', '2026-04', '2026-05', '2026-06', '2026-07', '2026-08'
  ])
  t.is(months[0].month, '2026-08')
})

test('une série de connexions incomplète ne produit pas de graphique trompeur', t => {
  const [result] = getStatsConnections([
    {
      month: '2026-08', administration: null, declarants: 3, total: 3, status: 'available'
    }
  ])
  t.false(result.available)
  t.is(result.declarants, null)
  t.is(result.total, null)
})

test('construit seulement une URL d’agrégats publics avec le mois demandé', t => {
  t.is(getPublicStatsUrl('https://api.example.test/', '2026-08'), 'https://api.example.test/api/stats/public?month=2026-08')
  t.is(getPublicStatsUrl('https://api.example.test'), 'https://api.example.test/api/stats/public')
  t.throws(() => getPublicStatsUrl(undefined), {message: 'PUBLIC_STATS_API_NOT_CONFIGURED'})
  t.throws(() => getPublicStatsUrl('https://api.example.test', ['2026-08']), {message: 'INVALID_STATS_MONTH'})
})
