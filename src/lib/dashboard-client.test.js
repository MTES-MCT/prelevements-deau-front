import test from 'ava'

import {createDashboardClient} from './dashboard-client.js'

function controlledClient(options = {}) {
  const requests = []
  const load = createDashboardClient({...options, fetchImpl: (url, init) => {
    const pending = Promise.withResolvers()
    requests.push({url, init, ...pending})
    init.signal.addEventListener('abort', () => pending.reject(init.signal.reason), {once: true})
    return pending.promise
  }})
  return {load, requests}
}

test('lectures distinctes parallèles, concurrence bornée et déduplication uniquement en vol', async t => {
  const {load, requests} = controlledClient({concurrency: 2})
  const first = load('territory?zones=a')
  const duplicate = load('territory?zones=a')
  const second = load('water-resources/flows?zones=a')
  const third = load('map?scope=territory')
  t.is(requests.length, 2)
  t.is(requests[0].init.credentials, 'same-origin')
  t.is(requests[0].init.cache, 'no-store')
  requests[0].resolve(Response.json({value: 1}))
  t.deepEqual(await first, {value: 1})
  t.deepEqual(await duplicate, {value: 1})
  await new Promise(resolve => setImmediate(resolve))
  t.is(requests.length, 3)
  requests[1].resolve(Response.json({value: 2}))
  requests[2].resolve(Response.json({value: 3}))
  await Promise.all([second, third])
  const fresh = load('territory?zones=a')
  await new Promise(resolve => setImmediate(resolve))
  t.is(requests.length, 4)
  requests[3].resolve(Response.json({value: 4}))
  t.deepEqual(await fresh, {value: 4})
})

test('annuler un abonné préserve la lecture partagée puis annuler le dernier coupe le réseau', async t => {
  const {load, requests} = controlledClient()
  const one = new AbortController()
  const two = new AbortController()
  const first = t.throwsAsync(load('map', {signal: one.signal}), {name: 'AbortError'})
  const second = t.throwsAsync(load('map', {signal: two.signal}), {name: 'AbortError'})
  one.abort()
  await first
  t.false(requests[0].init.signal.aborted)
  two.abort()
  await second
  t.true(requests[0].init.signal.aborted)
})

test('une lecture annulée avant son tour quitte la file sans requête réseau', async t => {
  const {load, requests} = controlledClient({concurrency: 1})
  const first = load('territory')
  const controller = new AbortController()
  const queued = t.throwsAsync(load('map', {signal: controller.signal}), {name: 'AbortError'})
  controller.abort()
  await queued
  requests[0].resolve(Response.json({value: 1}))
  await first
  await new Promise(resolve => setImmediate(resolve))
  t.is(requests.length, 1)
})

test('une nouvelle lecture ne réutilise pas la requête annulée du même périmètre', async t => {
  const {load, requests} = controlledClient()
  const controller = new AbortController()
  const previous = t.throwsAsync(load('territory', {signal: controller.signal}), {name: 'AbortError'})
  controller.abort()
  const next = load('territory')
  requests[1].resolve(Response.json({current: true}))
  await previous
  t.deepEqual(await next, {current: true})
})

test('la file d’attente est bornée', async t => {
  const {load, requests} = controlledClient({concurrency: 1, maxQueued: 1})
  const first = load('territory')
  const queued = load('map')
  await t.throwsAsync(load('water-resources/flows'), {message: /Trop de lectures/})
  requests[0].resolve(Response.json({}))
  await first
  await new Promise(resolve => setImmediate(resolve))
  requests[1].resolve(Response.json({}))
  await queued
})

for (const status of [401, 403, 503]) {
  test(`une erreur HTTP ${status} reste une erreur et libère la lecture pour un nouvel essai`, async t => {
    let count = 0
    const load = createDashboardClient({fetchImpl: async () => ++count === 1
      ? new Response('<html>error</html>', {status})
      : Response.json({value: 0})})
    const error = await t.throwsAsync(load('territory'))
    t.is(error.code, status)
    t.false(error.message.includes('<html>'))
    t.deepEqual(await load('territory'), {value: 0})
  })
}
