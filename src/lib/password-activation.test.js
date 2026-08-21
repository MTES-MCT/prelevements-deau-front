import test from 'ava'

import {
  PASSWORD_ACTIVATION_STORAGE_KEY,
  takePasswordActivationValue,
  takePasswordActivationValueOnce
} from './password-activation.js'

test('takePasswordActivationValue consomme puis efface la valeur éphémère', t => {
  const calls = []
  const storage = {
    getItem(key) {
      calls.push(['get', key])
      return 'opaque-value'
    },
    removeItem(key) {
      calls.push(['remove', key])
    }
  }

  t.is(takePasswordActivationValue(storage), 'opaque-value')
  t.deepEqual(calls, [
    ['get', PASSWORD_ACTIVATION_STORAGE_KEY],
    ['remove', PASSWORD_ACTIVATION_STORAGE_KEY]
  ])
})

test('takePasswordActivationValue échoue fermé si le stockage est indisponible', t => {
  const storage = {
    getItem() {
      throw new Error('storage disabled')
    },
    removeItem() {}
  }

  t.is(takePasswordActivationValue(storage), null)
})

test('takePasswordActivationValueOnce ne consomme pas deux fois en StrictMode', t => {
  const readState = {current: false}
  let reads = 0
  const storage = {
    getItem() {
      reads += 1
      return 'opaque-value'
    },
    removeItem() {}
  }

  t.is(takePasswordActivationValueOnce(storage, readState), 'opaque-value')
  t.is(takePasswordActivationValueOnce(storage, readState), undefined)
  t.is(reads, 1)
})
