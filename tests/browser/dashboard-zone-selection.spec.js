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

const dep33 = '00000000-0000-4000-8000-000000000033'
const sage = '00000000-0000-4000-8000-000000000101'
const ptge = '00000000-0000-4000-8000-000000000102'

async function openDashboard(page, context, role, {stations = false, holdCampaign = false, holdStatistics = false, search = '', noZones = false, onlyOne = false, collector = false} = {}) {
  const declarantRole = role === 'DECLARANT' ? (collector ? 'COLLECTEUR' : 'PRELEVEUR') : null
  const apiToken = `browser-test-dashboard-${role.toLowerCase()}-${collector ? 'collector-' : ''}${randomUUID()}`
  const id = '11111111-1111-4111-8111-111111111111'
  const cookie = await encode({
    secret: 'browser-tests-only-never-a-real-secret',
    token: {
      sub: id, token: apiToken, role, permissions: noZones ? [] : ['zone.dashboard.read'],
      declarantRole,
      apiExpiresAt: new Date(Date.now() + 3_600_000).toISOString(),
      infoRefreshedAt: Date.now(),
      userInfo: {id, firstName: 'Camille', email: 'dashboard@example.test', declarantRole}
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
    const reads = await response.json()
    // Count figure reads separately from the lightweight SSR bootstrap.
    return all ? reads : reads.filter(item => !item.sections?.includes('context'))
  }
  const control = async data => {
    const response = await context.request.post(`${fixtureUrl}/api/__dashboard-control`, {headers, data})
    expect(response.ok()).toBe(true)
  }
  if (stations || holdCampaign || holdStatistics || noZones || onlyOne) await control({stations, holdCampaign, holdStatistics, noZones, onlyOne})
  await page.goto(noZones ? `${frontUrl}/` : `${frontUrl}/tableau-de-bord${search}`, {waitUntil: 'commit'})
  const trigger = role === 'ADMIN'
    ? page.getByRole('button', {name: 'Filtrer le contenu de la page par :', exact: true})
    : page.getByRole('combobox', {name: role === 'DECLARANT' ? 'Territoire' : 'Filtrer le contenu de la page par :', exact: true})
  if (noZones) return {trigger, requests, control}
  await expect(trigger).toBeVisible()
  if (role === 'ADMIN') {
    await expect(trigger).toContainText('Gironde')
    if (!holdStatistics) await expect(page).toHaveURL(/zones=DEP-33/)
  } else {
    await expect(trigger).toHaveValue(role === 'DECLARANT' ? sage : dep33)
  }
  await expect.poll(async () => (await requests()).length).toBe(1)
  return {trigger, requests, control}
}

test.describe('Tableau de bord administrateur', () => {
  test('ADMIN : les agrégations lentes ne bloquent pas la carte ni les filtres', async ({page, context}) => {
    const {trigger, control, requests} = await openDashboard(page, context, 'ADMIN', {
      holdStatistics: true,
      search: '?periodType=month&period=2026-08&year=2025&waterBodyTypes=SOUTERRAIN'
    })
    try {
      await expect(page.getByRole('status').filter({hasText: 'Chargement des indicateurs du territoire…'})).toBeVisible()
      await expect.poll(async () => (await requests(true)).some(item => item.pathname === '/api/dashboard/map')).toBe(true)
      const initialRequests = (await requests(true)).filter(item => item.pathname === '/api/dashboard/territory')
      expect(initialRequests).toHaveLength(2)
      expect(initialRequests[0].parameters.sections).toBe('context,metrics')
      expect(initialRequests[1].parameters.sections).toBe('registeredPrelevements,volumesByUsage')

      // Changing scope can cancel the slow initial read without dropping URL filters.
      await trigger.click()
      await page.getByRole('option', {name: /Lot-et-Garonne/}).click()
      await page.getByRole('button', {name: 'Appliquer', exact: true}).click()
      await expect(page.locator('#withdrawn-year')).toHaveValue('2025')
      await expect(page.locator('#dashboard-declaration-period')).toHaveValue('2026-08')
      const lastRequest = (await requests()).at(-1)
      expect(lastRequest).toMatchObject({zones: 'DEP-33,DEP-47', year: '2025', period: '2026-08', waterBodyTypes: 'SOUTERRAIN'})
      await expect(trigger).toContainText('Gironde + 1 autre')
    } finally {
      await control({releaseStatus: 200})
    }
    await expect(trigger).toContainText('Gironde + 1 autre')
    await trigger.click()
    await expect(page.getByRole('option', {name: /Lot-et-Garonne/})).toHaveAttribute('aria-selected', 'true')
    await page.getByRole('button', {name: 'Annuler', exact: true}).click()
  })
})

test('une erreur des indicateurs laisse la carte disponible et peut être retentée', async ({page, context}) => {
  const {requests, control} = await openDashboard(page, context, 'ADMIN', {holdStatistics: true})
  await control({releaseStatus: 503})
  await expect(page.getByText('Les indicateurs du territoire n’ont pas pu être chargés.')).toBeVisible()
  await expect(page.getByText('Aucun prélèvement enregistré pour les zones sélectionnées.')).toHaveCount(0)
  await page.getByRole('button', {name: 'Réessayer', exact: true}).click()
  await expect(page.locator('#withdrawn-year')).toHaveValue('2026')
  expect((await requests()).length).toBe(2)
})

test('les invitations lentes ne bloquent ni les chiffres ni les filtres du déclarant', async ({page, context}) => {
  const {trigger, control, requests} = await openDashboard(page, context, 'DECLARANT', {holdCampaign: true})
  try {
    await expect(page.getByRole('heading', {name: 'Chiffres clés de mon territoire'})).toBeVisible()
    await expect(page.getByRole('status').filter({hasText: 'Chargement de vos déclarations…'})).toBeVisible()
    await expect.poll(async () => (await requests(true)).some(item => item.pathname === '/api/campaigns/summary')).toBe(true)
    await trigger.selectOption(ptge)
    await expect(page.getByRole('img', {name: 'Volumes prélevés par usage', exact: true})).toContainText('80 m³')
  } finally {
    await control({releaseCampaign: true})
  }
  await expect(page.getByRole('status').filter({hasText: 'Chargement de vos déclarations…'})).toBeHidden()
})

test.describe('Tableau de bord administrateur', () => {
  test('ADMIN : cases, actions groupées et recherche restent locales jusqu’à Appliquer', async ({page, context}, testInfo) => {
    const {trigger, requests} = await openDashboard(page, context, 'ADMIN')
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
    await page.screenshot({path: testInfo.outputPath('selection-zones-admin.png'), fullPage: false})

    await page.getByRole('button', {name: 'Appliquer', exact: true}).click()
    await expect.poll(async () => (await requests()).length).toBe(2)
    await expect(trigger).toContainText('Lot-et-Garonne')
    const [initialRequest, appliedRequest] = await requests()
    expect(initialRequest.zones).toBe('DEP-33')
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

  test('ADMIN : annuler, Échap et clic extérieur abandonnent le brouillon sans actualisation', async ({page, context}) => {
    const {trigger, requests} = await openDashboard(page, context, 'ADMIN')
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

  test('ADMIN : le périmètre affiché reste stable pendant le chargement et après une erreur', async ({page, context}) => {
    const {trigger, requests, control} = await openDashboard(page, context, 'ADMIN')
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
})

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

test('une URL query est restaurée dès la première lecture des indicateurs, les anciens fragments migrent', async ({page, context}) => {
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

for (const profile of ['INSTRUCTOR', 'PRELEVEUR', 'COLLECTEUR']) {
  test(`${profile} : un seul territoire, du choix au retour sur le tableau de bord`, async ({page, context}, testInfo) => {
    const agent = profile === 'INSTRUCTOR'
    const initial = agent ? dep33 : sage
    const {trigger, requests} = await openDashboard(page, context, agent ? 'INSTRUCTOR' : 'DECLARANT', {
      collector: profile === 'COLLECTEUR', stations: true,
      search: `?zoneId=${ptge}&zones=DEP-47&year=2025#dashboard?zones=DEP-47&flowPeriod=month`
    })
    const chart = page.getByRole('img', {name: 'Volumes prélevés par usage', exact: true})
    const mapReads = list => list.filter(item => item.pathname === '/api/dashboard/map')
    const activityReads = list => list.filter(item => item.parameters.scope === 'activity')
    await expect(chart).toContainText(agent ? '10 m³' : '30 m³')
    await expect(trigger).toHaveValue(initial)
    await expect(page).not.toHaveURL(/[?&](?:zones|zoneId)=/)
    const bootstrap = (await requests(true)).find(item => item.parameters.sections?.includes('context'))
    expect(bootstrap.parameters).not.toHaveProperty('zoneId')
    expect(bootstrap.parameters).not.toHaveProperty('zones')
    if (!agent) {
      await expect(trigger.locator('option')).toHaveText(['SAGE Dropt', 'PTGE Vallée du Dropt'])
      await expect.poll(async () => activityReads(await requests(true)).length).toBe(3)
    }
    const dot = page.locator('label[for="dashboard-zone"] [aria-hidden="true"]')
    const initialColor = await dot.evaluate(element => getComputedStyle(element).backgroundColor)
    await trigger.selectOption(ptge)
    await expect(chart).toContainText('40 m³')
    await expect(dot).toBeVisible()
    const ptgeColor = await dot.evaluate(element => getComputedStyle(element).backgroundColor)
    expect(ptgeColor).not.toBe(initialColor)
    expect(ptgeColor).not.toBe('rgba(0, 0, 0, 0)')
    if (agent) await trigger.locator('..').screenshot({path: testInfo.outputPath('selecteur-ptge.png')})
    await expect(page.locator('#withdrawn-year')).toHaveValue('2025')
    const data = await requests(true)
    expect(data.filter(item => item.pathname === '/api/dashboard/territory').at(-1).parameters.zoneId).toBe(ptge)
    if (agent) {
      await expect.poll(async () => mapReads(await requests(true)).at(-1)?.parameters.zoneId).toBe(ptge)
    } else {
      expect(activityReads(data)).toHaveLength(3)
      expect(activityReads(data).every(item => !item.parameters.zoneId && !item.parameters.zones)).toBe(true)
      expect(mapReads(data)).toHaveLength(1)
    }
    await expect.poll(async () => (await requests(true)).filter(item => item.pathname.includes('/water-resources/') && item.parameters.zoneId === ptge).length).toBe(2)
    expect(new URL(page.url()).hash).toContain('flowPeriod=month')
    await page.reload()
    await expect(trigger).toHaveValue(initial)
    await expect(chart).toContainText(agent ? '10 m³' : '30 m³')
    await trigger.selectOption(ptge)
    await expect(chart).toContainText('40 m³')
    await page.goto(`${frontUrl}/healthz`)
    await page.goBack()
    await expect(trigger).toHaveValue(initial)
  })
}

test('deux changements rapides gardent les derniers chiffres même si les codes de zone coïncident', async ({page, context}) => {
  const {trigger, control, requests} = await openDashboard(page, context, 'INSTRUCTOR')
  const chart = page.getByRole('img', {name: 'Volumes prélevés par usage', exact: true})
  await control({holdNext: true})
  try {
    await trigger.selectOption(sage)
    await expect.poll(async () => (await requests()).at(-1)?.zoneId).toBe(sage)
    await trigger.selectOption(ptge)
    await expect(chart).toContainText('80 m³')
  } finally {
    await control({releaseStatus: 200})
  }
  await expect(trigger).toHaveValue(ptge)
  await expect(chart).toContainText('80 m³')
  await control({holdNext: true})
  await trigger.selectOption(sage)
  await expect.poll(async () => (await requests()).at(-1)?.zoneId).toBe(sage)
  await control({releaseStatus: 503})
  await expect(page.getByText('Erreur synthétique de chargement du territoire', {exact: true})).toBeVisible()
  await expect(trigger).toHaveValue(ptge)
  await expect(chart).toContainText('80 m³')
})

for (const role of ['INSTRUCTOR', 'DECLARANT']) {
  test(`${role} : aucune zone accessible ne déclenche de lecture territoriale`, async ({page, context}) => {
    const {requests, trigger} = await openDashboard(page, context, role, {noZones: true})
    if (role === 'INSTRUCTOR') {
      await expect(page.getByText('Vous n’avez accès à aucune zone sur ce tableau de bord.')).toBeVisible()
    } else {
      await expect(page.getByRole('heading', {name: 'Mon activité'})).toBeVisible()
      await expect(page.getByRole('heading', {name: 'Chiffres clés de mon territoire'})).toHaveCount(0)
    }
    await expect(page).toHaveURL(/\/tableau-de-bord(?:[?#]|$)/)
    await expect(trigger).toHaveCount(0)
    const menu = page.getByRole('button', {name: 'Menu', exact: true})
    if (await menu.isVisible()) await menu.click()
    await expect(page.getByRole('navigation', {name: 'Menu principal'}).getByRole('link', {name: 'Tableau de bord', exact: true})).toBeVisible()
    expect((await requests(true)).filter(item => item.pathname.startsWith('/api/dashboard/') && item.parameters.scope !== 'activity')
      .map(item => item.parameters.sections)).toEqual([role === 'INSTRUCTOR' ? 'context,metrics' : 'context'])
  })
}

test('le mandat par défaut est visible avant hydratation et un agent mono-zone ne peut pas le désélectionner', async ({page, context}) => {
  const {trigger, control} = await openDashboard(page, context, 'INSTRUCTOR', {onlyOne: true})
  await expect(trigger.locator('option')).toHaveCount(1)
  await expect(trigger).toBeDisabled()
  await control({onlyOne: false})
  const release = Promise.withResolvers()
  await page.route(/\/_next\/static\/.*\.js(?:\?.*)?$/, async route => {
    await release.promise
    await route.fallback()
  })
  try {
    await page.goto(`${frontUrl}/tableau-de-bord?zoneId=${ptge}`, {waitUntil: 'commit'})
    await expect(trigger).toHaveValue(dep33)
    await expect(trigger.locator('option')).toHaveCount(4)
    await expect(trigger).toBeDisabled()
  } finally {
    release.resolve()
  }
  await expect(trigger).toBeEnabled()
  await trigger.selectOption(ptge)
  await expect(page.getByRole('img', {name: 'Volumes prélevés par usage', exact: true})).toContainText('80 m³')
})

test('un mandat retiré entre deux lectures recharge les indicateurs et le sélecteur sur la zone autorisée', async ({page, context}) => {
  const {trigger, control} = await openDashboard(page, context, 'INSTRUCTOR')
  const chart = page.getByRole('img', {name: 'Volumes prélevés par usage', exact: true})
  await trigger.selectOption(ptge)
  await expect(chart).toContainText('80 m³')
  await control({revokeZone: ptge})
  await page.locator('#withdrawn-year').selectOption('2025')
  await expect(trigger).toHaveValue(dep33)
  await expect(trigger.locator(`option[value="${ptge}"]`)).toHaveCount(0)
  await expect(chart).toContainText('10 m³')
  await expect(page.getByText('10 points de prélèvement', {exact: true})).toBeVisible()
})

test('un ancien lien agent conserve ses filtres statistiques et rouvre le mandat par défaut', async ({page, context}) => {
  const {trigger, requests} = await openDashboard(page, context, 'INSTRUCTOR')
  const currentReads = (await requests(true)).length
  await page.goto(`${frontUrl}/tableau-de-bord?zones=DEP-47#dashboard?zones=SAGE-DROPT&zoneId=${ptge}&periodType=month&period=2026-08&year=2025&waterBodyType=SOUTERRAIN&flowPeriod=month`)
  await expect(trigger).toHaveValue(dep33)
  await expect(page.locator('#withdrawn-year')).toHaveValue('2025')
  await expect(page.locator('#dashboard-declaration-period')).toHaveValue('2026-08')
  await expect.poll(() => new URL(page.url()).searchParams.get('waterBodyTypes')).toBe('SOUTERRAIN')
  const location = new URL(page.url())
  expect(location.searchParams.has('zones')).toBe(false)
  expect(location.searchParams.has('zoneId')).toBe(false)
  expect(location.hash).toBe('#dashboard?flowPeriod=month')
  const reads = (await requests(true)).slice(currentReads)
  expect(reads.filter(item => item.parameters.zoneId).every(item => item.parameters.zoneId === dep33)).toBe(true)
  expect(reads.every(item => !item.parameters.zones)).toBe(true)
  expect(reads.filter(item => item.pathname === '/api/dashboard/territory').at(-1).parameters).toMatchObject({
    zoneId: dep33, period: '2026-08', year: '2025', waterBodyTypes: 'SOUTERRAIN'
  })
  await page.reload()
  await expect(trigger).toHaveValue(dep33)
  await expect(page.locator('#withdrawn-year')).toHaveValue('2025')
})
