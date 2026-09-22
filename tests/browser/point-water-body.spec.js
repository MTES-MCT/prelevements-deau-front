import {randomUUID} from 'node:crypto'
import {test, expect} from '@playwright/test'
import {encode} from 'next-auth/jwt'
import {pointWaterBodyIds} from '../../.github/scripts/point-water-body-fixtures.mjs'

const frontUrl = 'https://127.0.0.1:3443'
const apiUrl = 'http://127.0.0.1:3431'
const volumeLabel = 'Volume nominal de la retenue (m³)'
const identifierLabel = 'Identifiant du plan d’eau'
const originLabel = 'Origine prélèvement / rejet'
test.use({ignoreHTTPSErrors: true})

test.beforeEach(async ({page}) => {
  await page.route('**/*', route => [frontUrl, 'http://127.0.0.1:3417'].includes(new URL(route.request().url()).origin)
    ? route.continue() : route.abort())
})

async function authenticate(context, {readOnly = false} = {}) {
  const apiToken = `browser-test-water-body-${readOnly ? 'readonly' : 'edit'}-${randomUUID()}`
  const token = await encode({
    secret: 'browser-tests-only-never-a-real-secret',
    token: {
      sub: pointWaterBodyIds.existing, token: apiToken, role: 'INSTRUCTOR',
      permissions: readOnly ? [] : ['pp.create', 'pp.update'],
      apiExpiresAt: new Date(Date.now() + 3_600_000).toISOString(), infoRefreshedAt: Date.now(),
      userInfo: {id: pointWaterBodyIds.existing, email: 'water-body@example.test'}
    },
    maxAge: 3600
  })
  await context.addCookies(['next-auth.session-token', '__Secure-next-auth.session-token'].map(name => ({
    name, value: token, url: frontUrl, httpOnly: true, secure: true, sameSite: 'Lax'
  })))
  return apiToken
}

async function readWrites(context, apiToken) {
  const response = await context.request.get(`${apiUrl}/api/__water-body-requests`, {
    headers: {authorization: `Bearer ${apiToken}`}
  })
  expect(response.ok()).toBe(true)
  return response.json()
}

async function saveEdit(page) {
  await page.getByRole('button', {name: /^Valider les modifications sur le point de prélèvement/}).click()
  await expect(page).toHaveURL(`${frontUrl}/points-prelevement/${pointWaterBodyIds.created}`)
}

async function editCreatedPoint(page) {
  await page.getByRole('link', {name: 'Modifier le point de prélèvement', exact: true}).click()
  await expect(page.getByLabel(volumeLabel, {exact: true})).toBeVisible()
}

test('la saisie du point attend les gestionnaires React, même quand le JavaScript arrive tard', async ({page, context}) => {
  await authenticate(context)
  let releaseScripts
  const scriptsReady = new Promise(resolve => { releaseScripts = resolve })
  await page.route(`${frontUrl}/_next/static/**`, async route => {
    if (route.request().resourceType() === 'script') await scriptsReady
    await route.fallback()
  })
  const name = page.getByLabel('Nom du point *', {exact: true})
  try {
    await page.goto(`${frontUrl}/points-prelevement/new`, {waitUntil: 'commit'})
    await expect(name).toBeVisible()
    await expect(name).toBeDisabled()
  } finally {
    releaseScripts()
  }

  await expect(name).toBeEnabled()
  await name.fill('Nom conservé après hydratation')
  await expect(name).toHaveValue('Nom conservé après hydratation')
})

test('création, édition et effacement des caractéristiques du plan d’eau sans valeurs résiduelles', async ({page, context}, testInfo) => {
  test.setTimeout(90_000)
  const apiToken = await authenticate(context)
  await page.goto(`${frontUrl}/points-prelevement/new`)
  await expect(page.getByLabel(volumeLabel, {exact: true})).toHaveCount(0)
  await expect(page.getByLabel(identifierLabel, {exact: true})).toHaveCount(0)
  await page.getByLabel('Nom du point *', {exact: true}).fill('Retenue synthétique')
  await page.getByLabel('Type de point *', {exact: true}).selectOption('PRELEVEMENT')
  await page.getByLabel('Type de milieu *', {exact: true}).selectOption('SUPERFICIELLE')
  await page.getByLabel(originLabel, {exact: true}).selectOption('PLAN_EAU')
  const volume = page.getByLabel(volumeLabel, {exact: true})
  const identifier = page.getByLabel(identifierLabel, {exact: true})
  await expect(volume).toBeVisible()
  await expect(identifier).toBeVisible()
  await expect(identifier).toHaveAttribute('maxlength', '100')
  await volume.fill('12500.75')
  await identifier.fill('  PE-SYNTH-001  ')
  await identifier.press('Tab')
  await expect(identifier).toHaveValue('PE-SYNTH-001')
  await page.screenshot({path: testInfo.outputPath('plan-eau-creation.png'), animations: 'disabled'})

  // The map's external tiles are blocked; only its existing manual inputs are used.
  await page.getByText('Ou renseigner les coordonnées manuellement sous la carte', {exact: true}).scrollIntoViewIfNeeded()
  await page.getByRole('textbox', {name: /^X Lambert 93/}).fill('650000')
  await page.getByRole('textbox', {name: /^Y Lambert 93/}).fill('6860000')
  await page.getByRole('button', {name: 'Valider la création du point de prélèvement', exact: true}).click()
  await expect(page).toHaveURL(`${frontUrl}/points-prelevement/${pointWaterBodyIds.created}`)
  await expect(page.getByText('PE-SYNTH-001', {exact: true})).toBeVisible()
  await expect(page.getByText(/12[\s\u202f]500,75\s*m³/, {exact: true})).toBeVisible()
  expect((await readWrites(context, apiToken))[0]).toMatchObject({
    method: 'POST', body: {nature: 'PLAN_EAU', reservoirNominalVolume: 12500.75, waterBodyIdentifier: 'PE-SYNTH-001'}
  })

  await editCreatedPoint(page)
  await expect(volume).toHaveValue('12500.75')
  await expect(identifier).toHaveValue('PE-SYNTH-001')
  await volume.fill('8450.25')
  await identifier.fill('PE-SYNTH-EDIT')
  await saveEdit(page)
  await expect(page.getByText('PE-SYNTH-EDIT', {exact: true})).toBeVisible()
  await expect(page.getByText(/8[\s\u202f]450,25\s*m³/, {exact: true})).toBeVisible()

  await editCreatedPoint(page)
  await expect(volume).toHaveValue('8450.25')
  await volume.fill('')
  await identifier.fill('')
  await saveEdit(page)
  await expect(page.getByText(/^Volume nominal de la retenue\s*:/)).toHaveCount(0)
  await expect(page.getByText(/^Identifiant du plan d’eau\s*:/)).toHaveCount(0)
  expect((await readWrites(context, apiToken)).at(-1).body).toMatchObject({reservoirNominalVolume: null, waterBodyIdentifier: null})

  await editCreatedPoint(page)
  await expect(volume).toHaveValue('')
  await expect(identifier).toHaveValue('')
  await volume.fill('2500')
  await identifier.fill('A-EFFACER')
  await page.getByLabel(originLabel, {exact: true}).selectOption('COURS_EAU')
  await expect(volume).toHaveCount(0)
  await expect(identifier).toHaveCount(0)
  await saveEdit(page)
  expect((await readWrites(context, apiToken)).at(-1).body).toMatchObject({
    nature: 'COURS_EAU', reservoirNominalVolume: null, waterBodyIdentifier: null
  })
  await expect(page.getByText('A-EFFACER', {exact: true})).toHaveCount(0)
})

test('consultation seule : volume décimal visible, identifiant long lisible et absence de champs hors plan d’eau', async ({page, context}, testInfo) => {
  const apiToken = await authenticate(context, {readOnly: true})
  await page.goto(`${frontUrl}/points-prelevement/${pointWaterBodyIds.existing}`)
  await expect(page.getByRole('link', {name: 'Modifier le point de prélèvement', exact: true})).toHaveCount(0)
  const identifier = page.getByText(`PE-${'IDENTIFIANT-SYNTHETIQUE-'.repeat(4)}`, {exact: true})
  await expect(identifier).toBeVisible()
  await expect(page.getByText(/^0,5\s*m³$/, {exact: true})).toBeVisible()
  await page.setViewportSize({width: 390, height: 844})
  await identifier.scrollIntoViewIfNeeded()
  const box = await identifier.boundingBox()
  expect(box.x).toBeGreaterThanOrEqual(0)
  expect(box.x + box.width).toBeLessThanOrEqual(391)
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true)
  await page.screenshot({path: testInfo.outputPath('plan-eau-detail-mobile.png'), animations: 'disabled'})

  for (const id of [pointWaterBodyIds.empty, pointWaterBodyIds.otherOrigin]) {
    await page.goto(`${frontUrl}/points-prelevement/${id}`)
    await expect(page.getByText(/^Volume nominal de la retenue\s*:/)).toHaveCount(0)
    await expect(page.getByText(/^Identifiant du plan d’eau\s*:/)).toHaveCount(0)
  }
  expect(await readWrites(context, apiToken)).toEqual([])
})
