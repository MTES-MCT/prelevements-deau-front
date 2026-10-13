import assert from 'node:assert/strict'
import test from 'node:test'
import {mkdir, mkdtemp, rm, writeFile} from 'node:fs/promises'
import {tmpdir} from 'node:os'
import {join, resolve} from 'node:path'
import {pathToFileURL} from 'node:url'
import {execFileSync} from 'node:child_process'
import {readFile} from 'node:fs/promises'
import {buildProof, verifyBuild, verifyCoverage} from './browser-ci.mjs'

const env = {GITHUB_SHA: 'a'.repeat(40), GITHUB_RUN_ID: '123', GITHUB_RUN_ATTEMPT: '1'}
function fixture() {
  const base = {version: 1, sha: env.GITHUB_SHA, runId: env.GITHUB_RUN_ID, attempt: env.GITHUB_RUN_ATTEMPT, status: 'passed', errors: 0}
  const projects = ['chromium', 'webkit', 'mobile', 'chromium', 'large-spreadsheet']
  const tests = projects.map((project, id) => ({id: `test-${id}`, project, expectedStatus: 'passed'}))
  return {
    inventory: {...base, part: 'inventory', tests, results: []},
    reports: tests.map((row, index) => ({...base, part: index === 4 ? 'spreadsheet' : `shard-${index + 1}`,
      tests: [row], results: [{id: row.id, status: 'passed', expectedStatus: 'passed'}]}))
  }
}

test('all projects and shards have exact single coverage at the reviewed SHA/run/attempt', () => {
  const {inventory, reports} = fixture()
  assert.deepEqual(verifyCoverage(inventory, reports, env), {tests: 5, projects: 4, parts: 5})
})

for (const [name, mutate] of Object.entries({
  'missing shard': f => f.reports.pop(),
  'missing test': f => { f.reports[0].results = [] },
  'duplicate execution': f => { f.reports[1].tests = f.reports[0].tests; f.reports[1].results = f.reports[0].results },
  'wrong SHA': f => { f.reports[1].sha = 'b'.repeat(40) },
  'wrong run': f => { f.reports[1].runId = '456' },
  'old attempt': f => { f.reports[1].attempt = '2' },
  'unexpected skip': f => { f.reports[1].results[0].status = 'skipped' },
  'unexpected pass': f => { f.reports[1].results[0].expectedStatus = 'failed' },
  'missing runtime expectation': f => { delete f.reports[1].results[0].expectedStatus },
  'failure': f => { f.reports[1].status = 'failed' },
  'infrastructure failure': f => { f.reports[1].errors = 1 },
  'retry': f => { f.reports[1].results.push(f.reports[1].results[0]) },
  'unknown test': f => { f.reports[1].results[0].id = 'foreign' },
  'duplicate inventory': f => { f.inventory.tests.push(f.inventory.tests[0]) }
})) test(`coverage refuses ${name}`, () => {
  const fixtureData = fixture()
  mutate(fixtureData)
  assert.throws(() => verifyCoverage(fixtureData.inventory, fixtureData.reports, env))
})

test('synthetic build verifies archive, inventory, commit and execution before extraction', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'browser-build-proof-'))
  try {
    await writeFile(join(directory, 'browser-build.tar.gz'), 'synthetic archive')
    await writeFile(join(directory, 'inventory.json'), '{}')
    await writeFile(join(directory, 'build-proof.json'), JSON.stringify(await buildProof(directory, env)))
    await verifyBuild(directory, env)
    await assert.rejects(verifyBuild(directory, {...env, GITHUB_SHA: 'b'.repeat(40)}))
    await writeFile(join(directory, 'browser-build.tar.gz'), 'changed')
    await assert.rejects(verifyBuild(directory, env))
  } finally {
    await rm(directory, {recursive: true, force: true})
  }
})


test('real Playwright inventory IDs survive sharding and runtime skip/fail annotations', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'browser-ci-playwright-'))
  const playwright = pathToFileURL(resolve('node_modules/@playwright/test/index.mjs')).href
  const reporter = resolve('.github/scripts/browser-ci-reporter.mjs')
  try {
    await writeFile(join(directory, 'playwright.config.mjs'), `
      export default {
        testDir: '.', fullyParallel: true, retries: 0, workers: 2,
        outputDir: ${JSON.stringify(join(directory, 'results'))},
        projects: [
          ...['chromium','webkit','mobile'].map(name => ({name, testMatch: 'browser.spec.mjs'})),
          {name:'large-spreadsheet', testMatch:'spreadsheet.spec.mjs', dependencies:['chromium','webkit','mobile']}
        ]
      }
    `)
    await writeFile(join(directory, 'browser.spec.mjs'), `
      import {test, expect} from ${JSON.stringify(playwright)}
      test('normal', () => expect(1).toBe(1))
      test('dynamic skip', () => { test.skip(true, 'synthetic platform exclusion') })
      test('dynamic expected failure', () => { test.fail(); expect(1).toBe(2) })
      test.describe('hook annotations', () => {
        test.beforeEach(() => test.skip(true, 'synthetic hook exclusion'))
        test('skip from hook', () => {})
      })
    `)
    await writeFile(join(directory, 'spreadsheet.spec.mjs'), `
      import {test, expect} from ${JSON.stringify(playwright)}
      test('spreadsheet', () => expect(1).toBe(1))
    `)
    const run = async (part, options) => {
      const filename = join(directory, `${part}.json`)
      execFileSync(process.execPath, [resolve('node_modules/playwright/cli.js'), 'test',
        '--config', join(directory, 'playwright.config.mjs'), '--reporter', reporter, ...options], {
        env: {...process.env, ...env, CI: '1', BROWSER_CI_PART: part, BROWSER_CI_REPORT: filename},
        timeout: 30_000, stdio: 'pipe'
      })
      return JSON.parse(await readFile(filename, 'utf8'))
    }
    const inventory = await run('inventory', ['--list'])
    const reports = []
    for (let shard = 1; shard <= 4; shard++) reports.push(await run(`shard-${shard}`, [
      '--project=chromium', '--project=webkit', '--project=mobile', `--shard=${shard}/4`
    ]))
    reports.push(await run('spreadsheet', ['--project=large-spreadsheet', '--no-deps']))
    assert.deepEqual(verifyCoverage(inventory, reports, env), {tests: 13, projects: 4, parts: 5})
    assert.equal(reports.flatMap(report => report.results).filter(row => row.expectedStatus === 'skipped').length, 6)
    assert.equal(reports.flatMap(report => report.results).filter(row => row.expectedStatus === 'failed').length, 3)
  } finally {
    await rm(directory, {recursive: true, force: true})
  }
})


test('the real workflow archive includes the chart loader manifest alongside its static chunks', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'browser-ci-archive-'))
  try {
    const files = ['.next/standalone/server.js', '.next/standalone/.next/BUILD_ID',
      '.next/static/chunks/chart.js', '.next/react-loadable-manifest.json', 'public/test.txt', 'storybook-static/index.html']
    for (const file of files) {
      await mkdir(join(directory, file, '..'), {recursive: true})
      await writeFile(join(directory, file), 'synthetic build file')
    }
    await mkdir(join(directory, '.artifacts/browser-build'), {recursive: true})
    const workflow = await readFile(new URL('../workflows/quality.yml', import.meta.url), 'utf8')
    const command = workflow.match(/^\s*(tar -czf .+)$/m)?.[1].split(/\s+/)
    assert.ok(command, 'Missing build packaging command')
    // Exercise the exact workflow arguments without evaluating shell code.
    execFileSync(command[0], command.slice(1), {cwd: directory})
    const entries = execFileSync('tar', ['-tzf', join(directory, '.artifacts/browser-build/browser-build.tar.gz')], {encoding: 'utf8'}).split('\n')
    for (const file of files) assert.ok(entries.includes(file), `Required browser build file omitted: ${file}`)
  } finally {
    await rm(directory, {recursive: true, force: true})
  }
})
