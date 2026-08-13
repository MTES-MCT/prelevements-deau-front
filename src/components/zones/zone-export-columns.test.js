import test from 'ava'

import {getZoneDeclarantExportColumns} from './zone-export-columns.js'

function getColumn(columns, label) {
  return columns.find(column => column.label === label)
}

test('l’export des préleveurs expose le type métier et distingue le type de personne', t => {
  const columns = getZoneDeclarantExportColumns()
  const labels = new Set(columns.map(column => column.label))
  const declarant = {
    declarantRole: 'PRELEVEUR',
    preleveurType: 'GESTIONNAIRE_AEP',
    declarantType: 'LEGAL_PERSON'
  }

  t.true(labels.has('Type de préleveur'))
  t.false(labels.has('Type'))
  t.is(getColumn(columns, 'Type de préleveur').value(declarant), 'Gestionnaire AEP')
  t.is(getColumn(columns, 'Type de personne').value(declarant), 'Personne morale')
})

test('l’export des collecteurs ne propose pas le type de préleveur', t => {
  const columns = getZoneDeclarantExportColumns({collecteursOnly: true})

  t.false(columns.some(column => column.label === 'Type de préleveur'))
  t.true(columns.some(column => column.label === 'Type de personne'))
})
