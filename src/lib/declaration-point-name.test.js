import test from 'ava'

import {
  getDeclarationPointDisplayName,
  getDeclarationPointTechnicalReference
} from './declaration-point-name.js'

const chunk = {
  pointPrelevementName: '36-4=1234',
  pointPrelevement: {
    name: '36-4=1234',
    usageName: 'Forage de la source'
  }
}

test('une saisie rapide côté déclarant privilégie le nom d’usage', t => {
  const source = {metadata: {manualQuickDeclaration: true}}

  t.is(
    getDeclarationPointDisplayName(chunk, source, {preferUsageName: true}),
    'Forage de la source'
  )
  t.is(
    getDeclarationPointTechnicalReference(chunk, source, {preferUsageName: true}),
    '36-4=1234'
  )
})

test('les autres sources et les vues agents conservent le nom technique', t => {
  t.is(
    getDeclarationPointDisplayName(chunk, {type: 'API'}, {preferUsageName: true}),
    '36-4=1234'
  )
  t.is(
    getDeclarationPointDisplayName(chunk, {metadata: {manualQuickDeclaration: true}}),
    '36-4=1234'
  )
})

test('le nom mémorisé dans la ligne reste le fallback sans point rattaché', t => {
  t.is(
    getDeclarationPointDisplayName(
      {pointPrelevementName: 'Point du fichier'},
      {metadata: {manualQuickDeclaration: true}},
      {preferUsageName: true}
    ),
    'Point du fichier'
  )
})
