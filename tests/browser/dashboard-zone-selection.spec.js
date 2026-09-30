import {randomUUID} from 'node:crypto'

import {test, expect} from '@playwright/test'
import {encode} from 'next-auth/jwt'

const frontUrl = 'https://127.0.0.1:3443'
const fixtureUrl = 'http://127.0.0.1:3431'
test.use({ignoreHTTPSErrors: true, reducedMotion: 'reduce'})

test.beforeEach(async ({page}) => {
  await page.route('**/*', route => [frontUrl, 'http://127.0.0.1:3417'].includes(new URL(route.request().url()).origin)
    ? route.continue() : route.abort())
})

async function openDashboard(page, context, role, {stations = false, holdCampaign = false} = {}) {
  const apiToken = `browser-test-dashboard-${role.toLowerCase()}-${randomUUID()}`
  const id = '11111111-1111-4111-8111-111111111111'
  const cookie = await encode({
    secret: 'browser-tests-only-never-a-real-secret',
    token: {
      sub: id, token: apiToken, role, permissions: ['zone.dashboard.read'],
      declarantRole: role === 'DECLARANT' ? 'PRELEVEUR' : null,
      apiExpiresAt: new Date(Date.now() + 3_600_000).toISOString(),
      infoRefreshedAt: Date.now(),
      userInfo: {id, firstName: 'Camille', email: 'dashboard@example.test', declarantRole: role === 'DECLARANT' ? 'PRELEVEUR' : null}
    },
    maxAge: 3600
  })
  await context.addCookies(['next-auth.session-token', '__Secure-next-auth.session-token'].map(name => ({
    name, value: cookie, url: frontUrl, httpOnly: true, secure: true, sameSite: 'Lax'
  })))
  const headers = {authorization: `Bearer ${apiToken}`}
  const requests = async (all = false) => {
    const response = await context.request.get(`${fixtureUrl}/api/__dashboard-requests${all ? '?all' : ''}`, {headers})
    expect(response.ok()).toBe(true)
    return response.json()
  }
  const control = async data => {
    const response = await context.request.post(`${fixtureUrl}/api/__dashboard-control`, {headers, data})
    expect(response.ok()).toBe(true)
  }
  if (stations || holdCampaign) await control({stations, holdCampaign})
  await page.goto(`${frontUrl}/tableau-de-bord`, {waitUntil: 'commit'})
  const trigger = page.getByRole('button', {name: role === 'DECLARANT' ? 'Zones' : 'Filtrer le contenu de la page par :', exact: true})
  await expect(trigger).toBeVisible()
  await expect(trigger).toContainText('Gironde')
  await expect(page).toHaveURL(/zones=DEP-33/)
  await expect.poll(async () => (await requests()).length).toBe(1)
  return {trigger, requests, control}
}

test('les invitations lentes ne bloquent ni les chiffres ni les filtres du déclarant', async ({page, context}) => {
  const {trigger, control, requests} = await openDashboard(page, context, 'DECLARANT', {holdCampaign: true})
  try {
    await expect(page.getByRole('heading', {name: 'Chiffres clés de mon territoire'})).toBeVisible()
    await expect(page.getByRole('status').filter({hasText: 'Chargement de vos déclarations…'})).toBeVisible()
    await expect.poll(async () => (await requests(true)).some(item => item.pathname === '/api/campaigns/summary')).toBe(true)
    await trigger.click()
    await expect(page.getByRole('listbox')).toBeVisible()
    await page.getByRole('button', {name: 'Annuler', exact: true}).click()
  } finally {
    await control({releaseCampaign: true})
  }
  await expect(page.getByRole('status').filter({hasText: 'Chargement de vos déclarations…'})).toBeHidden()
})

for (const role of ['ADMIN', 'DECLARANT']) {
  test(`${role} : cases, actions groupées et recherche restent locales jusqu’à Appliquer`, async ({page, context}, testInfo) => {
    const {trigger, requests} = await openDashboard(page, context, role)
    await trigger.click()
    await page.getByRole('option', {name: /Lot-et-Garonne/}).click()
    await page.getByRole('option', {name: /Dropt/}).click()
    await expect(trigger).toContainText('Gironde')
    await page.getByRole('button', {name: 'Tout désélectionner', exact: true}).click()
    await expect(page.getByRole('button', {name: 'Appliquer', exact: true})).toBeDisabled()
    await expect(page.getByText('Sélectionnez au moins une zone.', {exact: true})).toBeVisible()
    await page.getByRole('button', {name: 'Tout sélectionner', exact: true}).click()
    const search = page.getByRole('textbox', {name: /Rechercher dans/})
    await search.fill('gironde')
    await expect(page.getByRole('listbox').getByRole('option')).toHaveCount(1)
    await page.getByRole('button', {name: 'Désélectionner les résultats', exact: true}).click()
    await page.getByRole('button', {name: 'Sélectionner les résultats', exact: true}).click()
    await page.getByRole('button', {name: 'Désélectionner les résultats', exact: true}).click()
    await search.fill('')
    await expect(page.getByRole('option', {name: /Gironde/})).toHaveAttribute('aria-selected', 'false')
    await expect(page.getByRole('option', {name: /Lot-et-Garonne/})).toHaveAttribute('aria-selected', 'true')
    await expect(page.getByRole('option', {name: /Dropt/})).toHaveAttribute('aria-selected', 'true')
    expect((await requests()).length).toBe(1)
    await page.screenshot({path: testInfo.outputPath(`selection-zones-${role.toLowerCase()}.png`), fullPage: false})

    await page.getByRole('button', {name: 'Appliquer', exact: true}).click()
    await expect.poll(async () => (await requests()).length).toBe(2)
    await expect(trigger).toContainText('Lot-et-Garonne')
    const [initialRequest, appliedRequest] = await requests()
    expect(initialRequest.zones).toBeUndefined()
    expect(appliedRequest.zones).toBe('DEP-47,SAGE-DROPT')
    await expect(page).toHaveURL(/zones=DEP-47%2CSAGE-DROPT/)

    // Return to the same set in a different toggle order: no server refresh.
    await trigger.click()
    await page.getByRole('option', {name: /Lot-et-Garonne/}).click()
    await page.getByRole('option', {name: /Lot-et-Garonne/}).click()
    await expect(page.getByRole('button', {name: 'Appliquer', exact: true})).toBeDisabled()
    await page.getByRole('button', {name: 'Annuler', exact: true}).click()
    await expect(page.getByRole('listbox')).toBeHidden()
    expect((await requests()).length).toBe(2)
  })

  test(`${role} : annuler, Échap et clic extérieur abandonnent le brouillon sans actualisation`, async ({page, context}) => {
    const {trigger, requests} = await openDashboard(page, context, role)
    for (const close of ['cancel', 'escape', 'outside', 'trigger']) {
      await trigger.click()
      await expect(page.getByRole('option', {name: /Lot-et-Garonne/})).toHaveAttribute('aria-selected', 'false')
      await page.getByRole('option', {name: /Lot-et-Garonne/}).click()
      if (close === 'cancel') await page.getByRole('button', {name: 'Annuler', exact: true}).click()
      if (close === 'escape') await page.keyboard.press('Escape')
      if (close === 'outside') await page.getByRole('heading', {name: 'Bonjour Camille,', exact: true}).click()
      if (close === 'trigger') await trigger.click()
      await expect(page.getByRole('listbox')).toBeHidden()
      await expect(trigger).toContainText('Gironde')
      expect((await requests()).length).toBe(1)
    }
  })

  test(`${role} : le périmètre affiché reste stable pendant le chargement et après une erreur`, async ({page, context}) => {
    const {trigger, requests, control} = await openDashboard(page, context, role)
    const initialUrl = page.url()
    await control({holdNext: true})
    await trigger.click()
    await page.getByRole('option', {name: /Lot-et-Garonne/}).click()
    await page.getByRole('button', {name: 'Appliquer', exact: true}).click()
    await expect.poll(async () => (await requests()).length).toBe(2)
    await expect(page.getByRole('status').filter({hasText: 'Actualisation du tableau de bord...'})).toBeVisible()
    await expect(trigger).toHaveAttribute('aria-disabled', 'true')
    await expect(trigger).toContainText('Gironde')
    await expect(trigger).not.toContainText('Lot-et-Garonne')
    expect(page.url()).toBe(initialUrl)
    await control({releaseStatus: 503})
    await expect(page.getByText('Erreur synthétique de chargement du territoire', {exact: true})).toBeVisible()
    await expect(trigger).toHaveAttribute('aria-disabled', 'false')
    await expect(trigger).toContainText('Gironde')
    expect(page.url()).toBe(initialUrl)

    // Retry from the committed selection, not from the failed draft.
    await control({holdNext: true})
    await trigger.click()
    await expect(page.getByRole('option', {name: /Lot-et-Garonne/})).toHaveAttribute('aria-selected', 'false')
    await page.getByRole('option', {name: /Lot-et-Garonne/}).click()
    await page.getByRole('button', {name: 'Appliquer', exact: true}).click()
    await expect.poll(async () => (await requests()).length).toBe(3)
    await expect(trigger).toContainText('Gironde')
    await expect(trigger).not.toContainText('Lot-et-Garonne')
    await control({releaseStatus: 200})
    await expect(trigger).toHaveAttribute('aria-disabled', 'false')
    await expect(page).toHaveURL(/zones=DEP-33%2CDEP-47/)
    expect((await requests()).length).toBe(3)
  })
}

test('les lectures des ressources sont parallèles et ne bloquent ni la carte ni les filtres', async ({page, context}) => {
  const release = Promise.withResolvers()
  const intercepted = Promise.withResolvers()
  await page.route('**/api/dashboard/water-resources/piezometry?**', async route => {
    intercepted.resolve()
    await release.promise
    await route.continue()
  })
  try {
    const {requests} = await openDashboard(page, context, 'ADMIN', {stations: true})
    await intercepted.promise
    await expect.poll(async () => (await requests(true)).some(item => item.pathname.endsWith('/flows'))).toBe(true)
    await page.locator('.dashboard-points-map-shell').scrollIntoViewIfNeeded()
    await expect(page.getByRole('checkbox', {name: /Mesures de débit/})).toBeVisible()
    // A territory read must complete while the unrelated piezometry read is held.
    await page.locator('#dashboard-declaration-period').selectOption('2026-08')
    await expect(page.locator('#dashboard-declaration-period')).toHaveValue('2026-08')
    await expect.poll(async () => (await requests()).length).toBe(2)
    expect((await requests()).at(-1).sections).toBe('registeredPrelevements')
  } finally {
    release.resolve()
  }
})

test('année et période rechargent leur bloc et préservent les filtres confirmés après erreur', async ({page, context}) => {
  const {requests, control} = await openDashboard(page, context, 'ADMIN')
  await expect.poll(async () => (await requests(true)).filter(item => item.pathname.includes('/water-resources/')).length).toBe(2)
  const resourcesBefore = (await requests(true)).filter(item => item.pathname.includes('/water-resources/')).length
  await page.locator('#withdrawn-year').selectOption('2025')
  await expect(page.locator('#withdrawn-year')).toHaveValue('2025')
  expect((await requests()).at(-1).sections).toBe('volumesByUsage')
  await expect(page.getByRole('img', {name: 'Volumes prélevés par usage', exact: true})).toContainText('10 m³')
  await expect(page.locator('#dashboard-declaration-period')).toHaveValue('2026-09')
  expect((await requests(true)).filter(item => item.pathname.includes('/water-resources/')).length).toBe(resourcesBefore)

  await control({holdNext: true})
  await page.locator('#dashboard-declaration-period').selectOption('2026-08')
  await expect.poll(async () => (await requests()).length).toBe(3)
  await expect(page.locator('#dashboard-declaration-period')).toHaveValue('2026-09')
  await control({releaseStatus: 503})
  await expect(page.getByText('Erreur synthétique de chargement du territoire', {exact: true})).toBeVisible()
  await expect(page.locator('#dashboard-declaration-period')).toHaveValue('2026-09')
  await expect(page.locator('#withdrawn-year')).toHaveValue('2025')
})

test('les stations restent disponibles sur la carte avant le rendu différé du graphique', async ({page, context}) => {
  await openDashboard(page, context, 'ADMIN', {stations: true})
  await page.locator('.dashboard-points-map-shell').scrollIntoViewIfNeeded()
  await expect(page.getByRole('checkbox', {name: /Mesures de débit/})).toBeVisible()
  await expect(page.getByRole('figure')).toHaveCount(0)
  await page.getByRole('heading', {name: 'Débits des cours d’eau', exact: true}).scrollIntoViewIfNeeded()
  await expect(page.getByRole('figure')).toBeVisible()
})

test('les choix de stations survivent aux changements de période et de mode', async ({page, context}) => {
  const stations = [1, 2].map(index => ({
    id: `synthetic-piezometer-${index}`, type: 'PIEZOMETER', label: `Piézomètre synthétique ${index}`,
    stationCode: `SYNTHETIC-PIEZO-${index}`, zones: [],
    values: [{at: '2026-09-01T00:00:00Z', depth: index, levelNgf: 10 - index}],
    ips: {status: 'AVAILABLE', values: [{at: '2026-09-01T00:00:00Z', value: index / 10, referenceYears: 20}]}
  }))
  let heldRead
  await page.route('**/api/dashboard/water-resources/piezometry?**', async route => {
    if (heldRead) await heldRead.promise
    await route.fulfill({json: {source: 'Source synthétique', warnings: [], stations}})
  })
  await openDashboard(page, context, 'ADMIN', {stations: true})
  const first = page.getByRole('checkbox', {name: 'Piézomètre synthétique 1', exact: true})
  const second = page.getByRole('checkbox', {name: 'Piézomètre synthétique 2', exact: true})
  await page.getByRole('button', {name: 'Afficher uniquement Piézomètre synthétique 1', exact: true}).click()
  await expect(first).toBeChecked()
  await expect(second).not.toBeChecked()

  heldRead = Promise.withResolvers()
  try {
    await page.locator('#piezometry-period').selectOption('five-years')
    await expect(first).toHaveCount(0)
  } finally {
    heldRead.resolve()
    heldRead = null
  }
  await expect(first).toBeChecked()
  await expect(second).not.toBeChecked()
  // DSFR places the visible label over its radio input.
  await page.getByText('Profondeur', {exact: true}).click()
  await expect(page.getByRole('radio', {name: 'Profondeur', exact: true})).toBeChecked()
  await expect(page.locator('#piezometry-period')).toHaveValue('month')
  await expect(first).toBeChecked()
  await expect(second).not.toBeChecked()

  const flow = page.getByRole('checkbox', {name: 'Station synthétique du Dropt', exact: true})
  await flow.uncheck()
  await page.locator('#flow-period').selectOption('month')
  await expect(page.locator('#flow-period')).toBeEnabled()
  await expect(flow).not.toBeChecked()
})

test('une URL query est restaurée au SSR sans seconde lecture, les anciens fragments migrent', async ({page, context}) => {
  const {requests} = await openDashboard(page, context, 'ADMIN')
  await page.goto(`${frontUrl}/tableau-de-bord?zones=DEP-47&periodType=month&period=2026-08&year=2025&waterBodyTypes=SOUTERRAIN#dashboard?flowPeriod=month`)
  await expect(page.locator('#withdrawn-year')).toHaveValue('2025')
  await expect(page.locator('#dashboard-declaration-period')).toHaveValue('2026-08')
  await expect.poll(async () => (await requests()).length).toBe(2)
  await page.reload()
  await expect(page.locator('#withdrawn-year')).toHaveValue('2025')
  await expect.poll(async () => (await requests()).length).toBe(3)
  expect((await requests()).at(-1).zones).toBe('DEP-47')

  await page.goto(`${frontUrl}/tableau-de-bord#dashboard?zones=DEP-47&periodType=month&period=2026-08&year=2025&waterBodyTypes=SOUTERRAIN&flowPeriod=month`)
  await expect(page.locator('#withdrawn-year')).toHaveValue('2025')
  await expect.poll(() => new URL(page.url()).searchParams.get('zones')).toBe('DEP-47')
  expect(new URL(page.url()).hash).toBe('#dashboard?flowPeriod=month')
  await expect.poll(async () => (await requests()).length).toBe(5)
  await page.reload()
  await expect(page.locator('#withdrawn-year')).toHaveValue('2025')
  await expect.poll(async () => (await requests()).length).toBe(6)
})
