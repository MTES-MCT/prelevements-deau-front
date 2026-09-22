import test from 'ava'
import {buildSeriesPresentations} from './series-presentation.js'

test('les index restent distincts avec numéro compact et couleurs cohérentes indépendantes de la sélection', t => {
  const parameters = [
    {id: 'volume', name: 'volume', label: 'Volume prélevé'},
    {id: 'index', name: 'index', label: 'Index historique'},
    {id: 'index:meter:b', meterId: 'b', readingSeries: true, meter: {serialNumber: '002'}},
    {id: 'index:meter:a', meterId: 'a', readingSeries: true, meter: {serialNumber: '001'}}
  ]
  const result = buildSeriesPresentations(parameters)
  t.is(result[0], parameters[0])
  t.is(result[1].label, 'Index déclarés')
  t.is(result[2].label, 'Compteur n° 002')
  t.is(result[3].label, 'Compteur n° 001')
  t.not(result[2].color, result[3].color)
  t.deepEqual(result.map(item => item.id), parameters.map(item => item.id))
  t.deepEqual(buildSeriesPresentations([...parameters].reverse()).reverse(), result)
})

test('les anciennes réponses restent lisibles sans exposer un UUID comme numéro de compteur', t => {
  const result = buildSeriesPresentations([
    {id: 'a', readingSeries: true, label: 'Index — compteur 12345'},
    {id: 'b', readingSeries: true, label: 'Index — compteur 22222222-2222-4222-8222-222222222222'},
    {id: 'c', name: 'index', flowType: 'REJET'}
  ])
  t.is(result[0].label, 'Compteur n° 12345')
  t.is(result[1].label, 'Compteur 2 (numéro non renseigné)')
  t.is(result[2].label, 'Index déclarés — rejets')
})

test('les index par exploitation conservent les libellés et identités distincts fournis par l’API', t => {
  const parameters = ['001', '002'].map(countingCode => ({
    id: `index:exploitation:${countingCode}`, exploitationId: `exploitation-${countingCode}`,
    name: 'index', countingCode, label: `Index déclarés — Point partagé — Comptage ${countingCode}`
  }))
  const result = buildSeriesPresentations(parameters)
  t.deepEqual(result.map(item => item.label), parameters.map(item => item.label))
  t.deepEqual(result.map(item => item.exploitationId), parameters.map(item => item.exploitationId))
})
