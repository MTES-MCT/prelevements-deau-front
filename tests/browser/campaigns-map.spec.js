import {randomUUID} from 'node:crypto'

import {expect, test} from '@playwright/test'
import {encode} from 'next-auth/jwt'

import {campaignIds} from '../../.github/scripts/campaign-fixtures.mjs'

const frontUrl = 'https://127.0.0.1:3443'
const mapTile = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADElEQVR4nGN49+kXAAWsAttzkl10AAAAAElFTkSuQmCC', 'base64')
test.use({ignoreHTTPSErrors: true, reducedMotion: 'reduce'})

async function authenticate(context, role) {
  const token = await encode({secret: 'browser-tests-only-never-a-real-secret', token: {
    sub: campaignIds.user, token: `browser-test-campaign-${role}-${randomUUID()}`, role: 'DECLARANT', permissions: [], declarantRole: 'PRELEVEUR',
    apiExpiresAt: new Date(Date.now() + 3_600_000).toISOString(), infoRefreshedAt: Date.now(),
    userInfo: {id: campaignIds.user, email: 'campaign@example.test', declarantRole: 'PRELEVEUR'}
  }, maxAge: 3600})
  await context.addCookies(['next-auth.session-token', '__Secure-next-auth.session-token'].map(name => ({name, value: token, url: frontUrl, httpOnly: true, secure: true, sameSite: 'Lax'})))
}

test.beforeEach(async ({page}) => {
  await page.route('**/*', route => {
    const url = new URL(route.request().url())
    if ([frontUrl, 'http://127.0.0.1:3417'].includes(url.origin)) return route.continue()
    // Successful synthetic tiles prevent retries across parent zoom levels from
    // keeping MapLibre busy. The real WebGL renderer and module worker still run.
    if (url.hostname === 'data.geopf.fr' || (url.hostname === 'openmaptiles.github.io' && url.pathname.endsWith('.png'))) {
      return route.fulfill({contentType: 'image/png', body: mapTile})
    }
    if (url.hostname === 'openmaptiles.github.io' && url.pathname.endsWith('.json')) return route.fulfill({json: {}})
    return route.abort()
  })
  await page.clock.setFixedTime(new Date('2026-11-01T12:00:00Z'))
})

test('la carte préleveur ouvre une vue d’ensemble sans sélection et conserve chaque fiche d’un point partagé', async ({page, context}, testInfo) => {
  await authenticate(context, 'map-many')
  const errors = []
  page.on('pageerror', error => errors.push(error.message))
  await page.goto(`${frontUrl}/campagnes/${campaignIds.campaign}`)
  const map = page.getByRole('region', {name: 'Localisation des points de prélèvement', exact: true})
  const selected = page.locator('button[aria-pressed="true"]')
  await map.scrollIntoViewIfNeeded()
  await expect(map.locator('[data-map-ready="true"]')).toBeVisible({timeout: 20_000})
  await expect(page.getByText('Page 1 sur 2', {exact: true})).toBeVisible()
  await expect(page.getByRole('link', {name: 'Commencer ma déclaration', exact: true})).toHaveCount(25)
  await expect(selected).toHaveCount(0)
  // With two distinct points at the same latitude, fitBounds places the eastern
  // point at the right padding. Its response is on page 2, but its marker must
  // already be visible on arrival, without zooming or recentering the map.
  const canvas = map.locator('canvas')
  const box = await canvas.boundingBox()
  await expect(map.locator('[data-map-ready="true"]')).toBeVisible()
  await expect(async () => {
    await canvas.click({position: {x: box.width - 40, y: box.height / 2}})
    await expect(selected).toContainText('027')
  }).toPass()
  await expect(page.getByText('Page 2 sur 2', {exact: true})).toBeVisible()
  await expect(page.getByRole('link', {name: 'Commencer ma déclaration', exact: true})).toHaveCount(2)
  await page.getByRole('button', {name: 'Précédent', exact: true}).click()
  await expect(page.getByText('Page 1 sur 2', {exact: true})).toBeVisible()
  await expect(selected).toHaveCount(0)
  await page.getByRole('button', {name: /Point sans coordonnées/}).click()
  await expect(selected).toContainText('002')
  await page.getByRole('button', {name: 'Suivant', exact: true}).click()
  await expect(page.getByText('Page 2 sur 2', {exact: true})).toBeVisible()
  await expect(selected).toHaveCount(0)
  await page.getByRole('button', {name: /026/}).click()
  await expect(selected).toContainText('026')
  await expect(map.locator('[data-map-ready="true"]')).toBeVisible()
  // Clicking the same physical point keeps the selected response, even though
  // several other campaign responses share that marker.
  await expect(async () => {
    await canvas.click({position: {x: box.width / 2, y: box.height / 2}})
    await expect(selected).toContainText('026')
  }).toPass()
  expect(errors).toEqual([])
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true)
  await map.screenshot({path: testInfo.outputPath('points-campagne.png')})
})

test('sans coordonnées la liste reste accessible et aucun point n’est présélectionné', async ({page, context}) => {
  await authenticate(context, 'multiple')
  await page.goto(`${frontUrl}/campagnes/${campaignIds.campaign}`)
  const map = page.getByRole('region', {name: 'Localisation des points de prélèvement', exact: true})
  await expect(map.getByText('Aucun point géolocalisé.', {exact: true})).toBeVisible()
  await expect(map.locator('canvas')).toHaveCount(0)
  await expect(page.locator('button[aria-pressed="true"]')).toHaveCount(0)
  await page.getByRole('button', {name: /Point synthétique.*001/}).click()
  await expect(page.locator('button[aria-pressed="true"]')).toContainText('001')
  await expect(page.getByRole('link', {name: 'Commencer ma déclaration', exact: true}).first()).toHaveAttribute('href', `/campagnes/${campaignIds.campaign}/reponses/${campaignIds.response}`)
})

test('sur une grande liste la recherche et le statut filtrent les réponses sans confondre les comptages', async ({page, context}) => {
  await authenticate(context, 'map-many')
  await page.goto(`${frontUrl}/campagnes/${campaignIds.campaign}`)
  await expect(page.getByText('Page 1 sur 2', {exact: true})).toBeVisible()
  const search = page.getByRole('searchbox', {name: 'Rechercher un point', exact: true})
  await search.fill('027')
  await expect(page.getByRole('link', {name: 'Commencer ma déclaration', exact: true})).toHaveCount(1)
  await expect(page.getByRole('button', {name: /Point est.*027/})).toBeVisible()
  await expect(page.getByRole('navigation', {name: 'Pagination', exact: true})).toHaveCount(0)
  await search.fill('partagé')
  await expect(page.getByRole('link', {name: 'Commencer ma déclaration', exact: true})).toHaveCount(25)
  await page.getByRole('combobox', {name: 'Réponse', exact: true}).selectOption('SUBMITTED')
  await expect(page.getByText('Aucun point ne correspond à ces filtres.', {exact: true})).toBeVisible()
  await page.getByRole('combobox', {name: 'Réponse', exact: true}).selectOption('')
  await search.clear()
  await expect(page.getByText('Page 1 sur 2', {exact: true})).toBeVisible()
  await expect(page.locator('button[aria-pressed="true"]')).toHaveCount(0)
})

test('la carte du formulaire rend réellement son point dans chaque moteur', async ({page, context}, testInfo) => {
  await authenticate(context, 'map')
  const errors = []
  page.on('pageerror', error => errors.push(error.message))
  await page.goto(`${frontUrl}/campagnes/${campaignIds.campaign}/reponses/${campaignIds.response}`)
  const map = page.getByRole('region', {name: 'Localisation du point de prélèvement', exact: true})
  await map.scrollIntoViewIfNeeded()
  await expect(map.locator('[data-map-ready="true"]')).toBeVisible({timeout: 20_000})
  await expect(map.locator('[data-map-unavailable]')).toHaveCount(0)
  const canvas = await map.locator('canvas').elementHandle()
  await page.locator('[name="meters.0.season.indexEnd"]').fill('100')
  expect(await canvas.evaluate(element => element.isConnected)).toBe(true)
  expect(errors).toEqual([])
  await map.screenshot({path: testInfo.outputPath('point-campagne-rendu.png')})
})

test('sans WebGL2 la liste des fiches reste utilisable', async ({page, context}) => {
  await authenticate(context, 'map-many')
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext
    HTMLCanvasElement.prototype.getContext = function (type, ...args) { return type === 'webgl2' ? null : original.call(this, type, ...args) }
  })
  await page.goto(`${frontUrl}/campagnes/${campaignIds.campaign}`)
  await expect(page.locator('[data-map-unavailable]')).toBeVisible()
  await expect(page.getByRole('link', {name: 'Commencer ma déclaration', exact: true})).toHaveCount(25)
  await page.getByRole('button', {name: 'Suivant', exact: true}).click()
  await expect(page.getByRole('link', {name: 'Commencer ma déclaration', exact: true})).toHaveCount(2)
})

test('Mes points de prélèvement rend un marqueur réel sur le tableau de bord', async ({page, context}, testInfo) => {
  await authenticate(context, 'map')
  const errors = []
  page.on('pageerror', error => errors.push(error.message))
  await page.goto(`${frontUrl}/tableau-de-bord`)
  await expect(page.getByRole('heading', {name: 'Mes points de prélèvement', exact: true})).toBeVisible()
  const map = page.locator('.dashboard-points-map-shell').first()
  await map.scrollIntoViewIfNeeded()
  await expect(map.locator('[data-map-ready="true"]')).toBeVisible({timeout: 20_000})
  await expect(map.locator('[data-map-unavailable]')).toHaveCount(0)
  const canvas = map.locator('canvas')
  const box = await canvas.boundingBox()
  expect(box.width).toBeGreaterThan(200)
  expect(box.height).toBeGreaterThanOrEqual(350)
  await canvas.click({position: {x: box.width / 2, y: box.height / 2}})
  await expect(page.getByRole('button', {name: 'Voir la fiche du point', exact: true})).toBeVisible()
  expect(errors).toEqual([])
  await map.screenshot({path: testInfo.outputPath('mes-points-tableau-de-bord.png')})
})
