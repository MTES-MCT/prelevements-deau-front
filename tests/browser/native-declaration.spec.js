import {randomUUID} from 'node:crypto'
import {test, expect} from '@playwright/test'
import {encode} from 'next-auth/jwt'
import {nativeIds} from '../../.github/scripts/native-declaration-fixtures.mjs'

const frontUrl = 'https://127.0.0.1:3443'
test.use({ignoreHTTPSErrors: true})
test.beforeEach(async ({page}) => {
  await page.route('**/*', route => [frontUrl, 'http://127.0.0.1:3417'].includes(new URL(route.request().url()).origin) ? route.continue() : route.abort())
})

async function authenticate(context, role, scenario = '') {
  const apiToken = `browser-test-native-declaration-${role}-${scenario}-${randomUUID()}`
  const token = await encode({secret: 'browser-tests-only-never-a-real-secret', token: {sub: 'synthetic-user', token: apiToken, role,
    permissions: ['declaration.list', 'declaration.read'], apiExpiresAt: new Date(Date.now() + 3600000).toISOString(), infoRefreshedAt: Date.now(), userInfo: {id: 'synthetic-user', email: 'native@example.test'}}, maxAge: 3600})
  await context.addCookies(['next-auth.session-token', '__Secure-next-auth.session-token'].map(name => ({name, value: token, url: frontUrl, httpOnly: true, secure: true, sameSite: 'Lax'})))
  return apiToken
}

for (const historical of [true, false]) {
  test(`ADMIN ${historical ? 'ne peut pas rejouer un dossier DN historique' : 'peut toujours rejouer un fichier PE ordinaire'}`, async ({page, context}) => {
    await authenticate(context, 'ADMIN', historical ? 'historical-replay' : 'ordinary-replay')
    await page.goto(`${frontUrl}/declarations/${nativeIds.source}`)
    await expect(page.getByRole('heading', {name: 'Données déclarées', exact: true})).toBeVisible()
    await expect(page.getByRole('button', {name: 'Supprimer', exact: true})).toBeVisible()
    await expect(page.getByRole('button', {name: 'Rejouer', exact: true})).toHaveCount(historical ? 0 : 1)
  })
}

test("l'agent attend les gestionnaires React avant d'ouvrir les valeurs natives", async ({page, context}) => {
  await authenticate(context, 'INSTRUCTOR')
  let releaseScripts
  const scriptsReady = new Promise(resolve => { releaseScripts = resolve })
  await page.route(`${frontUrl}/_next/static/**`, async route => {
    if (route.request().resourceType() === 'script') await scriptsReady
    await route.fallback()
  })
  const values = page.getByText('Voir les valeurs', {exact: true}).first()
  try {
    await page.goto(`${frontUrl}/declarations/${nativeIds.source}`, {waitUntil: 'commit'})
    await expect(values).toBeVisible()
    await expect(values).toHaveAttribute('aria-disabled', 'true')
    await expect(values.locator('..')).toHaveAttribute('inert', '')
  } finally {
    releaseScripts()
  }

  await expect(values).toHaveAttribute('aria-disabled', 'false')
  await values.click()
  await expect(page.getByRole('cell', {name: '01/01/2026 00:00:00', exact: true})).toBeVisible()
})

for (const role of ['INSTRUCTOR', 'DECLARANT']) {
  test(`${role} voit un avertissement regroupé pour un point reconnu sans exploitation couvrant la période`, async ({page, context}) => {
    await authenticate(context, role, 'association-warning')
    const path = role === 'DECLARANT' ? `/mes-declarations/${nativeIds.declaration}` : `/declarations/${nativeIds.source}`
    await page.goto(frontUrl + path)
    await expect(page.getByRole('heading', {name: 'Points reconnus, données à vérifier', exact: true})).toHaveCount(1)
    await expect(page.getByText('aucune exploitation ne couvre toute la période déclarée.', {exact: false})).toHaveCount(1)
    await expect(page.getByText('elles sont exclues du calcul pour éviter les doubles comptes.', {exact: false})).toHaveCount(1)
    await expect(page.getByRole('heading', {name: 'Instruction des données'})).toHaveCount(0)
    await expect(page.getByRole('button', {name: /Associer/})).toHaveCount(0)
    await page.getByText('Voir les valeurs', {exact: true}).first().click()
    await expect(page.getByRole('cell', {name: '01/01/2026 00:00:00', exact: true})).toBeVisible()
  })

  test(`${role} consulte les valeurs natives paginées dans la déclaration existante`, async ({page, context, request}, testInfo) => {
    const apiToken = await authenticate(context, role)
    const path = role === 'DECLARANT' ? `/mes-declarations/${nativeIds.declaration}` : `/declarations/${nativeIds.source}`
    await page.goto(frontUrl + path)
    await expect(page.getByRole('heading', {name: 'Données déclarées', exact: true})).toBeVisible()
    await expect(page.getByRole('heading', {name: 'Instruction des données'})).toHaveCount(0)
    const readRequests = async () => (await request.get('http://127.0.0.1:3431/api/__native-values-requests', {headers: {Authorization: `Bearer ${apiToken}`}})).json()
    expect(await readRequests()).toEqual([])
    const values = page.getByText('Voir les valeurs', {exact: true})
    await values.nth(0).click()
    await expect(page.getByRole('cell', {name: '01/01/2026 00:00:00', exact: true})).toBeVisible()
    await expect(page.getByRole('cell', {name: '01/02/2026 00:00:00', exact: true})).toBeVisible()
    await expect(page.getByRole('columnheader', {name: 'Fin de période (exclue)', exact: true})).toBeVisible()
    await values.nth(1).click()
    const table = page.getByRole('table').nth(1)
    await expect(table.locator('tbody tr')).toHaveCount(50)
    await expect(table.getByRole('cell', {name: '01/01/2026 04:01:23', exact: true}).first()).toBeVisible()
    await page.getByRole('button', {name: 'Suivant', exact: true}).nth(1).click()
    await expect(table.locator('tbody tr')).toHaveCount(1)
    await expect(table.getByRole('cell', {name: '999.000000000000001', exact: true})).toBeVisible()
    await expect(page.getByRole('button', {name: 'Suivant', exact: true}).nth(1)).toBeDisabled()
    expect(await readRequests()).toEqual([{limit: '50'}, {limit: '50'}, {limit: '50', cursor: 'last-49'}])
    await page.getByRole('heading', {name: 'Données déclarées', exact: true}).scrollIntoViewIfNeeded()
    await page.screenshot({path: testInfo.outputPath('native-values.png'), fullPage: true})
    if (role === 'INSTRUCTOR') {
      await page.goto(frontUrl + '/declarations')
      await expect(page.getByLabel('Instruction', {exact: true})).toHaveCount(0)
      await expect(page.getByLabel('Provenance', {exact: true})).toHaveCount(0)
      await expect(page.getByRole('link', {name: /rattacher ou à reprendre/})).toHaveCount(0)
    }
  })
}

for (const missingPoint of [false, true]) {
  test(`un agent sans droit de rapprochement voit le point sur la carte${missingPoint ? ' même si une autre ligne reste sans point' : ''}`, async ({page, context, request}, testInfo) => {
    const apiToken = await authenticate(context, 'INSTRUCTOR', `readonly-map-${missingPoint ? 'missing-point' : 'associated'}`)
    const mapTile = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADElEQVR4nGN49+kXAAWsAttzkl10AAAAAElFTkSuQmCC', 'base64')
    await page.route(url => url.hostname === 'data.geopf.fr', route => route.fulfill({contentType: 'image/png', body: mapTile}))
    await page.goto(`${frontUrl}/declarations/${nativeIds.source}`)
    const canvas = page.locator('.declaration-reconciliation-map-shell .maplibregl-canvas')
    await expect(canvas).toBeVisible({timeout: 20_000})
    await expect(page.getByText('Aucun point associé géolocalisé.', {exact: true})).toHaveCount(0)
    await expect(page.getByRole('button', {name: /Associer|Modifier les associations/})).toHaveCount(0)
    await expect(async () => {
      const box = await canvas.boundingBox()
      await canvas.click({position: {x: box.width / 2, y: box.height / 2}})
      await expect(page.locator('.maplibregl-popup').getByText('Forage synthétique', {exact: true})).toBeVisible({timeout: 300})
    }).toPass({timeout: 20_000})
    await expect(page.locator('.maplibregl-popup').getByRole('button', {name: /Associer|Remplacer/})).toHaveCount(0)
    const popupBox = await page.locator('.maplibregl-popup').boundingBox()
    expect(popupBox.x).toBeGreaterThanOrEqual(0)
    expect(popupBox.x + popupBox.width).toBeLessThanOrEqual(page.viewportSize().width)
    const mapRequests = await request.get('http://127.0.0.1:3431/api/__native-map-requests', {headers: {Authorization: `Bearer ${apiToken}`}})
    expect(await mapRequests.json()).toEqual([])
    await canvas.screenshot({path: testInfo.outputPath('readonly-declaration-map.png')})
  })
}
