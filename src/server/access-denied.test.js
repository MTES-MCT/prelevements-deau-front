import test from 'ava'

import {handleAccessDenied} from './access-denied.js'

test('retourne une erreur 403 sans rendre toute la page interdite en mode non bloquant', t => {
  let forbiddenRendered = false

  const result = handleAccessDenied({
    forbiddenOnAccessDenied: false,
    renderForbidden() {
      forbiddenRendered = true
    }
  })

  t.false(forbiddenRendered)
  t.deepEqual(result, {
    success: false,
    error: 'INSUFFICIENT_PERMISSIONS',
    code: 403
  })
})

test('rend la page interdite par défaut', t => {
  let forbiddenRendered = false

  handleAccessDenied({
    renderForbidden() {
      forbiddenRendered = true
    }
  })

  t.true(forbiddenRendered)
})
