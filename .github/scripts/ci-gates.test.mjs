import assert from 'node:assert/strict'
import test from 'node:test'
import {readFileSync} from 'node:fs'
import {assertGates} from './ci-gates.mjs'

for (const [kind, jobs] of Object.entries({quality: ['security', 'build', 'browser', 'spreadsheet', 'reports'], deploy: ['quality', 'image']})) {
  test(`${kind} rejects every failed, cancelled, skipped, missing or pending prerequisite`, () => {
    const good = Object.fromEntries(jobs.map(job => [job, {result: 'success', outputs: {digest: 'sha256:' + 'a'.repeat(64)}}]))
    assertGates(kind, good)
    for (const job of jobs) {
      for (const result of ['failure', 'cancelled', 'skipped', 'pending', undefined]) {
        assert.throws(() => assertGates(kind, {...good, [job]: {result}}))
      }
      const missing = structuredClone(good)
      delete missing[job]
      assert.throws(() => assertGates(kind, missing))
    }
  })
}

test('release cannot use an empty or mutable candidate image', () => {
  for (const digest of ['', 'latest', 'sha256:no', undefined]) assert.throws(() => assertGates('deploy', {
    quality: {result: 'success'}, image: {result: 'success', outputs: {digest}}
  }))
})

test('all release workflows keep independent image preparation and gated deployment of its scanned digest', () => {
  for (const env of ['testing', 'demo', 'prod']) {
    const workflow = readFileSync(new URL(`../workflows/deploy-${env}.yml`, import.meta.url), 'utf8')
    const [image, deploy] = workflow.split('  image:\n')[1].split('  deploy:\n')
    assert.doesNotMatch(image, /needs:/)
    assert.match(image, /digest: \$\{\{ steps\.verified\.outputs\.digest }}/)
    assert.ok(image.indexOf('scan-image.sh') < image.indexOf('id: verified'))
    assert.ok(image.indexOf('smoke-image.sh') < image.indexOf('id: verified'))
    assert.match(deploy, /needs: \[quality, image\]/)
    assert.match(deploy, /needs\.quality\.result == 'success' && needs\.image\.result == 'success'/)
    assert.match(deploy, /ci-gates\.mjs deploy/)
    assert.match(deploy, /@\$\{\{ needs\.image\.outputs\.digest }}/)
    assert.doesNotMatch(deploy, /steps\.build\.outputs/)
    assert.ok(deploy.indexOf('"$SCW_CONTAINER_ID" /healthz') < deploy.indexOf('imagetools create'))
    assert.doesNotMatch(image + deploy, /run: npm ci|npm install --global/)
  }
})


test('production deployment preserves the runtime API configuration without requiring a build-time fallback', () => {
  const workflow = readFileSync(new URL('../workflows/deploy-prod.yml', import.meta.url), 'utf8')
  const deploy = workflow.split('  deploy:\n')[1]
  assert.doesNotMatch(deploy, /test -n "\$NEXT_PUBLIC_API_URL"/)
  assert.match(deploy, /node \.github\/scripts\/deploy-container\.mjs --check prod/)
})
