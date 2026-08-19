import test from 'ava'

import {
  createSearchDraftState,
  editSearchDraft,
  receiveCanonicalSearchValue,
  registerLocalSearchNavigation
} from './search-draft.js'

const edit = (state, value) => editSearchDraft(state, value)
const navigate = (state, value) => registerLocalSearchNavigation(state, value)
const receive = (state, value) => receiveCanonicalSearchValue(state, value)

test('conserve les espaces du brouillon lors de l’acknowledgement canonique', t => {
  let state = createSearchDraftState()
  state = edit(state, 'ferme ')
  state = navigate(state, 'ferme')
  state = receive(state, 'ferme')

  t.is(state.value, 'ferme ')
})

test('ignore les réponses RSC locales pendant et après une saisie plus récente', t => {
  let state = createSearchDraftState()

  state = edit(state, 'ferm')
  state = navigate(state, 'ferm')
  state = edit(state, 'ferme')
  state = navigate(state, 'ferme')
  state = edit(state, 'ferme ')

  state = receive(state, 'ferm')
  t.is(state.value, 'ferme ')

  state = edit(state, 'ferme beauvert')
  state = receive(state, 'ferme')
  t.is(state.value, 'ferme beauvert')
  t.is(state.pendingNavigations.length, 0)
})

test('resynchronise explicitement une navigation externe même si sa valeur est connue', t => {
  let state = createSearchDraftState()
  state = edit(state, 'ferm')
  state = navigate(state, 'ferm')
  state = edit(state, 'ferme beauvert')

  state = receiveCanonicalSearchValue(state, 'ferm', {externalNavigation: true})

  t.is(state.value, 'ferm')
})

test('resynchronise une valeur canonique inconnue comme navigation externe', t => {
  let state = createSearchDraftState('ferme')
  state = edit(state, 'ferme beauvert')
  state = receive(state, 'captage')

  t.is(state.value, 'captage')
})
