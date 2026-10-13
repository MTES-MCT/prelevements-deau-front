import assert from 'node:assert/strict'
import {pathToFileURL} from 'node:url'
import {resolve} from 'node:path'

export function assertGates(kind, needs) {
  const expected = kind === 'quality' ? ['security', 'build', 'browser', 'spreadsheet', 'reports']
    : kind === 'deploy' ? ['quality', 'image'] : []
  assert.ok(expected.length, 'Unknown CI gate')
  assert.deepEqual(Object.keys(needs).sort(), expected.sort(), 'Missing CI prerequisite')
  for (const job of expected) assert.equal(needs[job]?.result, 'success', `Required job did not succeed: ${job}`)
  if (kind === 'deploy') assert.match(needs.image.outputs?.digest ?? '', /^sha256:[a-f0-9]{64}$/)
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  assertGates(process.argv[2], JSON.parse(process.env.CI_NEEDS ?? '{}'))
}
