import assert from 'node:assert/strict'
import {createHash} from 'node:crypto'
import {createReadStream} from 'node:fs'
import {readFile, writeFile} from 'node:fs/promises'
import {resolve} from 'node:path'
import {pathToFileURL} from 'node:url'

const parts = ['shard-1', 'shard-2', 'shard-3', 'shard-4', 'spreadsheet']
const projects = ['chromium', 'webkit', 'mobile', 'large-spreadsheet']

function identity(env) {
  assert.match(env.GITHUB_SHA ?? '', /^[a-f0-9]{40}$/)
  assert.match(env.GITHUB_RUN_ID ?? '', /^\d+$/)
  assert.match(env.GITHUB_RUN_ATTEMPT ?? '', /^[1-9]\d*$/)
  return {sha: env.GITHUB_SHA, runId: env.GITHUB_RUN_ID, attempt: env.GITHUB_RUN_ATTEMPT}
}

function assertIdentity(report, env) {
  assert.equal(report.version, 1)
  for (const [key, value] of Object.entries(identity(env))) assert.equal(report[key], value, `Wrong ${key}`)
  assert.equal(report.status, 'passed', 'Browser job did not pass')
  assert.equal(report.errors, 0, 'Browser infrastructure errors')
}

function uniqueTests(tests) {
  assert.ok(Array.isArray(tests) && tests.length > 0, 'Empty browser inventory')
  const map = new Map()
  for (const test of tests) {
    assert.ok(typeof test.id === 'string' && test.id.length > 0)
    assert.ok(projects.includes(test.project), 'Unknown browser project')
    assert.ok(['passed', 'failed', 'skipped'].includes(test.expectedStatus))
    assert.ok(!map.has(test.id), 'Duplicate test ID')
    map.set(test.id, test)
  }
  return map
}

export function verifyCoverage(inventory, reports, env) {
  assertIdentity(inventory, env)
  assert.equal(inventory.part, 'inventory')
  assert.deepEqual(inventory.results, [])
  const expected = uniqueTests(inventory.tests)
  assert.deepEqual([...new Set(inventory.tests.map(test => test.project))].sort(), [...projects].sort())
  assert.deepEqual(reports.map(report => report.part).sort(), [...parts].sort(), 'Missing or duplicate shard report')
  const seen = new Set()
  for (const report of reports) {
    assertIdentity(report, env)
    const selected = uniqueTests(report.tests)
    assert.equal(report.results.length, selected.size, 'A test was omitted or retried')
    for (const result of report.results) {
      const test = selected.get(result.id)
      assert.ok(test, 'Unexpected result')
      assert.deepEqual(test, expected.get(result.id), 'Unknown or changed test')
      assert.equal(test.project === 'large-spreadsheet', report.part === 'spreadsheet', 'Wrong project in shard')
      assert.ok(!seen.has(result.id), 'Test executed more than once')
      assert.ok(['passed', 'failed', 'skipped'].includes(result.expectedStatus), 'Missing runtime expectation')
      assert.equal(result.status, result.expectedStatus, 'Unexpected test outcome')
      seen.add(result.id)
    }
  }
  assert.equal(seen.size, expected.size, 'Incomplete browser coverage')
  return {tests: seen.size, projects: projects.length, parts: parts.length}
}

async function hashFile(filename) {
  const hash = createHash('sha256')
  for await (const chunk of createReadStream(filename)) hash.update(chunk)
  return hash.digest('hex')
}

export async function buildProof(directory, env) {
  return {version: 1, ...identity(env),
    archiveSha256: await hashFile(resolve(directory, 'browser-build.tar.gz')),
    inventorySha256: await hashFile(resolve(directory, 'inventory.json'))}
}

export async function verifyBuild(directory, env) {
  const proof = JSON.parse(await readFile(resolve(directory, 'build-proof.json'), 'utf8'))
  assert.deepEqual(proof, await buildProof(directory, env), 'Wrong or corrupted synthetic build')
}

async function main() {
  const [command, directory, reportsDirectory] = process.argv.slice(2)
  if (command === 'seal') {
    await writeFile(resolve(directory, 'build-proof.json'), JSON.stringify(await buildProof(directory, process.env)) + '\n', {flag: 'wx'})
  } else if (command === 'verify-build') {
    await verifyBuild(directory, process.env)
  } else if (command === 'coverage') {
    await verifyBuild(directory, process.env)
    const inventory = JSON.parse(await readFile(resolve(directory, 'inventory.json'), 'utf8'))
    const reports = await Promise.all(parts.map(async part => JSON.parse(await readFile(resolve(reportsDirectory, `${part}.json`), 'utf8'))))
    console.log(JSON.stringify(verifyCoverage(inventory, reports, process.env)))
  } else throw new Error('Unknown browser CI command')
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) await main()
