import {readFile} from 'node:fs/promises'

import {test, expect} from '@playwright/test'
import {encode} from 'next-auth/jwt'
import XlsxPopulate from 'xlsx-populate'

const frontUrl = 'http://127.0.0.1:3417'
const storiesUrl = 'http://127.0.0.1:3432'
const zoneId = '11111111-1111-4111-8111-111111111111'

test.beforeEach(async ({page}) => {
  // Browser requests cannot reach real APIs, analytics, tiles or mail services.
  await page.route('**/*', route => {
    const url = new URL(route.request().url())
    return [frontUrl, storiesUrl, 'http://127.0.0.1:3431'].includes(url.origin)
      ? route.continue()
      : route.abort()
  })
})

async function authenticate(context, expiresAt = Date.now() + 3_600_000) {
  const cookie = await encode({
    secret: 'browser-tests-only-never-a-real-secret',
    token: {
      sub: zoneId,
      token: 'browser-test-api-token',
      role: 'INSTRUCTOR',
      permissions: ['zone.export'],
      apiExpiresAt: new Date(expiresAt).toISOString(),
      infoRefreshedAt: Date.now(),
      userInfo: {id: zoneId, email: 'test@example.test'}
    },
    maxAge: 3600
  })
  await context.addCookies([{
    name: 'next-auth.session-token', value: cookie, url: frontUrl, httpOnly: true, sameSite: 'Lax'
  }])
  // Production sessions use __Secure- cookies. These direct HTTP fixture requests
  // send the encrypted cookie explicitly; no application security is relaxed.
  return 'next-auth.session-token=' + cookie + '; __Secure-next-auth.session-token=' + cookie
}

test('connexion DSFR : onglets, saisie et retour sans envoi réel de mail', async ({page}, testInfo) => {
  const errors = []
  page.on('pageerror', error => errors.push(error.message))
  await page.goto('/login')
  await expect(page.getByRole('tab', {name: 'Mot de passe', exact: true})).toBeVisible()
  await page.getByRole('tab', {name: 'Lien de connexion par email'}).click()
  await page.getByLabel('Adresse email', {exact: true}).fill('personne@example.test')
  await page.getByRole('button', {name: 'Recevoir un lien de connexion'}).click()
  await expect(page.getByText('Demande de connexion prise en compte', {exact: true})).toBeVisible()
  expect(errors).toEqual([])
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true)
  await page.screenshot({path: testInfo.outputPath('connexion.png'), fullPage: true})
})

test('proxy Next : pages privées et sessions expirées refusées', async ({page, context}) => {
  for (const path of ['/tableau-de-bord', '/administration/campagnes', '/mon-compte']) {

    await page.goto(path)

    await expect(page).toHaveURL(/\/login\?callbackUrl=/)
  }

  await authenticate(context, Date.now() - 60_000)
  await page.goto('/declarations')
  await expect(page).toHaveURL(/\/login\?callbackUrl=/)
})

test('export anonyme : aucun fichier confidentiel', async ({request}) => {
  const response = await request.get('/api/declarations/template', {maxRedirects: 0})
  expect([302, 307, 401, 403]).toContain(response.status())
  expect(response.headers()['content-disposition']).toBeUndefined()
})

test('export navigateur : fichier XLSX mis en forme sans renvoi des données au serveur', async ({page}) => {
  const sentData = []
  page.on('request', request => {
    if (request.method() !== 'GET') {
      sentData.push(request.url())
    }
  })
  await page.goto(storiesUrl + '/iframe.html?id=exports-excel--tableau&viewMode=story')
  const downloading = page.waitForEvent('download')
  await page.getByRole('button', {name: 'Exporter Excel'}).click()
  const download = await downloading
  expect(download.suggestedFilename()).toBe('prélèvements.xlsx')
  const workbook = await XlsxPopulate.fromDataAsync(await readFile(await download.path()))
  expect(workbook.sheet(0).cell('A1').value()).toBe('Prélèvement')
  expect(workbook.sheet(0).cell('A1').style('bold')).toBe(true)
  expect(workbook.sheet(0).cell('A2').value()).toBe('=SUM(1,2)')
  expect(workbook.sheet(0).cell('A2').formula()).toBeUndefined()
  expect(workbook.sheet(0).cell('B2').value()).toBe(12.5)
  expect(sentData).toEqual([])
})

test('modèle de déclaration enrichi généré côté serveur', async ({context}) => {
  const cookie = await authenticate(context)
  const response = await context.request.get(frontUrl + '/api/declarations/template', {headers: {cookie}})
  expect(response.status()).toBe(200)
  expect(response.headers()['cache-control']).toContain('no-store')
  const workbook = await XlsxPopulate.fromDataAsync(await response.body())
  expect(workbook.sheets().length).toBeGreaterThan(0)
})

for (const story of ['default', 'mixed-types-and-axes', 'annotations-and-alerts', 'thresholds']) {
  test('graphique MUI : ' + story, async ({page}, testInfo) => {
    const errors = []
    page.on('pageerror', error => errors.push(error.message))
    await page.goto(storiesUrl + '/iframe.html?id=components-timeserieschart--' + story + '&viewMode=story')
    await expect(page.locator('#storybook-root svg').first()).toBeVisible()
    await expect.poll(() => page.locator('#storybook-root path.MuiLineChart-line').count()).toBeGreaterThan(0)
    expect(errors).toEqual([])
    await page.screenshot({path: testInfo.outputPath('graphique-' + story + '.png'), fullPage: true})
  })
}

test('sélecteur de période DSFR/MUI interactif', async ({page}, testInfo) => {
  const errors = []
  page.on('pageerror', error => errors.push(error.message))
  await page.goto(storiesUrl + '/iframe.html?id=components-datepicker--vue-par-mois&viewMode=story')
  await page.getByRole('button', {name: 'Sélectionner une période'}).click()
  await expect(page.getByText('2024', {exact: true}).first()).toBeVisible()
  expect(errors).toEqual([])
  await page.screenshot({path: testInfo.outputPath('periode.png'), fullPage: true})
})

test('carte MapLibre : rendu GeoJSON et worker sans réseau extérieur', async ({page}, testInfo) => {
  const errors = []
  page.on('pageerror', error => errors.push(error.message))
  await page.goto(storiesUrl + '/iframe.html?id=cartes-compatibilité--geo-json&viewMode=story')
  await expect(page.locator('[data-map-ready="true"]')).toBeVisible({timeout: 20_000})
  expect(errors).toEqual([])
  await page.screenshot({path: testInfo.outputPath('carte.png'), fullPage: true})
})

test('carte sans WebGL2 : message accessible sans casser la page', async ({page}) => {
  const errors = []
  page.on('pageerror', error => errors.push(error.message))
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext
    HTMLCanvasElement.prototype.getContext = function (type, ...args) {
      return type === 'webgl2' ? null : original.call(this, type, ...args)
    }
  })
  await page.goto(storiesUrl + '/iframe.html?id=cartes-compatibilité--geo-json&viewMode=story')
  await expect(page.getByRole('status')).toContainText('La carte ne peut pas s’afficher')
  expect(errors).toEqual([])
})

test('préleveur personne morale : recherche, sélection clavier et effacement sans erreur MUI', async ({page}) => {
  const errors = []
  page.on('pageerror', error => errors.push(error.message))
  let sendResults
  const resultsReady = new Promise(resolve => { sendResults = resolve })
  const queries = []
  await page.route('https://recherche-entreprises.api.gouv.fr/search?**', async route => {
    queries.push(new URL(route.request().url()).searchParams.get('q'))
    await resultsReady
    await route.fulfill({json: {results: [{
      siren: '123456789',
      nom_raison_sociale: 'Structure de test',
      siege: {
        siret: '12345678900012', numero_voie: '12', type_voie: 'RUE',
        libelle_voie: 'DES TESTS', code_postal: '75001', libelle_commune: 'PARIS'
      }
    }]}})
  })

  await page.goto(storiesUrl + '/iframe.html?id=formulaires-preleveur-personne-morale--creation&viewMode=story')
  const search = page.getByRole('combobox', {name: /Rechercher une structure/})
  await expect(search).toBeVisible()
  await search.fill('Structure')
  await expect(page.getByRole('progressbar')).toBeVisible()
  sendResults()
  await expect(page.getByRole('option', {name: /Structure de test/})).toBeVisible()
  await search.press('ArrowDown')
  await search.press('Enter')
  await expect(search).toHaveValue('Structure de test')
  await expect(page.getByRole('textbox', {name: /^Nom de la structure/})).toHaveValue('Structure de test')
  await expect(page.getByRole('textbox', {name: /^SIRET de la structure/})).toHaveValue('12345678900012')
  await expect(page.getByRole('progressbar')).toHaveCount(0)
  await page.locator('.MuiAutocomplete-clearIndicator').click()
  await expect(search).toHaveValue('')
  expect(queries).toEqual(['Structure'])
  expect(errors).toEqual([])
})

test('préleveur personne morale : erreur de recherche visible sans bloquer le formulaire', async ({page}) => {
  const errors = []
  page.on('pageerror', error => errors.push(error.message))
  await page.route('https://recherche-entreprises.api.gouv.fr/search?**', route => route.fulfill({
    status: 503, json: {message: 'Erreur simulée'}
  }))
  await page.goto(storiesUrl + '/iframe.html?id=formulaires-preleveur-personne-morale--creation&viewMode=story')
  const search = page.getByRole('combobox', {name: /Rechercher une structure/})
  await search.fill('Structure')
  await expect(page.locator('#structure-search-error')).toHaveText('La recherche de structure est momentanément indisponible.')
  await expect(search).toHaveAttribute('aria-describedby', 'structure-search-error')
  await page.getByRole('textbox', {name: /^Nom de la structure/}).fill('Saisie manuelle')
  await expect(page.getByRole('textbox', {name: /^Nom de la structure/})).toHaveValue('Saisie manuelle')
  expect(errors).toEqual([])
})
