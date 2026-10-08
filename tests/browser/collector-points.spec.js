import {randomUUID} from 'node:crypto'
import {test, expect} from '@playwright/test'
import {encode} from 'next-auth/jwt'
import {collectorPointIds as ids} from '../../.github/scripts/collector-point-fixtures.mjs'

const frontUrl = 'https://127.0.0.1:3443'
test.use({ignoreHTTPSErrors: true})
test.beforeEach(async ({page}) => {
  await page.route('**/*', route => [frontUrl, 'http://127.0.0.1:3417'].includes(new URL(route.request().url()).origin)
    ? route.continue() : route.abort())
})
async function authenticate(context, scenario = 'enabled') {
  const apiToken = `browser-test-collector-points-${scenario}-${randomUUID()}`
  const token = await encode({secret: 'browser-tests-only-never-a-real-secret', maxAge: 3600,
    token: {sub: scenario === 'admin' ? ids.preleveur : ids.collector, token: apiToken,
      role: scenario === 'admin' ? 'ADMIN' : 'DECLARANT', declarantRole: 'COLLECTEUR', permissions: [],
      apiExpiresAt: new Date(Date.now() + 3600000).toISOString(), infoRefreshedAt: Date.now(),
      userInfo: {id: scenario === 'admin' ? ids.preleveur : ids.collector, email: 'collector@example.test'}}})
  await context.addCookies(['next-auth.session-token', '__Secure-next-auth.session-token'].map(name => ({
    name, value: token, url: frontUrl, httpOnly: true, secure: true, sameSite: 'Lax'
  })))
  return apiToken
}
async function writes(context, apiToken) {
  const response = await context.request.get('http://127.0.0.1:3431/api/__collector-point-writes', {
    headers: {authorization: `Bearer ${apiToken}`}
  })
  return response.json()
}

test('édition partagée : champs protégés absents et version transmise', async ({page, context}, testInfo) => {
  const token = await authenticate(context)
  await page.goto(`${frontUrl}/points-prelevement/${ids.point}/edit`)
  await expect(page.getByText('Ces informations sont communes à toutes les exploitations de ce point.')).toBeVisible()
  await expect(page.getByLabel('Nom d’usage', {exact: true})).toBeEnabled()
  await expect(page.getByLabel('Nom du point *', {exact: true})).toHaveCount(0)
  await expect(page.getByLabel('Type de point *', {exact: true})).toHaveCount(0)
  await expect(page.getByText('Remarque interne (visible uniquement par les agents)')).toHaveCount(0)
  await expect(page.getByRole('button', {name: 'Supprimer', exact: true})).toHaveCount(0)
  await page.getByLabel('Nom d’usage', {exact: true}).fill('Forage corrigé')
  await page.screenshot({path: testInfo.outputPath('collector-edit.png'), fullPage: true})
  await page.getByRole('button', {name: 'Enregistrer les modifications', exact: true}).click()
  await expect(page).toHaveURL(`${frontUrl}/points-prelevement/${ids.point}`)
  expect((await writes(context, token))[0].body).toEqual({usageName: 'Forage corrigé', expectedUpdatedAt: '2026-10-07T12:00:00.000Z'})
})

test('un conflit de version conserve la saisie et affiche une erreur claire', async ({page, context}) => {
  await authenticate(context, 'conflict')
  await page.goto(`${frontUrl}/points-prelevement/${ids.point}/edit`)
  await page.getByLabel('Nom d’usage', {exact: true}).fill('Correction conservée')
  await page.getByRole('button', {name: 'Enregistrer les modifications', exact: true}).click()
  await expect(page.getByText(/Ce point a été modifié depuis son ouverture/)).toBeVisible()
  await expect(page.getByLabel('Nom d’usage', {exact: true})).toHaveValue('Correction conservée')
})

test('un point exceptionnel reste éditable sans déplacer sa localisation', async ({page, context}) => {
  await authenticate(context, 'exception')
  await page.goto(`${frontUrl}/points-prelevement/${ids.point}/edit`)
  await expect(page.getByLabel('Type de milieu *', {exact: true})).toBeDisabled()
  await expect(page.getByText(/rattachements territoriaux particuliers/)).toBeVisible()
  await expect(page.getByLabel('Nom d’usage', {exact: true})).toBeEnabled()
})

test('sans habilitation, le formulaire de création est inaccessible', async ({page, context}) => {
  await authenticate(context, 'disabled')
  await page.goto(`${frontUrl}/points-prelevement/new`)
  await expect(page.getByRole('button', {name: 'Créer le point et son exploitation'})).toHaveCount(0)
  await expect(page.getByText(/Vous n’avez pas|Accès refusé|accès|autorisé/i).first()).toBeVisible()
})

test('création avec nouveau préleveur : pas d’invitation implicite', async ({page, context}, testInfo) => {
  test.setTimeout(90000)
  const token = await authenticate(context)
  await page.goto(`${frontUrl}/points-prelevement/new`)
  await expect(page.getByLabel('Un nouveau préleveur', {exact: true})).toBeEnabled()
  await page.getByText('Un nouveau préleveur', {exact: true}).click()
  await expect(page.getByLabel('Un nouveau préleveur', {exact: true})).toBeChecked()
  await page.getByLabel('Type de préleveur *', {exact: true}).selectOption('IRRIGANT')
  await page.getByLabel('Nom *', {exact: true}).fill('Synthétique')
  await page.getByLabel('Prénom *', {exact: true}).fill('Camille')
  await expect(page.getByLabel('Envoyer un email d’accès', {exact: true})).not.toBeChecked()
  await page.getByLabel('Nom du point *', {exact: true}).fill('Nouveau forage synthétique')
  await page.getByLabel('Type de point *', {exact: true}).selectOption('PRELEVEMENT')
  await page.getByLabel('Type de milieu *', {exact: true}).selectOption('SOUTERRAIN')
  await page.getByText('Ou renseigner les coordonnées manuellement sous la carte', {exact: true}).scrollIntoViewIfNeeded()
  await page.getByRole('textbox', {name: /^X Lambert 93/}).fill('650000')
  await page.getByRole('textbox', {name: /^Y Lambert 93/}).fill('6860000')
  await page.getByLabel('Usage principal *', {exact: true}).selectOption(ids.usage)
  const form = page.getByRole('group', {name: 'Création d’un point et de son exploitation', exact: true})
  await expect.poll(() => form.evaluate(element => element.scrollWidth <= element.clientWidth + 1)).toBe(true)
  await page.screenshot({path: testInfo.outputPath('collector-create.png'), fullPage: true})
  await page.getByRole('button', {name: 'Créer le point et son exploitation', exact: true}).click()
  await expect(page).toHaveURL(`${frontUrl}/points-prelevement/${ids.created}`)
  const requests = await writes(context, token)
  expect(requests).toHaveLength(1)
  expect(requests[0].body).toMatchObject({notifyAccountCreation: false, preleveur: {firstName: 'Camille'}, exploitation: {status: 'EN_ACTIVITE'}})
  expect(requests[0].body.requestId).toMatch(/^[a-f\d-]{36}$/)
})

test('la création attend le chargement interactif avant de permettre la saisie', async ({page, context}) => {
  await authenticate(context)
  const scripts = Promise.withResolvers()
  await page.route('**/_next/static/**/*.js', async route => {
    await scripts.promise
    await route.continue()
  })
  await page.goto(`${frontUrl}/points-prelevement/new`, {waitUntil: 'commit'})
  const choice = page.getByLabel('Un nouveau préleveur', {exact: true})
  try {
    await expect(choice).toBeDisabled()
  } finally {
    scripts.resolve()
  }
  await expect(choice).toBeEnabled()
  await choice.focus()
  await choice.press('Space')
  await expect(page.getByLabel('Nom *', {exact: true})).toBeVisible()
})

test('un admin active puis révoque sans supprimer les zones choisies', async ({page, context}) => {
  const token = await authenticate(context, 'admin')
  await page.goto(`${frontUrl}/declarants/${ids.collector}/gestion`)
  const enabled = page.getByLabel('Autoriser la gestion des points', {exact: true})
  await expect(enabled).not.toBeChecked()
  await enabled.check()
  await page.getByRole('button', {name: 'Enregistrer l’habilitation', exact: true}).click()
  await expect(page.getByText('Gestion des points autorisée.', {exact: true})).toBeVisible()
  await enabled.uncheck()
  await page.getByRole('button', {name: 'Enregistrer l’habilitation', exact: true}).click()
  await expect(page.getByText('Gestion des points désactivée. Les autres droits sont conservés.')).toBeVisible()
  expect((await writes(context, token)).map(item => item.body)).toEqual([
    {enabled: true, zoneIds: [ids.zone]}, {enabled: false, zoneIds: [ids.zone]}
  ])
})
