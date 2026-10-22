import assert from 'node:assert/strict'
import {existsSync, readFileSync} from 'node:fs'
import test from 'node:test'

const root = new URL('../../', import.meta.url)
const read = file => readFileSync(new URL(file, root), 'utf8')
const manifest = JSON.parse(read('package.json'))

test('Scalingo, local development and CI use the same patched Node and Yarn', () => {
  assert.equal(read('.nvmrc').trim(), '22.23.4')
  assert.equal(manifest.engines.node, '22.23.4')
  assert.equal(manifest.packageManager, 'yarn@4.6.0')
  assert.equal(manifest.engines.npm, undefined)
  assert.equal(existsSync(new URL('package-lock.json', root)), false)
  for (const file of ['default.yml', 'storybook.yml']) {
    const workflow = read(`.github/workflows/${file}`)
    assert.match(workflow, /node-version-file: \.nvmrc/)
    assert.match(workflow, /node \.github\/scripts\/audit-policy\.mjs/)
    assert.match(workflow, /yarn install --immutable/)
  }
})

test('UI libraries are audited as production dependencies', () => {
  for (const name of ['@codegouvfr/react-dsfr', '@mui/icons-material', '@mui/material', '@mui/material-nextjs', '@mui/system', '@mui/x-charts', '@mui/x-data-grid']) {
    assert.ok(manifest.dependencies[name], `${name} is a runtime dependency`)
    assert.equal(manifest.devDependencies[name], undefined)
  }
})

test('the patched PostCSS remains a same-major, targeted Next resolution', () => {
  assert.equal(manifest.resolutions['next/postcss'], '8.5.31')
  assert.equal(manifest.devDependencies.postcss, '^8.5.31')
})
