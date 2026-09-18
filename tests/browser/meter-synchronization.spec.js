import {test, expect} from '@playwright/test'
import {encode} from 'next-auth/jwt'
import {randomUUID} from 'node:crypto'

const frontUrl = 'https://127.0.0.1:3443'
const exploitationId = '11111111-1111-4111-8111-111111111111'
const meterId = '22222222-2222-4222-8222-222222222222'
const sourceId = '55555555-5555-4555-8555-555555555555'
test.use({ignoreHTTPSErrors: true})

test.beforeEach(async ({page}) => {
  await page.route('**/*', route => [frontUrl, 'http://127.0.0.1:3417'].includes(new URL(route.request().url()).origin)
    ? route.continue() : route.abort())
})

async function authenticate(context, role, {refresh = false, excluded = false, metersOnly = false, allocation = false, conflict = false, unresolved = false, exactPeriod = false, retryFirst = false, retryPage = false, overLimit = false} = {}) {
  const apiToken = `browser-test-meter-${role.toLowerCase()}-${refresh ? 'refresh-' : ''}${excluded ? 'excluded-' : ''}${metersOnly ? 'meters-only-' : ''}${allocation ? 'allocation-' : ''}${conflict ? 'conflict-' : ''}${unresolved ? 'unresolved-' : ''}${exactPeriod ? 'exact-period-' : ''}${retryFirst ? 'retry-first-' : ''}${retryPage ? 'retry-page-' : ''}${overLimit ? 'over-limit-' : ''}${randomUUID()}`
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
  for (const role of ['ADMIN', 'DECLARANT']) {
    test(`les volumes du premier janvier gardent leur période exacte et leur fin exclusive ${role}`, async ({page, context}, testInfo) => {
      await authenticate(context, role, {exactPeriod: true})
      if (role === 'DECLARANT') {
        await page.goto(`${frontUrl}/mes-declarations`)
        await expect(page.getByText('01/01/2026', {exact: true})).toBeVisible()
        await expect(page.getByText(/31\/12\/2025/)).toHaveCount(0)
        await page.locator(`a[href="/mes-declarations/sources/${sourceId}"]`).click()
      } else {
        await page.goto(`${frontUrl}/declarations/${sourceId}`)
      }
      await expect(page).toHaveTitle(/01\/01\/2026/)
      await expect(page.getByText('01/01/2026', {exact: true})).toBeVisible()
      await expect(page.getByText('Du 01/01/2026 00:00:00 au 02/01/2026 00:00:00', {exact: true}).first()).toBeVisible()
      await page.getByText('Voir les volumes', {exact: true}).click()
      await expect(page.getByRole('table')).toContainText('Du 01/01/2026 00:00:00 au 02/01/2026 00:00:00')
      await expect(page.getByText(/31\/12\/2025/)).toHaveCount(0)
      await page.screenshot({path: testInfo.outputPath(`periode-paris-${role.toLowerCase()}.png`), fullPage: true})
    })
  }

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
  await chooseChartParameter(page, 'Compteur n° SYNTHETIC-001')
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
  await expect(page.getByRole('option', {name: /Index déclarés/})).toBeVisible()
  await expect(page.getByRole('option', {name: /Compteur n°/})).toHaveCount(0)
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

for (const retryFirst of [true, false]) {
  test(`réessayer reprend exactement la page échouée ${retryFirst ? 'initiale après réouverture' : 'suivante'}`, async ({page, context}) => {
    const apiToken = await authenticate(context, 'ADMIN', {retryFirst, retryPage: !retryFirst})
    await page.goto(`${frontUrl}/exploitations/${exploitationId}`)
    await page.getByRole('button', {name: 'Voir les relevés du compteur'}).click()
    const table = page.getByRole('table', {name: 'Relevés du compteur', exact: true})
    await expect(table).toContainText('12 300')
    if (retryFirst) {
      await page.getByRole('button', {name: 'Masquer les relevés du compteur'}).click()
      await page.getByRole('button', {name: 'Voir les relevés du compteur'}).click()
    } else {
      await page.getByRole('button', {name: 'Charger les relevés suivants'}).click()
    }
    await expect(page.getByText('Impossible de charger les relevés.', {exact: true})).toBeVisible()
    await page.getByRole('button', {name: 'Réessayer', exact: true}).click()
    await expect(page.getByText('Impossible de charger les relevés.', {exact: true})).toHaveCount(0)
    if (retryFirst) {
      await expect(table).toContainText('9 999 999 999 999 999,1234')
      await expect(table.getByRole('row')).toHaveCount(2)
    } else {
      await expect(table.getByRole('row')).toHaveCount(3)
      await expect(table).toContainText('Exclu')
    }
    const requests = await context.request.get('http://127.0.0.1:3431/api/__meter-reading-requests', {headers: {authorization: `Bearer ${apiToken}`}})
    expect(await requests.json()).toEqual(retryFirst ? [null, null, null] : [null, 'synthetic-page-2', 'synthetic-page-2'])
  })
}

test('la limite de relevés permet de réduire la période puis affiche la courbe complète', async ({page, context}, testInfo) => {
  const apiToken = await authenticate(context, 'ADMIN', {metersOnly: true, overLimit: true})
  await page.goto(`${frontUrl}/points-prelevement/${meterId}`)
  await revealChart(page)
  await expect(page.getByText('Plus de 20 000 relevés : réduisez la période pour afficher tous les index.', {exact: true})).toBeVisible()
  await expect(page.getByRole('figure', {name: 'Graphique séries temporelles'})).toHaveCount(0)
  const range = page.getByRole('form', {name: 'Période des index du compteur'})
  await expect(range).toBeVisible()
  await range.scrollIntoViewIfNeeded()
  await page.screenshot({path: testInfo.outputPath('periode-index-limite.png'), animations: 'disabled', fullPage: true})
  await range.getByLabel('Début de la période des index').fill('2026-09-16')
  await range.getByLabel('Fin de la période des index').fill('2026-09-16')
  await range.getByRole('button', {name: 'Afficher cette période'}).click()
  const figure = page.getByRole('figure', {name: 'Graphique séries temporelles'})
  await expect(figure).toBeVisible()
  await expect(figure.locator('g[role="presentation"] > rect[width="12"]')).toHaveCount(3)
  const result = await context.request.get('http://127.0.0.1:3431/api/__meter-series-requests', {headers: {authorization: `Bearer ${apiToken}`}})
  expect((await result.json()).at(-1)).toMatchObject({startDate: '2026-09-16', endDate: '2026-09-16'})
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true)
  await range.scrollIntoViewIfNeeded()
  await page.screenshot({path: testInfo.outputPath('periode-index-reduite.png'), animations: 'disabled'})
})

for (const path of [`/exploitations/${exploitationId}`, `/points-prelevement/${meterId}`]) {
  test(`index exacts et historiques dans le même graphique ${path.split('/')[1]}`, async ({page, context}, testInfo) => {
    const errors = []
    page.on('pageerror', error => errors.push(error.message))
    const apiToken = await authenticate(context, 'ADMIN')
    await page.goto(`${frontUrl}${path}`)
    for (const label of ['Index déclarés', 'Compteur n° SYNTHETIC-001', 'Compteur n° SYNTHETIC-002']) {
      await chooseChartParameter(page, label)
    }

    const figure = page.getByRole('figure', {name: 'Graphique séries temporelles'})
    await expect(figure).toBeVisible()
    for (const label of ['Index déclarés', 'Compteur n° SYNTHETIC-001', 'Compteur n° SYNTHETIC-002']) {
      await expect(figure.locator('.MuiChartsLegend-root').getByText(`${label} (m³)`, {exact: true})).toBeVisible()
    }

    const selector = await openChartSelector(page)
    await expect(page.getByText('Index', {exact: true})).toBeVisible()
    const meterOptions = page.getByRole('option', {name: /Compteur n°/})
    const optionColors = await meterOptions.locator('span[style*="background-color"]').evaluateAll(elements => elements.map(element => element.style.backgroundColor))
    expect(new Set(optionColors).size).toBe(2)
    const lineColors = await figure.locator('path.MuiLineChart-line').evaluateAll(elements => elements.map(element => getComputedStyle(element).stroke))
    expect(lineColors).toEqual(expect.arrayContaining(optionColors))
    await page.screenshot({path: testInfo.outputPath(`selecteur-${path.split('/')[1]}.png`), fullPage: true})
    await page.getByRole('textbox', {name: 'Rechercher dans paramètres à afficher'}).fill('SYNTHETIC-002')
    await expect(meterOptions).toHaveCount(1)
    await expect(meterOptions).toContainText('SYNTHETIC-002')
    await selector.press('Escape')

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

for (const role of ['ADMIN', 'INSTRUCTOR']) {
  test(`export habituel avec index des compteurs selon capacité ${role}`, async ({page, context}, testInfo) => {
    const apiToken = await authenticate(context, role)
    await page.goto(`${frontUrl}/exports`)
    const checkboxLabel = 'Inclure les index des compteurs (nouvel onglet)'
    const checkbox = page.getByRole('checkbox', {name: checkboxLabel, exact: true})
    await expect(page.getByText('Onglet séparé : index du compteur, non répartis entre les exploitations.', {exact: true})).toHaveCount(0)
    if (role === 'ADMIN') {
      await expect(checkbox).toBeChecked()
      const optionalSettings = page.getByRole('heading', {name: 'Paramètres optionnels', exact: true}).locator('..').locator('..')
      await expect(optionalSettings.getByRole('checkbox', {name: checkboxLabel, exact: true})).toBeChecked()
      const waterBodyType = optionalSettings.getByRole('button', {name: 'Type de milieu du point', exact: true})
      await expect(waterBodyType).toBeVisible()
      expect(await waterBodyType.evaluate((filter, input) => Boolean(filter.compareDocumentPosition(input) & Node.DOCUMENT_POSITION_FOLLOWING), await checkbox.elementHandle())).toBe(true)
    } else {
      await expect(checkbox).toHaveCount(0)
    }

    await page.getByLabel('Date de début *').fill('2026-09-02')
    await page.getByLabel('Date de fin *').fill('2026-09-16')
    await page.getByRole('button', {name: 'Créer l’export', exact: true}).click()
    await expect(page.getByText('export-synthetique.xlsx', {exact: true})).toBeVisible()
    const exports = await context.request.get('http://127.0.0.1:3431/api/exports', {headers: {authorization: `Bearer ${apiToken}`}})
    const [item] = (await exports.json()).items
    expect(item.filters.startDate).toBe('2026-09-02')
    expect(item.filters.includeMeterReadings).toBe(role === 'ADMIN' ? true : undefined)
    await page.screenshot({path: testInfo.outputPath(`export-${role.toLowerCase()}.png`), fullPage: true})
    if (role === 'ADMIN') {
      await checkbox.focus()
      await checkbox.press('Space')
      await expect(checkbox).not.toBeChecked()
      await page.getByRole('button', {name: 'Créer l’export', exact: true}).click()
      await expect(page.getByText('export-synthetique.xlsx', {exact: true})).toHaveCount(2)
      const latest = await context.request.get('http://127.0.0.1:3431/api/exports', {headers: {authorization: `Bearer ${apiToken}`}})
      expect((await latest.json()).items[0].filters.includeMeterReadings).toBe(false)
    }
  })
}

for (const role of ['ADMIN', 'DECLARANT']) {
  test(`les volumes télérelevés sont visibles et non modifiables ${role}`, async ({page, context}, testInfo) => {
    await authenticate(context, role)
    if (role === 'DECLARANT') {
      await page.goto(`${frontUrl}/mes-declarations`)
      await expect(page.getByText('1 volume calculé', {exact: true})).toBeVisible()
      await page.locator(`a[href="/mes-declarations/sources/${sourceId}"]`).click()
    } else {
      await page.goto(`${frontUrl}/declarations/${sourceId}`)
    }

    await expect(page.getByRole('heading', {name: 'Données télérelevées', level: 1, exact: true})).toBeVisible()
    await expect(page.getByText(/Ces volumes sont calculés à partir des index des compteurs/)).toBeVisible()
    await expect(page.getByText('1 volume calculé', {exact: true})).toBeVisible()
    await expect(page.getByRole('button', {name: /Supprimer|Rejouer|Associer|Modifier/})).toHaveCount(0)
    await expect(page.getByText(/12300/)).toHaveCount(0)
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true)
    await page.screenshot({path: testInfo.outputPath(`telemetrie-${role.toLowerCase()}.png`), fullPage: true})
  })
}

test('la répartition complète modifie les bénéficiaires à une date précise sans changer la connexion', async ({page, context}, testInfo) => {
  const apiToken = await authenticate(context, 'ADMIN', {allocation: true})
  await page.goto(`${frontUrl}/exploitations/${exploitationId}/edit`)
  await expect(page.getByRole('heading', {name: 'Compteur SYNTHETIC-001'})).toBeVisible()
  await expect(page.getByRole('button', {name: 'Voir les relevés du compteur'})).toHaveCount(0)
  // Loading usages above the button changes the scroll position. WebKit can
  // cancel a pointer click if that transition occurs between mouse down/up.
  await expect(page.getByRole('combobox', {name: 'Usage principal *', exact: true})).toBeEnabled()
  await page.getByRole('button', {name: 'Modifier la répartition du compteur'}).click()
  const dialog = page.getByRole('dialog', {name: /Répartition du compteur/})
  await expect(dialog.getByText(/Synchronisation en pause/)).toBeVisible()
  await expect(dialog.getByRole('heading', {name: 'Répartition du compteur SYNTHETIC-001'})).toBeVisible()
  await expect(page.locator('.MuiDialog-container')).toHaveCSS('opacity', '1')
  await page.screenshot({path: testInfo.outputPath('repartition-ouverture.png'), animations: 'disabled'})
  for (const name of ['Ajouter une part', 'Retirer la part 1', 'Annuler']) {
    await expect(dialog.getByRole('button', {name, exact: true})).toHaveAttribute('type', 'button')
  }
  await expect(dialog.getByRole('combobox', {name: 'Bénéficiaire 2'})).toHaveValue('Part hors plateforme')
  await dialog.getByLabel('Pourcentage de la part 1').fill('60')
  await expect(dialog.getByRole('button', {name: 'Enregistrer la répartition'})).toBeDisabled()
  await dialog.getByLabel('Pourcentage de la part 2').fill('40')
  await dialog.getByRole('combobox', {name: 'Bénéficiaire 1'}).fill('Nouvelle')
  await page.getByRole('option', {name: 'Nouvelle exploitation — Point voisin'}).click()
  await dialog.getByLabel('Date d’effet').fill('2026-09-18')
  await dialog.getByLabel('Motif du changement').fill('Répartition validée avec les bénéficiaires')
  await expect(dialog.getByRole('heading', {name: 'Répartition du compteur SYNTHETIC-001'})).toBeInViewport()
  await expect(dialog.getByRole('button', {name: 'Enregistrer la répartition'})).toBeInViewport()
  expect(await dialog.evaluate(element => element.scrollWidth <= element.clientWidth + 1)).toBe(true)
  await page.screenshot({path: testInfo.outputPath('repartition-compteur.png'), animations: 'disabled'})
  await dialog.getByRole('button', {name: 'Enregistrer la répartition'}).click()
  await expect(dialog).toBeHidden()
  await expect(page.getByText('Répartition enregistrée pour le 18/09/2026. Les répartitions antérieures sont conservées.', {exact: true})).toBeVisible()
  const response = await context.request.get('http://127.0.0.1:3431/api/__allocation-updates', {headers: {authorization: `Bearer ${apiToken}`}})
  const [payload] = await response.json()
  expect(payload.expectedVersion).toBe('original-version')
  expect(payload.effectiveDate).toBe('2026-09-18')
  expect(payload.allocations).toEqual([
    {key: 'part-local', exploitationId: '77777777-7777-4777-8777-777777777777', percentage: '60', additive: false},
    {key: 'part-external', exploitationId: null, percentage: '40', additive: false}
  ])
  expect(payload).not.toHaveProperty('enabled')
})

test('une répartition devenue obsolète impose un rechargement et préserve le brouillon jusqu’au choix explicite', async ({page, context}) => {
  await authenticate(context, 'ADMIN', {allocation: true, conflict: true, unresolved: true})
  await page.goto(`${frontUrl}/exploitations/${exploitationId}/edit`)
  await expect(page.getByRole('combobox', {name: 'Usage principal *', exact: true})).toBeEnabled()
  await page.getByRole('button', {name: 'Modifier la répartition du compteur'}).click()
  const dialog = page.getByRole('dialog')
  await expect(dialog.getByRole('combobox', {name: 'Bénéficiaire 2'})).toHaveValue('Exploitation à renseigner')
  await dialog.getByLabel('Motif du changement').fill('Confirmation des parts')
  await dialog.getByRole('button', {name: 'Enregistrer la répartition'}).click()
  await expect(dialog.getByText(/Renseignez chaque exploitation manquante/)).toBeVisible()
  await dialog.getByRole('combobox', {name: 'Bénéficiaire 2'}).click()
  await page.getByRole('option', {name: 'Part hors plateforme', exact: true}).click()
  await dialog.getByRole('button', {name: 'Enregistrer la répartition'}).click()
  await expect(dialog.getByText(/La répartition a changé depuis son ouverture/)).toBeVisible()
  await expect(dialog.getByLabel('Motif du changement')).toHaveValue('Confirmation des parts')
  await expect(dialog.getByRole('button', {name: 'Enregistrer la répartition'})).toBeDisabled()
  await dialog.getByRole('button', {name: 'Recharger la répartition'}).click()
  await expect(dialog.getByLabel('Date d’effet')).toHaveValue('2026-09-19')
  await expect(dialog.getByLabel('Motif du changement')).toHaveValue('')
})

test('hors ADMIN les compteurs restent visibles dans l’édition sans accès à la répartition complète', async ({page, context}) => {
  await authenticate(context, 'DECLARANT', {allocation: true})
  await page.goto(`${frontUrl}/exploitations/${exploitationId}/edit`)
  await expect(page.getByRole('heading', {name: 'Compteur SYNTHETIC-001'})).toBeVisible()
  await expect(page.getByText('70 %', {exact: true})).toBeVisible()
  await expect(page.getByRole('button', {name: 'Modifier la répartition du compteur'})).toHaveCount(0)
  await expect(page.getByRole('button', {name: 'Voir les relevés du compteur'})).toHaveCount(0)
})

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
