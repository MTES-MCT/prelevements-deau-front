import test from 'ava'

import {normalizeCampaignCrops} from './campaign-crops.js'

test('les catégories et les cultures restent des choix indépendants, ordonnés et sans doublons', t => {
  t.deepEqual(normalizeCampaignCrops(['Céréales', 'Maïs grain', 'Blé', 'Maïs grain', 'Oléagineux']), ['Céréales', 'Maïs grain', 'Blé', 'Oléagineux'])
})

test('les libellés connus retrouvent leur casse et leurs accents', t => {
  t.deepEqual(normalizeCampaignCrops([' cereales ', 'MAIS GRAIN', 'ble', 'BLÉ', 'aucune']), ['Céréales', 'Maïs grain', 'Blé', 'Aucune'])
})

test('le texte libre historique est conservé en entier, sans découpage arbitraire', t => {
  t.deepEqual(normalizeCampaignCrops('  Mélange local : maïs, sorgho / trèfle  '), ['Mélange local : maïs, sorgho / trèfle'])
  t.deepEqual(normalizeCampaignCrops(['Mélange local', 'Blé', 'Mélange local']), ['Mélange local', 'Blé'])
})

test('une absence de cultures reste vide et la normalisation ne modifie pas la source', t => {
  for (const value of [undefined, null, '', '   ', [], [null, undefined, 0, false, {}, []]]) t.deepEqual(normalizeCampaignCrops(value), [])
  const original = [' ble ', '', 'Luzerne']
  t.deepEqual(normalizeCampaignCrops(original), ['Blé', 'Luzerne'])
  t.deepEqual(original, [' ble ', '', 'Luzerne'])
})
