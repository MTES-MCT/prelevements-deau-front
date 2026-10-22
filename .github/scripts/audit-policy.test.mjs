import test from 'node:test'
import assert from 'node:assert/strict'
import {mkdtemp, readFile, rm, writeFile} from 'node:fs/promises'
import {tmpdir} from 'node:os'
import path from 'node:path'
import {EXCEPTIONS, RUNTIME_UI_PACKAGES, evaluateAudits, parseAudit, assertDevelopmentPaths, assertRuntimeClassification, runAudit} from './audit-policy.mjs'

const manifest = {name: 'prelevements-deau-front', dependencies: Object.fromEntries(RUNTIME_UI_PACKAGES.map(name => [name, '1.0.0'])), devDependencies: {ava: '^6.4.1', xo: '^0.59.3'}}
const now = Date.parse('2026-10-22T12:00:00Z')
const clean = {stdout: JSON.stringify({type: 'info', name: 1, displayName: 'YN0001', data: 'No audit suggestions'}), exitCode: 0}
const issue = policy => ({value: policy.packageName, children: {ID: 123, URL: policy.advisoryUrl, Severity: 'high', 'Tree Versions': [policy.version], Dependents: ['micromatch@npm:4.0.8']}})
const report = issues => ({stdout: issues.map(item => JSON.stringify(item)).join('\n'), exitCode: 1})
function tree(policy, root = 'ava') {
  const target = policy.packageName + '@npm:' + policy.version
  return JSON.stringify({value: manifest.name + '@workspace:.', children: {[root + '@npm:6.4.1']: {value: {locator: root + '@npm:6.4.1'}, children: {[target]: {value: {locator: target}, children: {}}}}}})
}
const fixture = () => ({all: report(EXCEPTIONS.map(issue)), production: clean, why: Object.fromEntries(EXCEPTIONS.map(policy => [policy.packageName, tree(policy)])), manifest: structuredClone(manifest), now})

test('les deux exceptions précises passent et le total brut reste explicite', () => {
  assert.deepEqual(evaluateAudits(fixture()), {ok: true, production: 0, totalAdvisories: 2, waived: ['braces@3.0.3', 'sprintf-js@1.0.3'], blocked: []})
})

test('un audit réellement vide passe même après expiration', () => {
  assert.equal(evaluateAudits({...fixture(), all: clean, now: Date.parse('2026-11-01')}).ok, true)
  assert.deepEqual(parseAudit({stdout: '', exitCode: 0}), [])
})

for (const [index, mutate] of [
  input => { input.all = {...input.all, exitCode: 0} },
  input => { input.all = {...input.all, exitCode: 'ETIMEDOUT'} },
  input => { input.all = {stdout: '', exitCode: 1} },
  input => { input.all = {stdout: '{', exitCode: 1} },
  input => { input.all = {stdout: JSON.stringify({type: 'error', data: 'Request failed'}), exitCode: 1} },
  input => { input.production = input.all },
  input => { input.production = {...clean, exitCode: 1} },
  input => { input.now = Number.NaN },
  input => { input.why.braces = '' }
].entries()) {
  test('rapport incomplet, réseau ou preuve production invalide restent bloquants (cas ' + (index + 1) + ')', () => {
    const input = fixture()
    mutate(input)
    assert.throws(() => evaluateAudits(input))
  })
}

test('expiration au 28 octobre minuit Paris, sans délai supplémentaire', () => {
  assert.equal(evaluateAudits({...fixture(), now: Date.parse('2026-10-27T22:59:59Z')}).ok, true)
  assert.equal(evaluateAudits({...fixture(), now: Date.parse('2026-10-27T23:00:00Z')}).ok, false)
})

for (const [label, mutate] of [
  ['nouvel avis sur braces', value => { value.children.URL = 'https://github.com/advisories/GHSA-new-new-new' }],
  ['autre version', value => { value.children['Tree Versions'] = ['3.0.4'] }],
  ['version mixte', value => { value.children['Tree Versions'].push('2.3.2') }],
  ['autre paquet', value => { value.value = 'another-package' }]
]) {
  test(label + ' ne bénéficie pas de l’exception', () => {
    const value = issue(EXCEPTIONS[0])
    mutate(value)
    assert.equal(evaluateAudits({...fixture(), all: report([value])}).ok, false)
  })
}

test('ne peut pas classer une bibliothèque UI runtime comme développement', () => {
  for (const name of RUNTIME_UI_PACKAGES) {
    const altered = structuredClone(manifest)
    altered.devDependencies[name] = altered.dependencies[name]
    delete altered.dependencies[name]
    assert.throws(() => assertRuntimeClassification(altered))
  }
})

test('un chemin runtime ou un nouvel outil de développement ne sont pas exemptés', () => {
  const policy = EXCEPTIONS[0]
  assert.throws(() => assertDevelopmentPaths(tree(policy, 'next'), policy, {...manifest, dependencies: {...manifest.dependencies, next: '15.5.28'}}))
  assert.throws(() => assertDevelopmentPaths(tree(policy, 'new-tool'), policy, {...manifest, devDependencies: {...manifest.devDependencies, 'new-tool': '1'}}))
  assert.throws(() => assertDevelopmentPaths(tree(policy), policy, {...manifest, dependencies: {...manifest.dependencies, ava: '6.4.1'}}))
})

test('arbres absents, workspace inconnu et version non prouvée échouent', () => {
  const policy = EXCEPTIONS[0]
  for (const stdout of ['', '{}', tree(policy).replace('@workspace:.', '@workspace:other'), tree(policy).replaceAll('braces@npm:3.0.3', 'braces@npm:2.0.0')]) {
    assert.throws(() => assertDevelopmentPaths(stdout, policy, manifest))
  }
})

test('un message info ne peut pas masquer une vulnérabilité', () => {
  assert.throws(() => parseAudit({stdout: clean.stdout + '\n' + report([issue(EXCEPTIONS[0])]).stdout, exitCode: 1}))
})

test('le runner audite toutes les dépendances et conserve les preuves brutes', async t => {
  const cwd = await mkdtemp(path.join(tmpdir(), 'reunion-yarn-audit-test-'))
  t.after(() => rm(cwd, {recursive: true, force: true}))
  await writeFile(path.join(cwd, 'package.json'), JSON.stringify(manifest))
  const input = fixture()
  const calls = []
  const execute = async (command, args) => {
    assert.equal(command, 'yarn')
    calls.push(args)
    if (args[0] === 'config') return {stdout: '[]'}
    if (args[0] === 'why') return {stdout: input.why[args.at(-1)]}
    if (args.includes('production')) return {stdout: ''}
    throw Object.assign(new Error('Audit reports vulnerabilities'), {code: 1, stdout: input.all.stdout})
  }
  const result = await runAudit({cwd, execute, now})
  assert.equal(result.waived.length, 2)
  assert.deepEqual(calls.slice(0, 2), [
    ['config', 'get', 'npmAuditExcludePackages', '--json'],
    ['config', 'get', 'npmAuditIgnoreAdvisories', '--json']
  ])
  const auditArgs = ['npm', 'audit', '--all', '--recursive', '--no-deprecations', '--json']
  assert.deepEqual(calls[2], auditArgs)
  assert.deepEqual(calls[3], [...auditArgs, '--environment', 'production'])
  assert.deepEqual(calls.slice(4), EXCEPTIONS.map(policy => ['why', '--recursive', '--json', policy.packageName]))
  assert.equal(await readFile(path.join(cwd, '.artifacts/security/yarn-audit-all.jsonl'), 'utf8'), input.all.stdout)
  assert.equal(await readFile(path.join(cwd, '.artifacts/security/yarn-audit-production.jsonl'), 'utf8'), '')
})

for (const key of ['npmAuditExcludePackages', 'npmAuditIgnoreAdvisories']) {
  test('la configuration ne peut pas masquer des avis : ' + key, async () => {
    let auditStarted = false
    const execute = async (_, args) => {
      if (args[0] !== 'config') auditStarted = true
      return {stdout: args.includes(key) ? '["braces"]' : '[]'}
    }
    await assert.rejects(runAudit({execute}), /exclusions globales Yarn/)
    assert.equal(auditStarted, false)
  })
}

for (const [label, mutate] of [
  ['échéance prolongée', policies => { policies[0].expiresAt = '2026-10-28T23:00:00Z' }],
  ['version élargie', policies => { policies[0].version = '3.0.4' }],
  ['avis remplacé', policies => { policies[0].advisoryUrl += '-new' }],
  ['nouvelle racine', policies => { policies[0].developmentRoots.push('next') }],
  ['exception supplémentaire', policies => { policies.push(policies[0]) }],
  ['doublon', policies => { policies[1] = policies[0] }]
]) {
  test('la politique ne peut pas élargir l’autorisation : ' + label, () => {
    const policies = structuredClone(EXCEPTIONS)
    mutate(policies)
    assert.throws(() => evaluateAudits({...fixture(), policies}), /exception|autorisation/i)
  })
}

test('une clé d’outil dev ne peut pas dissimuler un locator runtime', () => {
  const policy = EXCEPTIONS[0]
  const forged = JSON.parse(tree(policy))
  forged.children['ava@npm:6.4.1'].value.locator = 'next@npm:15.5.28'
  assert.throws(() => assertDevelopmentPaths(JSON.stringify(forged), policy, manifest), /mal formé/)
})
