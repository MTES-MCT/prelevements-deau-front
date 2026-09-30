import {randomUUID} from 'node:crypto'
import {readFileSync} from 'node:fs'
import {test, expect} from '@playwright/test'
import {encode} from 'next-auth/jwt'
import {chartSeriesIds} from '../../.github/scripts/chart-series-fixtures.mjs'

const frontUrl = 'https://127.0.0.1:3443'
test.use({ignoreHTTPSErrors: true})

async function authenticate(context, {expired = false} = {}) {
  const apiToken = `browser-test-chart-series-${randomUUID()}`
  const token = await encode({secret: 'browser-tests-only-never-a-real-secret', token: {
    sub: chartSeriesIds.collecteur, token: apiToken, role: 'ADMIN', permissions: [],
    apiExpiresAt: new Date(Date.now() + (expired ? -3600_000 : 3600_000)).toISOString(), infoRefreshedAt: Date.now(),
    userInfo: {id: chartSeriesIds.collecteur, email: 'chart@example.test'}
  }, maxAge: 3600})
  await context.addCookies(['next-auth.session-token', '__Secure-next-auth.session-token'].map(name => ({name, value: token, url: frontUrl, httpOnly: true, secure: true, sameSite: 'Lax'})))
  return apiToken
}

async function getRequests(context, apiToken) {
  const response = await context.request.get('http://127.0.0.1:3431/api/__chart-series-requests', {headers: {authorization: `Bearer ${apiToken}`}})
  expect(response.ok()).toBe(true)
  return response.json()
}
const aggregates = requests => requests.filter(request => request.path === '/api/aggregated-series')

async function controlFixture(context, apiToken, params) {
  const response = await context.request.get(`http://127.0.0.1:3431/api/__chart-series-control?${new URLSearchParams(params)}`, {headers: {authorization: `Bearer ${apiToken}`}})
  expect(response.ok()).toBe(true)
}

test('le volume SSR arrive avant le débit et les index ne chargent qu’à l’ouverture du sélecteur', async ({page, context}) => {
  const apiToken = await authenticate(context)
  await controlFixture(context, apiToken, {holdMetric: 'débit'})
  let browserAggregates = 0
  page.on('request', request => { if (new URL(request.url()).pathname === '/api/aggregated-series') browserAggregates++ })
  try {
    await page.goto(`${frontUrl}/declarants/${chartSeriesIds.collecteur}`, {waitUntil: 'commit'})
    await expect(page.getByRole('figure', {name: 'Graphique séries temporelles'})).toBeVisible({timeout: 15_000})
    await expect(page.getByLabel('Totaux sur la période affichée')).toContainText(/300\s*m³/)
    await expect(page.getByRole('status').filter({hasText: /Chargement : Débit/})).toBeVisible()
    const requests = await getRequests(context, apiToken)
    expect(aggregates(requests)).toHaveLength(2)
    expect(aggregates(requests).find(request => request.query.metricTypeCode === 'débit').completedAt).toBeUndefined()
    expect(requests.filter(request => request.path.endsWith('/options')).map(request => request.query.detail)).toEqual(['summary'])
    expect(browserAggregates).toBe(0)
  } finally {
    await controlFixture(context, apiToken, {releaseMetric: 'débit'})
  }
  await expect(page.getByRole('status').filter({hasText: /Chargement : Débit/})).toHaveCount(0)
  await page.getByRole('button', {name: 'Paramètres à afficher', exact: true}).click()
  await expect(page.getByText('Index déclaré du compteur synthétique', {exact: true})).toBeVisible()
  expect((await getRequests(context, apiToken)).filter(request => request.path.endsWith('/options'))).toHaveLength(2)
  expect(aggregates(await getRequests(context, apiToken))).toHaveLength(2)
  await page.keyboard.press('Escape')
  await page.getByRole('button', {name: 'Paramètres à afficher', exact: true}).click()
  expect((await getRequests(context, apiToken)).filter(request => request.path.endsWith('/options'))).toHaveLength(2)
})

test('une erreur de chargement des index conserve le graphe et permet de réessayer', async ({page, context}) => {
  const apiToken = await authenticate(context)
  await controlFixture(context, apiToken, {failDetails: '1'})
  await page.goto(`${frontUrl}/declarants/${chartSeriesIds.collecteur}`)
  await expect(page.getByRole('figure', {name: 'Graphique séries temporelles'})).toBeVisible({timeout: 15_000})
  await page.getByRole('button', {name: 'Paramètres à afficher', exact: true}).click()
  await expect(page.getByRole('alert').filter({hasText: 'Impossible de charger les index'})).toBeVisible()
  await expect(page.getByLabel('Totaux sur la période affichée')).toContainText(/300\s*m³/)
  await page.getByRole('button', {name: 'Réessayer', exact: true}).click()
  await expect(page.getByText('Index déclaré du compteur synthétique', {exact: true})).toBeVisible()
  expect(aggregates(await getRequests(context, apiToken))).toHaveLength(2)
})

test('un volume vide reste sans total quand un autre paramètre échoue', async ({page, context}) => {
  const apiToken = await authenticate(context)
  await controlFixture(context, apiToken, {emptyVolume: 'true', failDebit: 'true'})
  await page.goto(`${frontUrl}/declarants/${chartSeriesIds.collecteur}`)
  await expect(page.getByRole('alert').filter({hasText: /Débit prélevé/})).toBeVisible({timeout: 15_000})
  await expect(page.getByText('Total indisponible', {exact: false})).toHaveCount(0)
  await expect(page.getByLabel('Totaux sur la période affichée')).toHaveCount(0)
})

test('une série SSR devenue non sélectionnée ne revient pas après sa résolution tardive', async ({page, context}) => {
  const apiToken = await authenticate(context)
  await controlFixture(context, apiToken, {holdMetric: 'débit'})
  try {
    await page.goto(`${frontUrl}/declarants/${chartSeriesIds.collecteur}`, {waitUntil: 'commit'})
    const totals = page.getByLabel('Totaux sur la période affichée')
    await expect(totals).toContainText(/300\s*m³/, {timeout: 15_000})
    const selector = page.getByRole('button', {name: 'Paramètres à afficher', exact: true})
    await selector.click()
    await page.getByRole('option', {name: /Débit prélevé/}).click()
    await page.keyboard.press('Escape')
    await expect(selector).not.toContainText('Débit')
    await controlFixture(context, apiToken, {releaseMetric: 'débit'})
    await expect.poll(async () => aggregates(await getRequests(context, apiToken)).every(request => request.completedAt)).toBe(true)
    await expect(selector).not.toContainText('Débit')
    await expect(totals).toContainText(/300\s*m³/)
    expect(aggregates(await getRequests(context, apiToken))).toHaveLength(2)
  } finally {
    await controlFixture(context, apiToken, {releaseMetric: 'débit'})
  }
})

for (const mode of ['indexOnly', 'legacyOptions']) {
  test(`la compatibilité ${mode} recharge les options complètes sans perdre le graphe`, async ({page, context}) => {
    const apiToken = await authenticate(context)
    await controlFixture(context, apiToken, {[mode]: 'true'})
    await page.goto(`${frontUrl}/declarants/${chartSeriesIds.collecteur}`)
    await expect(page.getByRole('figure', {name: 'Graphique séries temporelles'})).toBeVisible({timeout: 15_000})
    const requests = await getRequests(context, apiToken)
    expect(requests.filter(request => request.path.endsWith('/options'))).toHaveLength(2)
    expect(aggregates(requests)).toHaveLength(mode === 'indexOnly' ? 1 : 2)
    if (mode === 'indexOnly') expect(aggregates(requests)[0].query.metricTypeCode).toBe('index')
  })
}

test('charge les agrégats en parallèle avant le module graphique et conserve tout l’historique', async ({page, context}) => {
  const apiToken = await authenticate(context)
  // Resolve the actual dynamic module from the production build. UI strings
  // are escaped by minification and cannot reliably identify its bundle.
  const buildRoot = new URL('../../.next/', import.meta.url)
  const manifest = JSON.parse(readFileSync(new URL('react-loadable-manifest.json', buildRoot), 'utf8'))
  const chartModule = manifest['components/points-prelevement/series-explorer.js -> ./series-explorer-content.js']
  const chartFiles = chartModule.files.filter(file => file.endsWith('.js')
    && readFileSync(new URL(file, buildRoot), 'utf8').includes(`${chartModule.id}:`))
  expect(chartFiles).toHaveLength(1)
  const chartPath = `/_next/${chartFiles[0]}`
  let releaseChart
  let chartModuleWaiting = false
  const chartGate = new Promise(resolve => { releaseChart = resolve })
  await page.route('**/*', async route => {
    const url = new URL(route.request().url())
    if (![frontUrl, 'http://127.0.0.1:3417'].includes(url.origin)) return route.abort()
    if (url.pathname === chartPath) {
      chartModuleWaiting = true
      await chartGate
    }
    return route.continue()
  })
  try {
    await page.goto(`${frontUrl}/declarants/${chartSeriesIds.collecteur}`, {waitUntil: 'domcontentloaded'})
    await expect.poll(() => chartModuleWaiting).toBe(true)
    await expect.poll(async () => aggregates(await getRequests(context, apiToken)).filter(request => request.completedAt).length).toBe(2)
    expect(await page.getByRole('figure', {name: 'Graphique séries temporelles'}).count()).toBe(0)
    const requests = await getRequests(context, apiToken)
    const initial = aggregates(requests)
    expect(initial[1].startedAt).toBeLessThan(initial[0].completedAt)
    expect(requests.every(request => request.query.view === 'chart')).toBe(true)
    for (const request of initial) {
      expect(request.method).toBe('GET')
      expect(request.query).toMatchObject({collecteurId: chartSeriesIds.collecteur, startDate: '2020-01-01', endDate: '2026-09-01', aggregationFrequency: '1 week'})
    }
  } finally {
    releaseChart()
  }
  await expect(page.getByLabel('Totaux sur la période affichée')).toContainText(/Total prélevé\s*:\s*300\s*m³/)
  await expect(page.getByText(/certains volumes sont répartis entre les périodes à titre estimatif/)).toBeVisible()
  await expect(page.getByRole('figure', {name: 'Graphique séries temporelles'})).toBeVisible()
  // A full-range resolution suggestion must reuse the same effective request.
  expect(aggregates(await getRequests(context, apiToken))).toHaveLength(2)
})

test('la route protège la session et conserve les refus API sans redirection HTML', async ({context}) => {
  const query = `collecteurId=${chartSeriesIds.collecteur}&metricTypeCode=volume&aggregationFrequency=1%20week`
  let response = await context.request.get(`${frontUrl}/api/aggregated-series?${query}`)
  expect(response.status()).toBe(401)
  expect(response.headers()['cache-control']).toBe('private, no-store')
  expect(response.headers()['content-type']).toContain('application/json')
  await authenticate(context, {expired: true})
  response = await context.request.get(`${frontUrl}/api/aggregated-series?${query}`)
  expect(response.status()).toBe(401)
  await authenticate(context)
  response = await context.request.get(`${frontUrl}/api/aggregated-series?${query.replace(chartSeriesIds.collecteur, chartSeriesIds.forbidden)}`)
  expect(response.status()).toBe(403)
  expect(await response.json()).toEqual({message: 'Périmètre interdit'})
})

test('le zoom au clavier conserve l’historique et demande un total exact de la fenêtre', async ({page, context}) => {
  const apiToken = await authenticate(context)
  await page.route('**/*', route => [frontUrl, 'http://127.0.0.1:3417'].includes(new URL(route.request().url()).origin) ? route.continue() : route.abort())
  await page.goto(`${frontUrl}/declarants/${chartSeriesIds.collecteur}`)
  const totals = page.getByLabel('Totaux sur la période affichée')
  await expect(totals).toContainText(/300\s*m³/)
  await page.getByRole('slider').nth(1).press('ArrowLeft')
  await expect(totals).toContainText(/77\s*m³/)
  const requests = aggregates(await getRequests(context, apiToken))
  expect(requests.filter(request => request.query.aggregationFrequency === '1 year').map(request => request.query)).toEqual([
    expect.objectContaining({metricTypeCode: 'volume', temporalOperator: 'sum', startDate: '2020-01-01', endDate: '2026-08-31'})
  ])
  expect(requests.filter(request => request.query.aggregationFrequency === '1 week')).toHaveLength(2)
})

test('un changement d’agrégation annule la lecture précédente et ignore sa réponse', async ({page, context}) => {
  await authenticate(context)
  let releaseMaximum
  let maximumRequested = false
  let maximumAborted = false
  const maximumGate = new Promise(resolve => { releaseMaximum = resolve })
  page.on('requestfailed', request => {
    if (new URL(request.url()).searchParams.get('temporalOperator') === 'max') maximumAborted = true
  })
  await page.route('**/*', async route => {
    const url = new URL(route.request().url())
    if (![frontUrl, 'http://127.0.0.1:3417'].includes(url.origin)) return route.abort()
    if (url.pathname !== '/api/aggregated-series' || url.searchParams.get('temporalOperator') !== 'max') return route.continue()
    maximumRequested = true
    await maximumGate
    await route.fulfill({status: 200, contentType: 'application/json', body: JSON.stringify({metadata: {frequency: '1 week'}, values: [{date: '2020-01-01', value: 999}]})}).catch(() => {})
  })
  try {
    await page.goto(`${frontUrl}/declarants/${chartSeriesIds.collecteur}`)
    // The lazy chart can mount after the page load event on a busy CI runner.
    await expect(page.getByRole('figure', {name: 'Graphique séries temporelles'})).toBeVisible({timeout: 15_000})
    const totals = page.getByLabel('Totaux sur la période affichée')
    await expect(totals).toContainText(/300\s*m³/)
    const operator = page.getByRole('combobox', {name: 'Agrégation Volume prélevé (m³)', exact: true})
    await operator.selectOption('max')
    await expect.poll(() => maximumRequested).toBe(true)
    await operator.selectOption('sum')
    await expect.poll(() => maximumAborted).toBe(true)
    releaseMaximum()
    await expect(totals).toContainText(/300\s*m³/)
    await expect(totals).not.toContainText('999')
  } finally {
    releaseMaximum()
  }
})
