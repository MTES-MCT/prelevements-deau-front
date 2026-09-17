import {test, expect} from '@playwright/test'
import {encode} from 'next-auth/jwt'
import {randomUUID} from 'node:crypto'

const frontUrl = 'https://127.0.0.1:3443'
const exploitationId = '11111111-1111-4111-8111-111111111111'
const meterId = '22222222-2222-4222-8222-222222222222'
test.use({ignoreHTTPSErrors: true})

test.beforeEach(async ({page}) => {
  await page.route('**/*', route => [frontUrl, 'http://127.0.0.1:3417'].includes(new URL(route.request().url()).origin)
    ? route.continue() : route.abort())
})

async function authenticate(context, role, {refresh = false, excluded = false, metersOnly = false} = {}) {
  const apiToken = `browser-test-meter-${role.toLowerCase()}-${refresh ? 'refresh-' : ''}${excluded ? 'excluded-' : ''}${metersOnly ? 'meters-only-' : ''}${randomUUID()}`
  const token = await encode({
    secret: 'browser-tests-only-never-a-real-secret',
    token: {
      sub: exploitationId, token: apiToken, role, permissions: [],
      apiExpiresAt: new Date(Date.now() + 3_600_000).toISOString(), infoRefreshedAt: Date.now(),
      userInfo: {id: exploitationId, email: 'synthetic@example.test'}
    },
    maxAge: 3600
  })
  // The local proxy middleware derives its cookie name from NEXTAUTH_URL
  // (HTTP), while the production server session explicitly uses __Secure-.
  await context.addCookies(['next-auth.session-token', '__Secure-next-auth.session-token'].map(name => ({
    name, value: token, url: frontUrl, httpOnly: true, secure: true, sameSite: 'Lax'
  })))
  return apiToken
}

test.describe('bornes calendaires des compteurs hors fuseau Paris', () => {
  test.use({timezoneId: 'UTC'})
  test('sans anciennes séries les index sont visibles par défaut, même après minuit Paris dans un navigateur UTC', async ({page, context}, testInfo) => {
    await authenticate(context, 'ADMIN', {metersOnly: true})
    await page.goto(`${frontUrl}/points-prelevement/${meterId}`)
    await revealChart(page)
    const figure = page.getByRole('figure', {name: 'Graphique séries temporelles'})
    await expect(figure).toBeVisible()
    // Three real valid observations, including Paris 00:02:43 = previous UTC day.
    const marks = figure.locator('g[role="presentation"] > rect[width="12"]')
    await expect(marks).toHaveCount(3)
    await marks.first().hover({force: true})
    await expect(page.getByText(/16\/09\/2026 00:02:43.*12300\.1234/)).toBeVisible()
    await page.screenshot({path: testInfo.outputPath('index-seuls-minuit-paris.png'), fullPage: true})
  })
})

test('les relevés tous exclus sont signalés sans les tracer comme index utilisables', async ({page, context}) => {
  await authenticate(context, 'ADMIN', {excluded: true})
  await page.goto(`${frontUrl}/points-prelevement/${meterId}`)
  await chooseChartParameter(page, 'Index — compteur SYNTHETIC-001')
  await chooseChartParameter(page, 'Volume prélevé')
  await expect(page.getByText(/SYNTHETIC-001 : 4 relevés exclus du graphique/)).toBeVisible()
  await expect(page.locator('path.MuiLineChart-line:not([d=""])')).toHaveCount(0)
})

async function openChartSelector(page) {
  await revealChart(page)
  const selector = page.getByRole('button', {name: 'Paramètres à afficher', exact: true})
  await selector.scrollIntoViewIfNeeded()
  await selector.click()
  return selector
}

async function revealChart(page) {
  await page.getByRole('main').evaluate(main => {
    const loading = [...main.querySelectorAll('[role="status"]')].find(element => element.textContent.includes('Chargement'))
    loading?.scrollIntoView({block: 'center'})
  })
}

async function chooseChartParameter(page, label) {
  await openChartSelector(page)
  const option = page.getByRole('option', {name: new RegExp(label)})
  await option.click()
  await expect(option).toBeHidden()
}

test('le préleveur voit sa part sans index global ni navigation de campagne', async ({page, context}) => {
  await authenticate(context, 'DECLARANT')
  const response = await page.goto(`${frontUrl}/exploitations/${exploitationId}`)
  expect(response.status()).toBe(200)
  await expect(page.getByRole('heading', {name: 'Synchronisation automatique', exact: true})).toHaveCount(1)
  await expect(page.getByRole('heading', {name: 'Compteur LEGACY-002', exact: true})).toBeVisible()
  await expect(page.getByText('70 %', {exact: true})).toBeVisible()
  await expect(page.getByRole('button', {name: 'Voir les relevés du compteur'})).toHaveCount(0)
  const selector = await openChartSelector(page)
  await expect(page.getByRole('option', {name: /Index historique/})).toBeVisible()
  await expect(page.getByRole('option', {name: /Index — compteur/})).toHaveCount(0)
  await selector.press('Escape')
  await expect(page.getByRole('link', {name: 'Campagnes', exact: true})).toHaveCount(0)
  expect(await response.text()).not.toContain('12300')
  const forbidden = await context.request.get(`http://127.0.0.1:3431/api/exploitations/${exploitationId}/meters/${meterId}/readings`, {
    headers: {authorization: 'Bearer browser-test-meter-declarant'}
  })
  expect(forbidden.status()).toBe(403)
  await page.setViewportSize({width: 390, height: 844})
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true)
})

test('la réouverture recharge un tableau initialement vide après synchronisation', async ({page, context}) => {
  await authenticate(context, 'ADMIN', {refresh: true})
  await page.goto(`${frontUrl}/exploitations/${exploitationId}`)
  await page.getByRole('button', {name: 'Voir les relevés du compteur'}).click()
  await expect(page.getByText('Aucun relevé disponible.', {exact: true})).toBeVisible()
  await page.getByRole('button', {name: 'Masquer les relevés du compteur'}).click()
  await page.getByRole('button', {name: 'Voir les relevés du compteur'}).click()
  await expect(page.getByRole('table', {name: 'Relevés du compteur', exact: true})).toContainText('10:11:43')
})

for (const path of [`/exploitations/${exploitationId}`, `/points-prelevement/${meterId}`]) {
  test(`index exacts et historiques dans le même graphique ${path.split('/')[1]}`, async ({page, context}, testInfo) => {
    const errors = []
    page.on('pageerror', error => errors.push(error.message))
    const apiToken = await authenticate(context, 'ADMIN')
    await page.goto(`${frontUrl}${path}`)
    for (const label of ['Index historique', 'Index — compteur SYNTHETIC-001', 'Index — compteur SYNTHETIC-002']) {
      await chooseChartParameter(page, label)
    }

    const figure = page.getByRole('figure', {name: 'Graphique séries temporelles'})
    await expect(figure).toBeVisible()
    for (const label of ['Index historique', 'Index — compteur SYNTHETIC-001', 'Index — compteur SYNTHETIC-002']) {
      await expect(figure.locator('.MuiChartsLegend-root').getByText(`${label} (m³)`, {exact: true})).toBeVisible()
    }

    await expect(page.getByText('Index du compteur, non répartis entre les exploitations.', {exact: true})).toBeVisible()
    await expect(page.getByText(/SYNTHETIC-001 : 1 relevé exclu du graphique/)).toBeVisible()
    await expect.poll(async () => {
      const result = await context.request.get('http://127.0.0.1:3431/api/__meter-series-requests', {headers: {authorization: `Bearer ${apiToken}`}})
      return (await result.json()).filter(request => request.cursor).length
    }).toBeGreaterThanOrEqual(2)
    expect(errors).toEqual([])
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true)
    await page.screenshot({path: testInfo.outputPath(`index-${path.split('/')[1]}.png`), fullPage: true})
  })
}

test('l’administrateur consulte les relevés exacts au clavier puis la page suivante', async ({page, context}, testInfo) => {
  await authenticate(context, 'ADMIN')
  // Reproduce slow hydration deterministically, without sleeps or retries.
  const scripts = Promise.withResolvers()
  await page.route('**/_next/static/**/*.js', async route => {
    await scripts.promise
    await route.continue()
  })
  await page.goto(`${frontUrl}/exploitations/${exploitationId}`, {waitUntil: 'commit'})
  const open = page.getByRole('button', {name: 'Voir les relevés du compteur'})
  try {
    await expect(open).toBeDisabled()
  } finally {
    scripts.resolve()
  }

  await expect(open).toBeEnabled()
  await open.focus()
  await expect(open).toBeFocused()
  await open.press('Enter')
  await expect(page.getByRole('button', {name: 'Masquer les relevés du compteur'})).toHaveAttribute('aria-expanded', 'true')
  const table = page.getByRole('table', {name: 'Relevés du compteur', exact: true})
  await expect(table).toBeVisible()
  await expect(table).toContainText('10:11:43')
  await expect(table.getByRole('cell', {name: 'C', exact: true})).toHaveCount(1)
  const next = page.getByRole('button', {name: 'Charger les relevés suivants'})
  await next.focus()
  await expect(next).toBeFocused()
  await next.press('Enter')
  await expect(table.getByRole('row')).toHaveCount(3)
  await expect(table.getByRole('cell', {name: 'Y', exact: true})).toHaveCount(1)
  await expect(table).toContainText('Exclu')
  await expect(page.getByRole('button', {name: 'Charger les relevés suivants'})).toHaveCount(0)
  await page.setViewportSize({width: 1440, height: 1000})
  await page.screenshot({path: testInfo.outputPath('synchronisation-desktop.png'), fullPage: true})
  await page.setViewportSize({width: 390, height: 844})
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true)
  await page.screenshot({path: testInfo.outputPath('synchronisation-mobile.png'), fullPage: true})
})
