import test from 'ava'

import {
  createPointListPresentation,
  getUsageMarkerBackground
} from './point-list-presentation.js'

test('prépare les quatre tuiles et trie les préleveurs', t => {
  const presentation = createPointListPresentation({
    flowType: 'REJET',
    nature: 'COURS_EAU',
    preleveurLabels: ['Zoo industrie', 'Alpha irrigation', 'Zoo industrie', ''],
    usages: [
      {code: '2', label: 'Irrigation'},
      {code: '5', label: 'Eau potable'},
      {code: '4', label: 'Industrie'}
    ],
    withdrawalType: 'CONTINENTAL'
  })

  t.deepEqual(presentation.preleveurLabels, ['Alpha irrigation', 'Zoo industrie'])
  t.is(presentation.flowType.label, 'Rejet')
  t.is(presentation.flowType.accessibleLabel, 'Type de point : Rejet')
  t.is(presentation.usage.label, 'Irrigation · Alimentation en eau potable (AEP) + 1')
  t.is(presentation.usage.accessibleLabel, 'Usage : Irrigation, Alimentation en eau potable (AEP), Industrie')
  t.deepEqual(presentation.withdrawalType, {
    accessibleLabel: 'Type de prélèvement / rejet : Continental',
    label: 'Continental'
  })
  t.deepEqual(presentation.nature, {
    accessibleLabel: 'Origine prélèvement / rejet : Cours d’eau',
    label: 'Cours d’eau'
  })
})

test('affiche un usage gris et omet les caractéristiques absentes', t => {
  const presentation = createPointListPresentation({preleveurLabels: null, usages: []})

  t.is(presentation.flowType.label, 'Prélèvement')
  t.is(presentation.usage.label, 'Usage non renseigné')
  t.is(presentation.usage.markerBackground, '#929292')
  t.is(presentation.withdrawalType, null)
  t.is(presentation.nature, null)
  t.deepEqual(presentation.preleveurLabels, [])
})

test('construit un marqueur multicolore pour plusieurs usages', t => {
  const background = getUsageMarkerBackground(['2', '5'])

  t.true(background.startsWith('conic-gradient('))
  t.true(background.includes(' 0% 50%'))
  t.true(background.includes(' 50% 100%'))
})
