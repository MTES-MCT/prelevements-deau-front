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
    replaceChildren(child) {
      children.push(child)
    }
  }
  return {container, children, attributes}
}

test('une absence de WebGL 2 ne casse pas le reste du formulaire', t => {
  const {container, children, attributes} = fixture()
  const maplibre = {
    getVersion: () => '6.15.0',
    setWorkerUrl() {},
    Map: class {
      constructor() {
        const error = new Error('WebGL unavailable')
        error.name = 'GPUInitializationError'
        throw error
      }
    }
  }
  t.is(createMap(maplibre, {container}), null)
  t.is(children[0].textContent, MAP_UNAVAILABLE_MESSAGE)
  t.is(attributes.role, 'status')
})

test('les erreurs de configuration restent visibles', t => {
  const {container} = fixture()
  const maplibre = {
    getVersion: () => '6.15.0',
    setWorkerUrl() {},
    Map: class {
      constructor() {
        throw new Error('Invalid style')
      }
    }
  }
  t.throws(() => createMap(maplibre, {container}), {message: 'Invalid style'})
})

test('la carte conserve ses options et utilise le worker de la version installée', t => {
  const {container, children} = fixture()
  const options = {container, zoom: 12}
  let workerUrl
  const map = createMap({
    Map: class {
      constructor(value) {
        this.options = value
      }
    },
    getVersion: () => '6.15.0',
    setWorkerUrl(value) {
      workerUrl = value
    }
  }, options)
  t.is(map.options, options)
  t.is(workerUrl, '/maplibre/6.15.0/maplibre-gl-worker.mjs')
  t.is(children.length, 0)
})
