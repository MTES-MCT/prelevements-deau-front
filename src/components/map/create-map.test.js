import test from 'ava'

import {createMap, MAP_UNAVAILABLE_MESSAGE} from './create-map.js'

function fixture() {
  const attributes = {}
  const element = {
    dataset: {},
    setAttribute(name, value) {
      attributes[name] = value
    }
  }
  const children = []
  const container = {
    querySelector: () => null,
    ownerDocument: {createElement: () => element},
    replaceChildren(child) {children.push(child)}
  }
  return {container, children, attributes}
}

test('une absence de WebGL 2 ne casse pas le reste du formulaire', t => {
  const {container, children, attributes} = fixture()
  class GPUInitializationError extends Error {
    name = 'GPUInitializationError'
  }

  const maplibre = {
    getVersion: () => '6.9.0',
    setWorkerUrl() {},
    Map: class {
      constructor() {
        throw new GPUInitializationError('WebGL unavailable')
      }
    }
  }
  t.is(createMap(maplibre, {container}), null)
  t.is(children[0].textContent, MAP_UNAVAILABLE_MESSAGE)
  t.is(attributes.role, 'status')
})

test('les erreurs de configuration ne sont pas masquées par le repli WebGL', t => {
  const {container} = fixture()
  const maplibre = {
    getVersion: () => '6.9.0',
    setWorkerUrl() {},
    Map: class {
      constructor() {
        throw new Error('Invalid style')
      }
    }
  }
  t.throws(() => createMap(maplibre, {container}), {message: 'Invalid style'})
})

test('une carte compatible reçoit les mêmes options sans être reconstruite', t => {
  const {container, children} = fixture()
  const options = {container, zoom: 12}
  class Map {
    constructor(value) {
      this.options = value
    }
  }

  let workerUrl
  const map = createMap({
    Map,
    getVersion: () => '6.9.0',
    setWorkerUrl(value) {
      workerUrl = value
    }
  }, options)
  t.is(map.options, options)
  t.is(workerUrl, '/maplibre/6.9.0/maplibre-gl-worker.mjs')
  t.is(children.length, 0)
})
