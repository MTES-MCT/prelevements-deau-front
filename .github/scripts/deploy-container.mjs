import {execFileSync} from 'node:child_process'
import {appendFileSync} from 'node:fs'
import {isDeepStrictEqual} from 'node:util'
import {setTimeout as delay} from 'node:timers/promises'
import {pathToFileURL} from 'node:url'
import {resolve} from 'node:path'

export const deployment = {
  application: 'prelevements-deau-front',
  projectId: '8b2f67a8-b474-4596-967f-fe1e0adba1b3',
  organizationId: 'aae4422f-c198-4638-b9e5-977938791f14',
  targets: {
    testing: {containerId: '275df624-d21d-4a27-9f28-d28b5fb0d63c', containerName: 'testing-prelevement-deau-front', namespaceId: 'bfb37e50-4bd4-42dc-94ca-2064f8b46898'},
    demo: {containerId: 'e3f57295-eef7-4b7f-a556-c20212535d11', containerName: 'demo-prelevement-deau-front', namespaceId: 'c90182ec-fb81-4fca-ad36-0e37ce351466'},
    prod: {containerId: '9e8f735f-c823-45a0-8e57-33f816c6bf30', containerName: 'prod-prelevement-deau-front', namespaceId: 'fa4179ac-8658-4440-963b-66d669a452d5'}
  }
}

export function deploymentTarget(options) {
  const {githubRepository, refName, refType} = options
  const target = Object.hasOwn(deployment.targets, refName ?? '') && deployment.targets[refName]
  if (githubRepository !== 'MTES-MCT/' + deployment.application || refType !== 'branch' || !target) {
    throw new Error('Dépôt GitHub ou branche de déploiement non autorisé.')
  }
  if (options.containerId !== target.containerId || options.projectId !== deployment.projectId
    || options.organizationId !== deployment.organizationId || options.region !== 'fr-par'
    || options.repository !== 'rg.fr-par.scw.cloud/' + deployment.application + '/' + deployment.application) {
    throw new Error('La cible ne correspond pas à l’application et à l’environnement attendus.')
  }
  return {...target, namespaceName: refName + '-partageons-leau'}
}

export function ciConfiguration(expectedEnvironment, env) {
  if (env.GITHUB_REF_NAME !== expectedEnvironment
    || !Object.hasOwn(deployment.targets, expectedEnvironment ?? '')
    || !env.SCW_ACCESS_KEY || !env.SCW_SECRET_KEY) {
    throw new Error('Branche de workflow incorrecte ou identifiants CI manquants.')
  }
  // Demo is repository-defined; testing and prod also cross-check their CI secret.
  if (expectedEnvironment !== 'demo' && !env.SCW_CONFIGURED_CONTAINER_ID) {
    throw new Error('Identifiant du conteneur CI manquant.')
  }
  const target = deploymentTarget({
    githubRepository: env.GITHUB_REPOSITORY, refName: env.GITHUB_REF_NAME, refType: env.GITHUB_REF_TYPE,
    containerId: env.SCW_CONFIGURED_CONTAINER_ID ?? deployment.targets[expectedEnvironment].containerId,
    projectId: env.SCW_CONFIGURED_PROJECT_ID, organizationId: env.SCW_CONFIGURED_ORGANIZATION_ID,
    region: env.SCW_DEFAULT_REGION ?? env.SCW_REGION,
    repository: env.SCW_REGISTRY_ENDPOINT + '/' + env.SCW_IMAGE_NAME
  })
  return {
    SCW_EXPECTED_PROJECT_ID: deployment.projectId,
    SCW_EXPECTED_ORGANIZATION_ID: deployment.organizationId,
    SCW_NAMESPACE_ID: target.namespaceId,
    SCW_NAMESPACE_NAME: target.namespaceName,
    SCW_CONTAINER_ID: target.containerId,
    SCW_CONTAINER_NAME: target.containerName
  }
}

export function scw(args) {
  // Never forward JSON responses or arguments: they can contain existing configuration.
  try {
    return JSON.parse(execFileSync('scw', [...args, '-o', 'json'], {
      encoding: 'utf8', timeout: 30 * 60_000, maxBuffer: 16 * 1024 * 1024, stdio: ['ignore', 'pipe', 'pipe']
    }))
  } catch {
    throw new Error('Échec de la commande Scaleway. Aucune configuration sensible affichée.')
  }
}

export function assertImmutableImage(image, repository) {
  if (!repository || !image?.startsWith(repository + '@sha256:') || !/@sha256:[a-f0-9]{64}$/.test(image)) {
    throw new Error('Image absente, mutable ou hors du dépôt attendu.')
  }
}

export function configuration(resource) {
  const keys = ['namespace_id', 'environment_variables', 'private_network_id', 'command', 'args',
    'port', 'privacy', 'protocol', 'https_connections_only', 'sandbox', 'min_scale', 'max_scale',
    'memory_limit_bytes', 'mvcpu_limit', 'local_storage_limit_bytes', 'timeout', 'scaling_option',
    'liveness_probe', 'startup_probe']
  return {
    ...Object.fromEntries(keys.map(key => [key, resource[key]])),
    secretKeys: Object.keys(resource.secret_environment_variables ?? {}).sort()
  }
}

export function assertConfigurationPreserved(before, after) {
  if (!isDeepStrictEqual(configuration(before), configuration(after))) {
    throw new Error('La configuration ou la liste des secrets a changé. Arrêt du déploiement.')
  }
}

export function healthEndpoint(endpoint) {
  const url = new URL(endpoint?.startsWith('https://') ? endpoint : 'https://' + endpoint)
  if (url.protocol !== 'https:' || url.username || url.password || url.port
    || url.pathname !== '/' || url.search || url.hash
    || !/\.(?:functions|containers)\.fnc\.(?:fr-par|nl-ams|pl-waw)\.scw\.cloud$/.test(url.hostname)) {
    throw new Error('Adresse de santé non autorisée.')
  }
  return url.origin
}

export async function deployContainer(options, dependencies = {}) {
  const execute = dependencies.scw ?? scw
  const request = dependencies.fetch ?? fetch
  const sleep = dependencies.delay ?? delay
  const {containerId, image, repository, region, projectId, healthPath} = options
  const target = deploymentTarget(options)
  assertImmutableImage(image, repository)
  if (!/^[a-f0-9-]{36}$/.test(containerId ?? '') || !projectId || !['fr-par', 'nl-ams', 'pl-waw'].includes(region)) {
    throw new Error('Cible de déploiement incomplète.')
  }
  if (!['/health', '/healthz'].includes(healthPath)) {
    throw new Error('Sonde de santé non autorisée.')
  }
  const before = execute(['container', 'container', 'get', containerId, 'region=' + region])
  if (before.id !== containerId || before.name !== target.containerName || before.namespace_id !== target.namespaceId) {
    throw new Error('Conteneur cible incohérent.')
  }
  const namespaceBefore = execute(['container', 'namespace', 'get', before.namespace_id, 'region=' + region])
  if (namespaceBefore.project_id !== projectId) {
    throw new Error('Le conteneur appartient à un autre projet.')
  }
  if (namespaceBefore.id !== target.namespaceId || namespaceBefore.name !== target.namespaceName
    || namespaceBefore.organization_id !== options.organizationId) {
    throw new Error('Le namespace ne correspond pas à l’environnement attendu.')
  }
  if (before.status !== 'ready') {
    throw new Error('Le conteneur doit être prêt avant un nouveau déploiement.')
  }

  // Omitted maps are preserved by Scaleway. Never send a partial env/secrets map.
  execute(['container', 'container', 'update', containerId, 'region=' + region, 'image=' + image, '--wait'])
  const after = execute(['container', 'container', 'get', containerId, 'region=' + region])
  const namespaceAfter = execute(['container', 'namespace', 'get', before.namespace_id, 'region=' + region])
  assertConfigurationPreserved(before, after)
  assertConfigurationPreserved(namespaceBefore, namespaceAfter)
  if (after.status !== 'ready' || after.image !== image || after.id !== containerId
    || after.name !== target.containerName || namespaceAfter.id !== target.namespaceId
    || namespaceAfter.name !== target.namespaceName || namespaceAfter.project_id !== projectId
    || namespaceAfter.organization_id !== options.organizationId) {
    throw new Error('Le conteneur ne sert pas encore l’image contrôlée.')
  }
  if (!after.public_endpoint || after.public_endpoint !== before.public_endpoint) {
    throw new Error('Adresse de santé absente ou modifiée.')
  }
  const healthOrigin = healthEndpoint(after.public_endpoint)
  for (let attempt = 0; attempt < 24; attempt++) {
    try {
      const response = await request(healthOrigin + healthPath, {
        signal: AbortSignal.timeout(15_000), redirect: 'error'
      })
      await response.body?.cancel()
      if (response.ok) {
        console.log('Image contrôlée déployée ; santé et configuration vérifiées.')
        return
      }
    } catch {
      // A cold start may need a few seconds. Do not print response bodies.
    }
    if (attempt < 23) await sleep(5000)
  }
  throw new Error('La sonde de santé ne répond pas après le déploiement.')
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try {
    if (process.argv[2] === '--check') {
      const configuration = ciConfiguration(process.argv[3], process.env)
      if (!process.env.GITHUB_ENV) throw new Error('Fichier d’environnement GitHub absent.')
      appendFileSync(process.env.GITHUB_ENV, Object.entries(configuration).map(([key, value]) => key + '=' + value).join('\n') + '\n')
    } else await deployContainer({
      containerId: process.argv[2], healthPath: process.argv[3],
      image: process.env.IMAGE_REF,
      repository: process.env.SCW_REGISTRY_ENDPOINT + '/' + process.env.SCW_IMAGE_NAME,
      region: process.env.SCW_DEFAULT_REGION ?? process.env.SCW_REGION,
      projectId: process.env.SCW_DEFAULT_PROJECT_ID,
      organizationId: process.env.SCW_DEFAULT_ORGANIZATION_ID,
      githubRepository: process.env.GITHUB_REPOSITORY,
      refName: process.env.GITHUB_REF_NAME,
      refType: process.env.GITHUB_REF_TYPE
    })
  } catch (error) {
    console.error(error.message)
    process.exitCode = 1
  }
}
