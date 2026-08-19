import test from 'ava'

import {
  getCanonicalTextFilterValue,
  registerPendingTextFilterNavigation,
  reconcileTextFilterDraft,
  reconcileTextFilterSnapshotDrafts,
  withTextFilterSnapshot
} from './text-filter-draft.js'

test('la valeur canonique ne modifie pas la saisie affichée', t => {
  t.is(getCanonicalTextFilterValue(' ferme '), 'ferme')
  t.is(reconcileTextFilterDraft('ferme ', 'ferme'), 'ferme ')
})

test('une réponse tardive connue ne remplace pas une saisie plus récente', t => {
  t.is(
    reconcileTextFilterDraft('ferme beau', 'ferme', ['ferme']),
    'ferme beau'
  )
})

test('une navigation externe différente remplace le brouillon local', t => {
  t.is(reconcileTextFilterDraft('ferme', 'moulin', []), 'moulin')
})

test('les réponses croisées conservent le brouillon des deux filtres', t => {
  const firstNavigation = {declarant: 'ferme', dossierNumber: ''}
  const secondNavigation = {declarant: 'ferme', dossierNumber: '123'}
  const pendingNavigations = [firstNavigation, secondNavigation]
  const latestResponse = reconcileTextFilterSnapshotDrafts(
    secondNavigation,
    secondNavigation,
    pendingNavigations
  )

  const lateFirstResponse = reconcileTextFilterSnapshotDrafts(
    latestResponse.drafts,
    firstNavigation,
    latestResponse.pendingNavigations
  )

  t.deepEqual(latestResponse.drafts, secondNavigation)
  t.deepEqual(lateFirstResponse.drafts, secondNavigation)
  t.true(lateFirstResponse.isOwnResponse)
  t.deepEqual(lateFirstResponse.pendingNavigations, [])
})

test('une action immédiate embarque les deux brouillons avant leur debounce', t => {
  t.deepEqual(
    withTextFilterSnapshot(
      {startDate: '2026-08-01', types: 'MANUAL'},
      {declarant: 'ferme ', dossierNumber: '123'}
    ),
    {
      declarant: 'ferme',
      dossierNumber: '123',
      startDate: '2026-08-01',
      types: 'MANUAL'
    }
  )
})

test('les navigations en attente sont dédupliquées et bornées', t => {
  let pendingNavigations = []

  for (let index = 0; index < 12; index += 1) {
    pendingNavigations = registerPendingTextFilterNavigation(
      pendingNavigations,
      {declarant: `ferme ${index}`, dossierNumber: String(index)},
      {limit: 4}
    )
  }

  pendingNavigations = registerPendingTextFilterNavigation(
    pendingNavigations,
    {declarant: 'ferme 11', dossierNumber: '11'},
    {limit: 4}
  )

  t.is(pendingNavigations.length, 4)
  t.deepEqual(pendingNavigations.at(-1), {declarant: 'ferme 11', dossierNumber: '11'})
  t.is(
    pendingNavigations.filter(navigation => navigation.declarant === 'ferme 11').length,
    1
  )
})
