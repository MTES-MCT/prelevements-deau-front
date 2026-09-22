import {randomUUID} from 'node:crypto'
import {test, expect} from '@playwright/test'
import {encode} from 'next-auth/jwt'
import {countingIds} from '../../.github/scripts/counting-code-fixtures.mjs'

const frontUrl = 'https://127.0.0.1:3443'
test.use({ignoreHTTPSErrors: true})

test.beforeEach(async ({page}) => {
  await page.route('**/*', route => [frontUrl, 'http://127.0.0.1:3417'].includes(new URL(route.request().url()).origin) ? route.continue() : route.abort())
})

async function authenticate(context, readOnly = false) {
  const apiToken = `browser-test-counting-${readOnly ? 'readonly-' : ''}${randomUUID()}`
  const token = await encode({secret: 'browser-tests-only-never-a-real-secret', token: {
    sub: countingIds.user, token: apiToken, role: readOnly ? 'DECLARANT' : 'ADMIN', permissions: [],
    apiExpiresAt: new Date(Date.now() + 3_600_000).toISOString(), infoRefreshedAt: Date.now(),
    userInfo: {id: countingIds.user, email: 'counting@example.test'}
  }, maxAge: 3600})
  await context.addCookies(['next-auth.session-token', '__Secure-next-auth.session-token'].map(name => ({name, value: token, url: frontUrl, httpOnly: true, secure: true, sameSite: 'Lax'})))
  return apiToken
}

async function getRequests(context, apiToken) {
  const response = await context.request.get('http://127.0.0.1:3431/api/__counting-requests', {headers: {authorization: `Bearer ${apiToken}`}})
  expect(response.ok()).toBe(true)
  return response.json()
}

test('deux comptages du même PP gardent index, saisies et payloads indépendants', async ({page, context}, testInfo) => {
  const apiToken = await authenticate(context, true)
  await page.clock.setFixedTime(new Date('2026-09-22T12:00:00Z'))
  await page.goto(`${frontUrl}/mes-declarations/new`)
  const first = page.getByRole('textbox', {name: 'Index (m³) — Point partagé — Code comptage : 001', exact: true})
  const second = page.getByRole('textbox', {name: 'Index (m³) — Point partagé — Code comptage : 002', exact: true})
  await expect(first).toBeVisible()
  await expect(second).toBeVisible()
  await expect(first.locator('xpath=ancestor::div[@role="listitem"]')).toContainText('Dernier index : 100 m³')
  await expect(second.locator('xpath=ancestor::div[@role="listitem"]')).toContainText('Dernier index : 900 m³')
  await first.fill('120')
  await expect(second).toHaveValue('')
  await first.press('Enter')
  await expect(second).toBeFocused()
  await second.fill('940')
  await page.getByRole('button', {name: 'Soumettre 2 relevés', exact: true}).click()
  await expect(page.getByText('Soumission synthétique enregistrée sans donnée métier.', {exact: true})).toBeVisible()
  let writes = await getRequests(context, apiToken)
  expect(writes.at(-1).body.entries).toEqual([
    {pointPrelevementId: countingIds.point, exploitationId: countingIds.first, index: 120, usageId: countingIds.usage},
    {pointPrelevementId: countingIds.point, exploitationId: countingIds.second, index: 940, usageId: countingIds.usage}
  ])
  await page.getByRole('radio', {name: 'Volume', exact: true}).focus()
  await page.getByRole('radio', {name: 'Volume', exact: true}).press('Space')
  await page.getByRole('button', {name: /^Période déclarée/}).click()
  const calendar = page.getByRole('dialog', {name: 'Choisir une période'})
  await calendar.getByRole('button', {name: '1', exact: true}).first().click()
  await calendar.getByRole('button', {name: '21', exact: true}).click()
  await calendar.getByRole('button', {name: 'Valider', exact: true}).click()
  await page.getByRole('button', {name: 'Soumettre 2 volumes', exact: true}).click()
  await expect.poll(async () => (await getRequests(context, apiToken)).filter(request => request.path === '/api/declarations/quick').length).toBe(2)
  writes = await getRequests(context, apiToken)
  expect(writes.at(-2).path).toBe('/api/declarations/quick/conflicts')
  expect(writes.at(-2).body.entries).toEqual(writes.at(-1).body.entries)
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true)
  await page.screenshot({path: testInfo.outputPath('comptages-distincts.png'), animations: 'disabled'})
})

test('le code se corrige sans changer l’identité et les séries sont filtrées par exploitation', async ({page, context}) => {
  const apiToken = await authenticate(context)
  await page.goto(`${frontUrl}/exploitations/${countingIds.first}/edit`)
  await expect(page.getByLabel(/^Code comptage/)).toHaveValue('001')
  await expect(page.getByRole('combobox', {name: 'Usage principal *', exact: true})).toBeEnabled()
  await page.getByLabel(/^Code comptage/).fill('00012')
  await page.getByRole('button', {name: 'Enregistrer les modifications', exact: true}).click()
  await expect(page).toHaveURL(`${frontUrl}/exploitations/${countingIds.first}`)
  await expect(page.getByText('Code comptage : 00012', {exact: true})).toBeVisible()
  await page.getByRole('main').evaluate(main => [...main.querySelectorAll('[role="status"]')].find(element => element.textContent.includes('Chargement'))?.scrollIntoView())
  await expect.poll(async () => (await getRequests(context, apiToken)).filter(request => request.path === '/api/aggregated-series').length).toBeGreaterThan(0)
  const requests = await getRequests(context, apiToken)
  expect(requests[0].body).toMatchObject({countingCode: '00012', expectedCountingCode: '001'})
  for (const request of requests.filter(request => request.path.startsWith('/api/aggregated-series'))) {
    expect(request.query.exploitationId).toBe(countingIds.first)
  }
})

test('lecture seule : code visible et édition inaccessible', async ({page, context}) => {
  await authenticate(context, true)
  await page.goto(`${frontUrl}/exploitations/${countingIds.first}`)
  await expect(page.getByText('Code comptage : 001', {exact: true})).toBeVisible()
  await expect(page.getByRole('link', {name: 'Modifier l’exploitation'})).toHaveCount(0)
  await page.goto(`${frontUrl}/exploitations/${countingIds.first}/edit`)
  await expect(page.getByRole('heading', {name: 'Accès interdit', exact: true})).toBeVisible()
  await expect(page.getByLabel(/^Code comptage/)).toHaveCount(0)
})

for (const view of ['déclarant', 'administrateur']) {
  test(`rapprochement ${view} : choisir le PP ne choisit pas arbitrairement un comptage`, async ({page, context}, testInfo) => {
    const apiToken = await authenticate(context, view === 'déclarant')
    await page.goto(`${frontUrl}/${view === 'déclarant' ? `mes-declarations/${countingIds.declaration}` : `declarations/${countingIds.source}`}`)
    await page.getByRole('combobox', {name: 'Point à associer', exact: true}).selectOption(countingIds.point)
    await page.getByRole('button', {name: 'Associer', exact: true}).click()
    const dialog = page.getByRole('dialog', {name: 'Choisir le comptage', exact: true})
    await expect(dialog).toBeVisible()
    await expect(dialog.getByRole('button', {name: 'Associer', exact: true})).toBeDisabled()
    expect(await getRequests(context, apiToken)).toEqual([])
    await dialog.getByRole('combobox', {name: 'Exploitation', exact: true}).selectOption(countingIds.second)
    await dialog.getByRole('button', {name: 'Annuler', exact: true}).click()
    await expect(dialog).toBeHidden()
    expect(await getRequests(context, apiToken)).toEqual([])
    await page.getByRole('button', {name: 'Associer', exact: true}).click()
    await expect(dialog.getByRole('combobox', {name: 'Exploitation', exact: true})).toHaveValue('')
    await dialog.getByRole('combobox', {name: 'Exploitation', exact: true}).selectOption(countingIds.second)
    await page.screenshot({path: testInfo.outputPath('choix-comptage.png'), animations: 'disabled'})
    await dialog.getByRole('button', {name: 'Associer', exact: true}).click()
    await expect(dialog).toBeHidden()
    expect((await getRequests(context, apiToken)).at(-1).body).toEqual({pointPrelevementId: countingIds.point, exploitationId: countingIds.second})
    await expect(page.getByText(/Associé à Point partagé — Code comptage : 002/)).toBeVisible()
  })
}

test('les index de deux exploitations sur la fiche PP se sélectionnent et se chargent séparément', async ({page, context}) => {
  const apiToken = await authenticate(context)
  await page.goto(`${frontUrl}/points-prelevement/${countingIds.point}`)
  await page.getByRole('main').evaluate(main => [...main.querySelectorAll('[role="status"]')].find(element => element.textContent.includes('Chargement'))?.scrollIntoView())
  for (const code of ['001', '002']) {
    const selector = page.getByRole('button', {name: 'Paramètres à afficher', exact: true})
    await selector.scrollIntoViewIfNeeded()
    await selector.click()
    await page.getByRole('option', {name: new RegExp(`Index de prélèvement — Comptage ${code}`)}).click()
    await selector.press('Escape')
  }
  await expect.poll(async () => {
    const requests = await getRequests(context, apiToken)
    return [...new Set(requests.filter(request => request.path === '/api/aggregated-series' && request.query.metricTypeCode === 'index').map(request => request.query.exploitationId))].sort()
  }).toEqual([countingIds.first, countingIds.second].sort())
  const requests = await getRequests(context, apiToken)
  expect(requests.find(request => request.path === '/api/aggregated-series/options').query.includeExploitationIndexes).toBe('true')
})
