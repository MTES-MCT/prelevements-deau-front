import assert from 'node:assert/strict'
import test from 'node:test'
import {assertConfigurationPreserved, assertImmutableImage, ciConfiguration, deployContainer, deployment, deploymentTarget, healthEndpoint} from './deploy-container.mjs'

const repository = 'rg.fr-par.scw.cloud/' + deployment.application + '/' + deployment.application
const image = repository + '@sha256:' + 'a'.repeat(64)
const containerId = deployment.targets.prod.containerId
const projectId = deployment.projectId
const organizationId = deployment.organizationId
const namespace = {id: deployment.targets.prod.namespaceId, name: 'prod-partageons-leau',
  project_id: projectId, organization_id: organizationId, environment_variables: {NS: 'kept'}}
const container = {id: containerId, name: deployment.targets.prod.containerName, namespace_id: namespace.id,
  public_endpoint: 'https://test.functions.fnc.fr-par.scw.cloud',
  environment_variables: {EXISTING: 'preserved'}, secret_environment_variables: {TOKEN: 'redacted'},
  command: ['node', 'worker.js'], private_network_id: 'network', status: 'ready'}
const options = {containerId, image, repository, region: 'fr-par', projectId, organizationId, healthPath: '/healthz',
  githubRepository: 'MTES-MCT/' + deployment.application, refName: 'prod', refType: 'branch'}

test('sonde HTTPS sur un endpoint Scaleway, sans redirection ni identifiants', () => {
  assert.equal(healthEndpoint('service.containers.fnc.fr-par.scw.cloud'), 'https://service.containers.fnc.fr-par.scw.cloud')
  for (const endpoint of ['http://example.test', 'https://example.test', 'https://user:password@test.functions.fnc.fr-par.scw.cloud',
    'https://test.functions.fnc.fr-par.scw.cloud?token=secret']) {
    assert.throws(() => healthEndpoint(endpoint))
  }
})

test('refuse une image mutable ou issue d’un autre dépôt', () => {
  assertImmutableImage(image, repository)
  assert.throws(() => assertImmutableImage(repository + ':latest', repository))
  assert.throws(() => assertImmutableImage(image, 'another/repository'))
})

test('détecte suppression de variable, de secret ou changement de commande', () => {
  assertConfigurationPreserved(container, structuredClone(container))
  for (const mutation of [
    {environment_variables: {}}, {secret_environment_variables: {}}, {command: ['node', 'api.js']},
    {memory_limit_bytes: 512 * 1024 * 1024}, {mvcpu_limit: 2000},
    {liveness_probe: {http: {path: '/another'}}}, {startup_probe: {failure_threshold: 99}}
  ]) assert.throws(() => assertConfigurationPreserved(container, {...container, ...mutation}))
})

function fakeCloud({cloudProjectId = projectId, mutate = {}, before = {}, namespaceBefore = {}} = {}) {
  const calls = []
  let updated = false
  return {calls, scw(args) {
    calls.push(args)
    if (args[1] === 'namespace') return {...namespace, project_id: cloudProjectId, ...namespaceBefore}
    if (args[2] === 'update') {
      updated = true
      return {}
    }
    return updated ? {...container, image, ...mutate} : {...structuredClone(container), ...before}
  }}
}

test('ne transmet ni secrets ni variables et vérifie le digest ainsi que la santé', async () => {
  const cloud = fakeCloud()
  let healthChecks = 0
  await deployContainer(options, {...cloud, fetch: async () => { healthChecks++; return {ok: true} }})
  const update = cloud.calls.find(args => args[2] === 'update')
  assert.deepEqual(update, ['container', 'container', 'update', containerId, 'region=fr-par', 'image=' + image, '--wait'])
  assert.equal(healthChecks, 1)
})

test('aucune écriture si le projet ne correspond pas', async () => {
  const cloud = fakeCloud({cloudProjectId: 'wrong'})
  await assert.rejects(deployContainer(options, cloud), /autre projet/)
  assert.equal(cloud.calls.some(args => args[2] === 'update'), false)
})

test('refuse les autres environnements du même projet avant toute lecture ou écriture cloud', async () => {
  for (const mutation of [
    {containerId: deployment.targets.testing.containerId},
    {containerId: deployment.targets.demo.containerId},
    {refName: 'demo'}, {refName: 'testing'}, {refName: 'main'}, {refType: 'tag'},
    {githubRepository: 'another/prelevements-deau-front'}, {githubRepository: 'MTES-MCT/' + (deployment.application === 'prelevements-deau-front' ? 'partageonsleau-orchestration' : 'prelevements-deau-front')},
    {organizationId: 'another'}, {repository: 'rg.fr-par.scw.cloud/another/image'}
  ]) {
    const cloud = fakeCloud()
    await assert.rejects(deployContainer({...options, ...mutation}, cloud), /autorisé|attendus/)
    assert.equal(cloud.calls.length, 0)
  }
})

test('refuse une réponse cloud d’un autre namespace ou conteneur du même projet', async () => {
  for (const fixture of [
    {before: {namespace_id: deployment.targets.demo.namespaceId}},
    {before: {name: deployment.targets.demo.containerName}},
    {before: {status: 'pending'}},
    {namespaceBefore: {id: deployment.targets.demo.namespaceId}},
    {namespaceBefore: {name: 'demo-partageons-leau'}},
    {namespaceBefore: {organization_id: 'another'}}
  ]) {
    const cloud = fakeCloud(fixture)
    await assert.rejects(deployContainer(options, cloud), /incohérent|attendu|prêt/)
    assert.equal(cloud.calls.some(args => args[2] === 'update'), false)
  }
})

test('autorise uniquement les trois environnements de ce dépôt', () => {
  assert.deepEqual(Object.keys(deployment.targets), ['testing', 'demo', 'prod'])
  for (const [refName, target] of Object.entries(deployment.targets)) {
    const selection = {...options, refName, containerId: target.containerId}
    assert.equal(deploymentTarget(selection).namespaceId, target.namespaceId)
    assert.throws(() => deploymentTarget({...selection, refName: refName === 'prod' ? 'demo' : 'prod'}), /attendus/)
  }
})

test('la sélection CI vérifie les secrets configurés et exporte seulement la cible validée', () => {
  const env = {
    GITHUB_REPOSITORY: options.githubRepository, GITHUB_REF_NAME: 'prod', GITHUB_REF_TYPE: 'branch',
    SCW_ACCESS_KEY: 'synthetic-access', SCW_SECRET_KEY: 'synthetic-secret',
    SCW_CONFIGURED_PROJECT_ID: projectId, SCW_CONFIGURED_ORGANIZATION_ID: organizationId,
    SCW_CONFIGURED_CONTAINER_ID: containerId, SCW_REGION: 'fr-par',
    SCW_REGISTRY_ENDPOINT: 'rg.fr-par.scw.cloud/' + deployment.application, SCW_IMAGE_NAME: deployment.application
  }
  assert.deepEqual(ciConfiguration('prod', env), {
    SCW_EXPECTED_PROJECT_ID: projectId, SCW_EXPECTED_ORGANIZATION_ID: organizationId,
    SCW_NAMESPACE_ID: namespace.id, SCW_NAMESPACE_NAME: namespace.name,
    SCW_CONTAINER_ID: containerId, SCW_CONTAINER_NAME: container.name
  })
  for (const mutation of [
    {GITHUB_REF_NAME: 'testing'}, {GITHUB_REF_TYPE: 'tag'}, {SCW_SECRET_KEY: ''},
    {SCW_CONFIGURED_CONTAINER_ID: ''}, {SCW_CONFIGURED_CONTAINER_ID: deployment.targets.testing.containerId},
    {SCW_CONFIGURED_PROJECT_ID: 'another'}, {SCW_CONFIGURED_ORGANIZATION_ID: 'another'},
    {SCW_REGION: 'nl-ams'}, {SCW_IMAGE_NAME: 'another'}
  ]) assert.throws(() => ciConfiguration('prod', {...env, ...mutation}))
  assert.throws(() => ciConfiguration('testing', env))
  assert.equal(ciConfiguration('demo', {
    ...env, GITHUB_REF_NAME: 'demo', SCW_CONFIGURED_CONTAINER_ID: undefined
  }).SCW_CONTAINER_ID, deployment.targets.demo.containerId)
})

test('arrêt si le fournisseur a perdu une variable ou si la santé échoue', async () => {
  await assert.rejects(deployContainer(options, fakeCloud({mutate: {environment_variables: {}}})), /configuration/)
  await assert.rejects(deployContainer(options, {
    ...fakeCloud(), fetch: async () => ({ok: false}), delay: async () => {}
  }), /sonde de santé/)
})
