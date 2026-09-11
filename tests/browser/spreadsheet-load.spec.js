import {readFile} from 'node:fs/promises'

import {test, expect} from '@playwright/test'
import {read} from 'xlsx/xlsx.mjs'

test('500 000 cellules : export complet côté navigateur sans requête de conversion', async ({page, request}, testInfo) => {
  test.setTimeout(90_000)
  const sentData = []
  page.on('request', request => {
    if (request.method() !== 'GET') {
      sentData.push(request.url())
    }
  })
  await page.route('**/*', route => new URL(route.request().url()).origin === 'http://127.0.0.1:3432'
    ? route.continue()
    : route.abort())
  await page.goto('http://127.0.0.1:3432/iframe.html?id=exports-excel--grand-tableau&viewMode=story')
  const started = Date.now()
  const downloading = page.waitForEvent('download')
  await page.getByRole('button', {name: 'Exporter Excel'}).click()
  expect((await request.get('/healthz')).status()).toBe(200)
  const download = await downloading
  const buffer = await readFile(await download.path())
  const workbook = read(buffer, {dense: true})
  const sheet = workbook.Sheets[workbook.SheetNames[0]]
  expect(sheet['!ref']).toBe('A1:J50001')
  expect(sheet['!data'][50_000][9].v).toBe(49_999)
  expect(sentData).toEqual([])
  await testInfo.attach('export-load.json', {
    body: JSON.stringify({cells: 500_000, rows: 50_001, fileBytes: buffer.length, elapsedMs: Date.now() - started}),
    contentType: 'application/json'
  })
})
