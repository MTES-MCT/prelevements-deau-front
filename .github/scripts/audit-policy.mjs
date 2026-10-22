import {execFile} from 'node:child_process'
import {readFileSync} from 'node:fs'
import {mkdir, readFile, writeFile} from 'node:fs/promises'
import path from 'node:path'
import {fileURLToPath} from 'node:url'
import {promisify} from 'node:util'

export const EXCEPTIONS = JSON.parse(readFileSync(new URL('./security-exceptions.json', import.meta.url), 'utf8'))
export const RUNTIME_UI_PACKAGES = ['@codegouvfr/react-dsfr', '@mui/icons-material', '@mui/material', '@mui/material-nextjs', '@mui/system', '@mui/x-charts', '@mui/x-data-grid']
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value)
const ensure = (condition, message) => { if (!condition) throw new Error(message) }
const strings = value => Array.isArray(value) && value.length > 0 && value.every(item => typeof item === 'string' && item.length > 0)
const jsonLines = stdout => stdout.trim().split('\n').filter(Boolean).map(line => JSON.parse(line))

export function validatePolicies(policies) {
  const approved = {
    braces: {version: '3.0.3', advisory: 'GHSA-vfj7-8cjw-p6xm', roots: ['ava', 'eslint-config-xo-nextjs', 'xo']},
    'sprintf-js': {version: '1.0.3', advisory: 'GHSA-hp3w-g68c-fv3c', roots: ['ava']}
  }
  ensure(Array.isArray(policies) && policies.length === 2 && new Set(policies.map(policy => policy?.packageName)).size === 2, 'Deux exceptions distinctes autorisées uniquement.')
  for (const policy of policies) {
    const expected = approved[policy.packageName]
    ensure(expected && policy.version === expected.version
      && policy.advisoryUrl === 'https://github.com/advisories/' + expected.advisory
      && policy.expiresAt === '2026-10-27T23:00:00Z'
      && strings(policy.developmentRoots)
      && JSON.stringify([...policy.developmentRoots].sort()) === JSON.stringify(expected.roots), 'Politique hors autorisation du 22 octobre 2026.')
  }
}

export function parseAudit({stdout, exitCode}) {
  ensure(exitCode === 0 || exitCode === 1, 'Échec de Yarn audit (réseau, signal ou code inattendu).')
  const records = jsonLines(stdout)
  // Yarn 4.6 emits an empty NDJSON stream when no advisory is found.
  if (records.length === 0) {
    ensure(exitCode === 0, 'Rapport vide après un échec de Yarn audit.')
    return []
  }
  if (records.length === 1 && records[0].type === 'info' && records[0].data === 'No audit suggestions') {
    ensure(exitCode === 0, 'Code de sortie incohérent avec un audit sans alerte.')
    return []
  }
  for (const record of records) {
    const detail = record.children
    ensure(typeof record.value === 'string' && object(detail)
      && Number.isSafeInteger(detail.ID) && detail.ID > 0
      && typeof detail.URL === 'string' && detail.URL.startsWith('https://github.com/advisories/GHSA-')
      && ['info', 'low', 'moderate', 'high', 'critical'].includes(detail.Severity)
      && strings(detail['Tree Versions']) && strings(detail.Dependents), 'Rapport Yarn invalide ou incomplet.')
  }
  ensure(exitCode === 1, 'Yarn doit signaler les vulnérabilités par un code non nul.')
  return records
}

export function assertRuntimeClassification(manifest) {
  for (const name of RUNTIME_UI_PACKAGES) {
    ensure(typeof manifest.dependencies?.[name] === 'string' && !Object.hasOwn(manifest.devDependencies ?? {}, name),
      'La bibliothèque UI exécutée doit être auditée en production : ' + name)
  }
}

// Yarn why -R lists all direct roots leading to the target, even when shared
// subtrees are abbreviated. Check roots, not just the immediate dependent.
export function assertDevelopmentPaths(stdout, policy, manifest) {
  const roots = jsonLines(stdout)
  ensure(roots.length === 1 && roots[0].value === manifest.name + '@workspace:.' && object(roots[0].children), 'Arbre Yarn why incomplet ou workspace inattendu.')
  const entries = Object.entries(roots[0].children)
  ensure(entries.length > 0, 'Aucune chaîne de dépendances vérifiable.')
  let targetFound = false
  for (const [locator, node] of entries) {
    const name = /^(@[^/]+\/[^@]+|[^@]+)@/.exec(locator)?.[1]
    ensure(policy.developmentRoots.includes(name) && typeof manifest.devDependencies?.[name] === 'string'
      && !Object.hasOwn(manifest.dependencies ?? {}, name), 'Dépendance hors outils de développement autorisés : ' + name)
    const pending = [[locator, node]]
    let visited = 0
    while (pending.length) {
      const [key, current] = pending.pop()
      ensure(++visited < 10000 && object(current?.value) && current.value.locator === key && object(current.children), 'Arbre Yarn why mal formé.')
      if (current.value.locator === policy.packageName + '@npm:' + policy.version) targetFound = true
      pending.push(...Object.entries(current.children))
    }
  }
  ensure(targetFound, 'Version exemptée absente de l’arbre vérifié.')
}

export function evaluateAudits({all, production, why = {}, manifest, now = Date.now(), policies = EXCEPTIONS}) {
  validatePolicies(policies)
  assertRuntimeClassification(manifest)
  ensure(Number.isFinite(now), 'Date de contrôle invalide.')
  const runtimeIssues = parseAudit(production)
  ensure(runtimeIssues.length === 0, 'Aucune exception autorisée en production.')
  const issues = parseAudit(all)
  const waived = []
  const blocked = []
  for (const issue of issues) {
    const policy = policies.find(item => item.packageName === issue.value && item.advisoryUrl === issue.children.URL)
    if (!policy || !Number.isFinite(Date.parse(policy.expiresAt)) || now >= Date.parse(policy.expiresAt)
      || !issue.children['Tree Versions'].every(version => version === policy.version)) {
      blocked.push(issue.value + ': ' + issue.children.URL)
      continue
    }
    assertDevelopmentPaths(why[policy.packageName] ?? '', policy, manifest)
    waived.push(issue.value + '@' + policy.version)
  }
  return {ok: blocked.length === 0, production: 0, totalAdvisories: issues.length, waived, blocked}
}

async function invoke(execute, args, cwd) {
  try {
    const {stdout} = await execute('yarn', args, {cwd, encoding: 'utf8', timeout: 120000, maxBuffer: 20 * 1024 * 1024})
    return {stdout, exitCode: 0}
  } catch (error) {
    return {stdout: error.stdout ?? '', exitCode: error.code}
  }
}

export async function runAudit({cwd = process.cwd(), execute = promisify(execFile), now} = {}) {
  for (const key of ['npmAuditExcludePackages', 'npmAuditIgnoreAdvisories']) {
    const result = await invoke(execute, ['config', 'get', key, '--json'], cwd)
    ensure(result.exitCode === 0 && JSON.stringify(JSON.parse(result.stdout)) === '[]', 'Les exclusions globales Yarn sont interdites : ' + key)
  }
  const manifest = JSON.parse(await readFile(path.join(cwd, 'package.json'), 'utf8'))
  assertRuntimeClassification(manifest)
  const args = ['npm', 'audit', '--all', '--recursive', '--no-deprecations', '--json']
  const all = await invoke(execute, args, cwd)
  const production = await invoke(execute, [...args, '--environment', 'production'], cwd)
  const directory = path.join(cwd, '.artifacts/security')
  await mkdir(directory, {recursive: true})
  await writeFile(path.join(directory, 'yarn-audit-all.jsonl'), all.stdout, {mode: 0o600})
  await writeFile(path.join(directory, 'yarn-audit-production.jsonl'), production.stdout, {mode: 0o600})
  const issues = parseAudit(all)
  const why = {}
  for (const policy of EXCEPTIONS.filter(policy => issues.some(issue => issue.value === policy.packageName))) {
    const result = await invoke(execute, ['why', '--recursive', '--json', policy.packageName], cwd)
    ensure(result.exitCode === 0, 'Impossible de vérifier les chaînes de dépendances : ' + policy.packageName)
    why[policy.packageName] = result.stdout
    await writeFile(path.join(directory, 'yarn-why-' + policy.packageName + '.jsonl'), result.stdout, {mode: 0o600})
  }
  return evaluateAudits({all, production, why, manifest, now})
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const result = await runAudit()
    if (result.waived.length) console.warn('::warning::Exceptions temporaires jusqu’au 27 octobre 2026 inclus : ' + result.waived.join(', ') + '. Audit brut NON nul ; rapports conservés dans .artifacts/security.')
    console.log(JSON.stringify(result))
    if (!result.ok) process.exitCode = 1
  } catch (error) {
    console.error('Audit BLOQUÉ : ' + error.message)
    process.exitCode = 1
  }
}
