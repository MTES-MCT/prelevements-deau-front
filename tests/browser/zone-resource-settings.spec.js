import {randomUUID} from 'node:crypto'
import {test, expect} from '@playwright/test'
import {encode} from 'next-auth/jwt'
import {zoneResourceIds} from '../../.github/scripts/zone-resource-settings-fixtures.mjs'

const frontUrl = 'https://127.0.0.1:3443'
const apiUrl = 'http://127.0.0.1:3431'
const settingsUrl = `${frontUrl}/zones/${zoneResourceIds.sage}/parametres-sage`
test.use({ignoreHTTPSErrors: true, reducedMotion: 'reduce'})

test.beforeEach(async ({page}) => {
  await page.route('**/*', route => [frontUrl, 'http://127.0.0.1:3417'].includes(new URL(route.request().url()).origin)
    ? route.continue() : route.abort())
})

async function authenticate(context, mode = 'edit') {
  const apiToken = `browser-test-zone-resource-${mode}-${randomUUID()}`
  const token = await encode({
    secret: 'browser-tests-only-never-a-real-secret',
    token: {
      sub: zoneResourceIds.sage, token: apiToken, role: 'INSTRUCTOR',
      permissions: mode === 'denied' ? [] : ['zone.detail.read', 'zone.resource.list'],
      apiExpiresAt: new Date(Date.now() + 3_600_000).toISOString(), infoRefreshedAt: Date.now(),
      userInfo: {id: zoneResourceIds.sage, email: 'sage@example.test'}
    },
    maxAge: 3600
  })
  await context.addCookies(['next-auth.session-token', '__Secure-next-auth.session-token'].map(name => ({
    name, value: token, url: frontUrl, httpOnly: true, secure: true, sameSite: 'Lax'
  })))
  return apiToken
}

async function readWrites(context, apiToken) {
  const response = await context.request.get(`${apiUrl}/api/__zone-resource-requests`, {
    headers: {authorization: `Bearer ${apiToken}`}
  })
  expect(response.ok()).toBe(true)
  return response.json()
}

test('onglet SAGE distinct des stations et sauvegarde explicite des quatre types', async ({page, context}, testInfo) => {
  const apiToken = await authenticate(context)
  await page.goto(`${frontUrl}/zones/${zoneResourceIds.sage}`)
  const navigation = page.getByRole('navigation', {name: 'Navigation de la zone'})
  await expect(navigation.getByRole('link', {name: 'Paramétrage des ressources', exact: true}))
    .toHaveAttribute('href', `/zones/${zoneResourceIds.sage}/parametres-ressources`)
  await navigation.getByRole('link', {name: 'Paramètres du SAGE', exact: true}).click()
  await expect(page).toHaveURL(settingsUrl)
  const select = page.getByRole('combobox', {name: 'Type de ressource gérée', exact: true})
  await expect(select).toHaveValue('MIXTE')
  const save = page.getByRole('button', {name: 'Enregistrer', exact: true})
  await expect(save).toBeDisabled()
  for (const managedResourceType of ['SUPERFICIELLE', 'SOUTERRAIN', 'TRANSITION', 'MIXTE']) {
    await select.selectOption(managedResourceType)
    await expect(page.getByRole('status')).toHaveCount(0)
    await save.click()
    await expect(page.getByRole('status')).toHaveText('Paramètres du SAGE enregistrés.')
    await expect(save).toBeDisabled()
    await page.reload()
    await expect(select).toHaveValue(managedResourceType)
  }
  expect(await readWrites(context, apiToken)).toEqual(['SUPERFICIELLE', 'SOUTERRAIN', 'TRANSITION', 'MIXTE']
    .map(managedResourceType => ({method: 'PATCH', body: {managedResourceType}})))
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true)
  await page.getByRole('region', {name: 'Type de ressource gérée', exact: true})
    .screenshot({path: testInfo.outputPath('parametres-sage.png'), animations: 'disabled'})
})

test('la saisie attend l’hydratation pour ne pas perdre le choix de ressource', async ({page, context}) => {
  await authenticate(context)
  let releaseScripts
  const scriptsReady = new Promise(resolve => { releaseScripts = resolve })
  await page.route(`${frontUrl}/_next/static/**`, async route => {
    if (route.request().resourceType() === 'script') await scriptsReady
    await route.fallback()
  })
  const select = page.getByRole('combobox', {name: 'Type de ressource gérée', exact: true})
  try {
    await page.goto(settingsUrl, {waitUntil: 'commit'})
    await expect(select).toBeVisible()
    await expect(select).toBeDisabled()
  } finally {
    releaseScripts()
  }
  await expect(select).toBeEnabled()
  await select.selectOption('SOUTERRAIN')
  await page.getByRole('button', {name: 'Enregistrer', exact: true}).click()
  await expect(page.getByRole('status')).toHaveText('Paramètres du SAGE enregistrés.')
})

test('erreur visible près du bouton et choix conservé pour réessayer', async ({page, context}) => {
  const apiToken = await authenticate(context, 'failure')
  await page.goto(settingsUrl)
  const settings = page.getByRole('region', {name: 'Type de ressource gérée', exact: true})
  const select = page.getByRole('combobox', {name: 'Type de ressource gérée', exact: true})
  await select.selectOption('SOUTERRAIN')
  await page.getByRole('button', {name: 'Enregistrer', exact: true}).click()
  await expect(settings.getByRole('alert')).toContainText('Enregistrement temporairement indisponible.')
  await expect(select).toHaveValue('SOUTERRAIN')
  await expect(page.getByRole('status')).toHaveCount(0)
  await page.getByRole('button', {name: 'Enregistrer', exact: true}).click()
  await expect(page.getByRole('status')).toHaveText('Paramètres du SAGE enregistrés.')
  await expect(settings.getByRole('alert')).toHaveCount(0)
  expect(await readWrites(context, apiToken)).toHaveLength(2)
})

test('lecture seule sans bouton ni écriture, zones non SAGE sans onglet ni formulaire', async ({page, context}) => {
  const apiToken = await authenticate(context, 'readonly')
  await page.goto(settingsUrl)
  await expect(page.getByText('Mixte (tous les types)', {exact: true})).toBeVisible()
  await expect(page.getByText('Vous disposez d’un accès en lecture seule à ces paramètres.')).toBeVisible()
  await expect(page.getByRole('combobox')).toHaveCount(0)
  await expect(page.getByRole('button', {name: 'Enregistrer', exact: true})).toHaveCount(0)
  await page.goto(`${frontUrl}/zones/${zoneResourceIds.department}`)
  await expect(page.getByRole('link', {name: 'Paramètres du SAGE', exact: true})).toHaveCount(0)
  await page.goto(`${frontUrl}/zones/${zoneResourceIds.department}/parametres-sage`)
  await expect(page.getByRole('combobox')).toHaveCount(0)
  await expect(page.getByRole('heading', {name: 'Type de ressource gérée', exact: true})).toHaveCount(0)
  expect(await readWrites(context, apiToken)).toEqual([])
})

test('absence de droit de lecture : aucun formulaire ni requête de modification', async ({page, context}) => {
  const apiToken = await authenticate(context, 'denied')
  await page.goto(settingsUrl)
  await expect(page.getByRole('combobox')).toHaveCount(0)
  await expect(page.getByRole('button', {name: 'Enregistrer', exact: true})).toHaveCount(0)
  expect(await readWrites(context, apiToken)).toEqual([])
})
