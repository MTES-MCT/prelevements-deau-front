import {randomUUID} from 'node:crypto'

import {expect, test} from '@playwright/test'
import {encode} from 'next-auth/jwt'

import {collectorPointIds as ids} from '../../.github/scripts/collector-point-fixtures.mjs'

const frontUrl = 'https://127.0.0.1:3443'
const pointPath = `/points-prelevement/${ids.point}`
const mapPath = `/points-prelevement?point-prelevement=${ids.point}`
const mapTile = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADElEQVR4nGN49+kXAAWsAttzkl10AAAAAElFTkSuQmCC', 'base64')
test.use({ignoreHTTPSErrors: true, reducedMotion: 'reduce'})

async function authenticate(context, scenario = 'map') {
  const token = await encode({secret: 'browser-tests-only-never-a-real-secret', maxAge: 3600,
    token: {sub: ids.preleveur, token: `browser-test-collector-points-admin-${scenario}-${randomUUID()}`, role: 'ADMIN', permissions: [],
      apiExpiresAt: new Date(Date.now() + 3600000).toISOString(), infoRefreshedAt: Date.now(),
      userInfo: {id: ids.preleveur, email: 'agent@example.test'}}})
  await context.addCookies(['next-auth.session-token', '__Secure-next-auth.session-token'].map(name => ({
    name, value: token, url: frontUrl, httpOnly: true, secure: true, sameSite: 'Lax'
  })))
}

test.beforeEach(async ({context}) => {
  await context.route('**/*', route => {
    const url = new URL(route.request().url())
    if ([frontUrl, 'http://127.0.0.1:3417'].includes(url.origin)) return route.continue()
    if (url.hostname === 'data.geopf.fr' || (url.hostname === 'openmaptiles.github.io' && url.pathname.endsWith('.png'))) {
      return route.fulfill({contentType: 'image/png', body: mapTile})
    }
    if (url.hostname === 'openmaptiles.github.io' && url.pathname.endsWith('.json')) return route.fulfill({json: {}})
    return route.abort()
  })
})

async function openPopup(page) {
  await page.goto(frontUrl + mapPath)
  const link = page.getByRole('link', {name: 'Voir la fiche du point', exact: true})
  await expect(link).toBeVisible({timeout: 20_000})
  await expect(link).toHaveAttribute('href', pointPath)
  return link
}

test('un clic simple sur le lien de la carte conserve la navigation vers la fiche', async ({page, context}) => {
  await authenticate(context)
  const link = await openPopup(page)
  await page.evaluate(() => {window.pointMapNavigationMarker = true})
  await link.click()
  await expect(page).toHaveURL(frontUrl + pointPath)
  expect(await page.evaluate(() => window.pointMapNavigationMarker)).toBe(true)
  expect(context.pages()).toHaveLength(1)
})

for (const [name, options] of [['Ctrl/Cmd-clic', {modifiers: ['ControlOrMeta']}], ['clic molette', {button: 'middle'}]]) {
  test(`${name} sur le lien ouvre un autre onglet et conserve la carte`, async ({page, context, isMobile}) => {
    test.skip(isMobile, 'Interaction clavier/souris sur ordinateur')
    await authenticate(context)
    const link = await openPopup(page)
    const opened = context.waitForEvent('page')
    await link.click(options)
    const detail = await opened
    await expect(detail).toHaveURL(frontUrl + pointPath)
    expect(new URL(page.url()).pathname + new URL(page.url()).search).toBe(mapPath)
    await expect(link).toBeVisible()
    await detail.close()
  })
}

for (const modifier of ['Control', 'Meta']) {
  test(`${modifier}-clic directement sur le point ouvre sa fiche sans quitter la carte`, async ({page, context, isMobile}) => {
    test.skip(isMobile, 'Interaction clavier/souris sur ordinateur')
    await authenticate(context)
    // Exercise a canvas that becomes visible before its map data is ready.
    const tiles = Promise.withResolvers()
    await page.route(url => url.hostname === 'data.geopf.fr', async route => {
      await tiles.promise
      await route.fulfill({contentType: 'image/png', body: mapTile})
    })
    await page.goto(frontUrl + '/points-prelevement')
    const canvas = page.locator('.maplibregl-canvas')
    await expect(canvas).toBeVisible({timeout: 20_000})
    const box = await canvas.boundingBox()
    let position = {x: box.width / 2, y: box.height / 2}
    try {
      await canvas.hover({position})
    } finally {
      tiles.resolve()
    }
    // A hover before marker rendering is not replayed by MapLibre. Wait for a
    // real point interaction, then perform the modified click exactly once.
    await expect(async () => {
      const currentBox = await canvas.boundingBox()
      position = {x: currentBox.width / 2, y: currentBox.height / 2}
      await canvas.hover({position})
      await expect(page.locator('.maplibregl-popup').getByRole('heading', {name: 'PP-SYNTHETIQUE', exact: true})).toBeVisible({timeout: 250})
    }).toPass({timeout: 20_000})
    const opened = context.waitForEvent('page')
    await canvas.click({position, modifiers: [modifier]})
    const detail = await opened
    await expect(detail).toHaveURL(frontUrl + pointPath)
    expect(new URL(page.url()).pathname).toBe('/points-prelevement')
    await detail.close()
  })
}

test('un point sans droit de lecture ne propose aucun lien vers sa fiche', async ({page, context}) => {
  await authenticate(context, 'map-restricted')
  await page.goto(frontUrl + mapPath)
  await expect(page.locator('.maplibregl-popup').getByRole('heading', {name: 'PP-SYNTHETIQUE', exact: true})).toBeVisible({timeout: 20_000})
  await expect(page.getByRole('link', {name: 'Voir la fiche du point', exact: true})).toHaveCount(0)
})
