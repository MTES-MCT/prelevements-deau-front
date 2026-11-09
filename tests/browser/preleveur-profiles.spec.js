import {randomUUID} from 'node:crypto'

import {test, expect} from '@playwright/test'
import {decode, encode} from 'next-auth/jwt'

const frontUrl = 'https://127.0.0.1:3443'
const apiUrl = 'http://127.0.0.1:3431'
const secret = 'browser-tests-only-never-a-real-secret'
const firstProfile = 'eeeeeeee-1111-4111-8111-111111111111'
const secondProfile = 'eeeeeeee-2222-4222-8222-222222222222'
const firstSiret = '12345678900012'
test.use({ignoreHTTPSErrors: true})

async function session(page) {
  return page.evaluate(async () => (await fetch('/auth/nextauth/session')).json())
}

async function requests(context, token) {
  const result = await context.request.get(`${apiUrl}/__preleveur-profiles-requests`, {headers: {Authorization: `Bearer ${token}`}})
  return result.json()
}

async function chooseProfile(page, name) {
  const radio = page.getByRole('radio', {name})
  await radio.focus()
  await radio.press('Space')
  await expect(radio).toBeChecked()
}

async function login(page, scenario = 'success') {
  const single = scenario === 'single'
  await page.goto(`${frontUrl}/login?callbackUrl=${single ? '%2F' : '%2Fpoints-prelevement%2Fancienne-fiche'}`)
  await page.getByRole('tab', {name: 'Mot de passe', exact: true}).click()
  await page.getByLabel('Adresse email', {exact: true}).fill(`profiles-${scenario}-${randomUUID()}@example.test`)
  await page.getByLabel('Mot de passe', {exact: true}).fill('synthetic-test-password')
  await page.getByRole('button', {name: 'Se connecter', exact: true}).click()
  await expect(page).toHaveURL(`${frontUrl}${single ? '/tableau-de-bord' : '/choisir-preleveur'}`)
  if (!single) await expect(page.getByRole('heading', {name: 'Choisissez votre établissement', exact: true})).toBeVisible()
  return session(page)
}

test('connexion partagée, choix puis changement : identité, cookie, jeton et navigation suivent la fiche choisie', async ({page, context}, testInfo) => {
  const initial = await login(page)
  expect(initial.user.preleveurProfiles.selectionRequired).toBe(true)
  await expect(page.getByRole('button', {name: 'Connexion', exact: true})).toHaveCount(0)
  await expect(page.getByRole('link', {name: /^(Choisir un préleveur|Changer de préleveur|Choisissez votre établissement|Choisir un établissement|Changer d’établissement)$/})).toHaveCount(0)
  await expect(page.getByRole('button', {name: 'Se déconnecter', exact: true, includeHidden: true}).first()).toBeAttached()
  await expect(page.getByRole('navigation', {name: 'Menu principal'})).toHaveCount(0)
  await expect(page.getByText('Votre adresse e-mail est rattachée à plusieurs établissements. Choisissez celui pour lequel vous voulez déclarer ou consulter les données. Vous pourrez en changer à tout moment.')).toBeVisible()
  const continueButton = page.getByRole('button', {name: 'Continuer', exact: true})
  const firstRadio = page.getByRole('radio', {name: /^Ferme du Dropt/})
  const secondRadio = page.getByRole('radio', {name: /^Camille Martin/})
  await expect(continueButton).toBeEnabled()
  await expect(firstRadio).toHaveAccessibleName(/SIRET.*123\s?456\s?789\s?00012/)
  await expect(firstRadio).not.toHaveAccessibleName(/Alice|Dupont/)
  await expect(secondRadio).not.toHaveAccessibleName(/SIRET/)
  await continueButton.click()
  await expect(page.getByText('Veuillez choisir un établissement.', {exact: true})).toBeVisible()
  await expect(firstRadio).toBeFocused()
  await expect(firstRadio).toHaveAttribute('aria-invalid', 'true')
  // DSFR appends an invisible punctuation mark to announce updated messages.
  await expect(firstRadio).toHaveAccessibleDescription(/^Veuillez choisir un établissement\.(?:\s+\.)?$/)
  await expect(secondRadio).toHaveAccessibleDescription(/^Veuillez choisir un établissement\.(?:\s+\.)?$/)
  await expect(continueButton).toBeEnabled()
  expect((await requests(context, initial.user.token)).filter(item => item.pathname === '/auth/preleveurs/select')).toEqual([])
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true)
  await page.screenshot({path: testInfo.outputPath('choix-preleveur.png'), fullPage: true})
  expect((await requests(context, initial.user.token)).filter(item => !item.pathname.startsWith('/auth/'))).toEqual([])
  await chooseProfile(page, /^Ferme du Dropt/)
  await expect(page.getByText('Veuillez choisir un établissement.', {exact: true})).toHaveCount(0)
  await expect(firstRadio).not.toHaveAttribute('aria-invalid', 'true')
  // Hold only this browser's Server Action to check the pending state reliably.
  let releaseSubmit
  let signalSubmit
  const submitHeld = new Promise(resolve => { releaseSubmit = resolve })
  const submitStarted = new Promise(resolve => { signalSubmit = resolve })
  await page.route('**/choisir-preleveur', async route => {
    signalSubmit()
    await submitHeld
    await route.continue()
  }, {times: 1})
  await continueButton.click()
  await submitStarted
  try {
    await expect(page.getByRole('button', {name: 'Ouverture en cours…', exact: true})).toBeDisabled()
    await expect(firstRadio).toBeDisabled()
    await expect(secondRadio).toBeDisabled()
  } finally {
    releaseSubmit()
  }
  await expect(page).toHaveURL(`${frontUrl}/tableau-de-bord`)
  const first = await session(page)
  expect(first.user.id).toBe(firstProfile)
  expect(first.user.siret).toBe(firstSiret)
  expect(first.user.token).not.toBe(initial.user.token)
  expect(first.user.preleveurProfiles.selectionRequired).toBe(false)
  const revoked = await context.request.get(`${apiUrl}/info`, {headers: {Authorization: `Bearer ${initial.user.token}`}})
  expect(revoked.status()).toBe(401)

  const menuButton = page.getByRole('button', {name: 'Menu', exact: true})
  if (await menuButton.isVisible()) await menuButton.click()
  const header = page.getByRole('banner')
  await expect(header.getByText(/Ferme du Dropt/).filter({visible: true})).toBeVisible()
  await expect(header.getByText(/SIRET.*123\s?456\s?789\s?00012/).filter({visible: true})).toBeVisible()
  await expect(header.getByText(/Alice Dupont/)).toHaveCount(0)
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true)
  await page.screenshot({path: testInfo.outputPath('etablissement-selectionne.png'), fullPage: true})
  await page.getByRole('link', {name: 'Changer d’établissement', exact: true}).filter({visible: true}).click()
  await expect(page.getByRole('radio', {name: /^Ferme du Dropt/})).toBeChecked()
  await expect(page.getByText('Établissement actuel', {exact: false})).toBeVisible()
  await expect(page.getByRole('link', {name: 'Changer d’établissement', exact: true})).toHaveCount(0)
  await chooseProfile(page, /^Camille Martin/)
  await page.getByRole('button', {name: 'Continuer', exact: true}).click()
  await expect(page).toHaveURL(`${frontUrl}/tableau-de-bord`)
  const second = await session(page)
  expect(second.user.id).toBe(secondProfile)
  const secondMenuButton = page.getByRole('button', {name: 'Menu', exact: true})
  if (await secondMenuButton.isVisible()) await secondMenuButton.click()
  await expect(page.getByRole('banner').getByText(/Camille Martin/).filter({visible: true})).toBeVisible()
  await expect(page.getByRole('banner').getByText(/SIRET/)).toHaveCount(0)
  if (await secondMenuButton.isVisible()) {
    await page.keyboard.press('Escape')
  }
  expect(second.user.token).not.toBe(first.user.token)
  const cookie = (await context.cookies(frontUrl)).find(item => item.name === '__Secure-next-auth.session-token')
  expect(cookie.value.length).toBeLessThan(2000)
  const jwt = await decode({token: cookie.value, secret})
  expect(jwt.preleveurProfiles).toEqual({enabled: true, selectionRequired: false, canManageAccount: false, canSwitch: true})
  expect(JSON.stringify(jwt)).not.toContain('Ferme du Dropt')
  expect(JSON.stringify(jwt)).not.toContain('Eymet')
  const calls = await requests(context, second.user.token)
  expect(calls.filter(item => item.pathname === '/auth/preleveurs/select').map(item => item.body)).toEqual([
    {preleveurId: firstProfile}, {preleveurId: secondProfile}
  ])
  expect(calls.filter(item => item.pathname === '/dashboard/territory').map(item => item.currentPreleveurId)).toContain(secondProfile)
  for (const path of ['/mon-compte', '/mon-compte/modifier', '/mon-compte/securite', '/mon-compte/adresses-email']) {
    await page.goto(`${frontUrl}${path}`)
    await expect(page.getByRole('heading', {name: 'La gestion du compte n’est pas disponible pour cet établissement'})).toBeVisible()
    await expect(page.locator('main form')).toHaveCount(0)
  }
})

test('un seul préleveur ouvre directement le tableau de bord sans action de changement', async ({page}) => {
  const current = await login(page, 'single')
  expect(current.user.preleveurProfiles).toMatchObject({enabled: true, selectionRequired: false, canSwitch: false, canManageAccount: true})
  await expect(page.getByRole('link', {name: 'Changer d’établissement', exact: true})).toHaveCount(0)
  await expect(page.getByRole('heading', {name: 'Choisissez votre établissement', exact: true})).toHaveCount(0)
})

test('le lien de connexion mène aussi au choix du préleveur', async ({page, context}) => {
  const response = await context.request.post(`${apiUrl}/auth/password`, {data: {
    email: `profiles-magic-${randomUUID()}@example.test`, password: 'synthetic-test-password'
  }})
  const {token} = await response.json()
  await page.goto(`${frontUrl}/auth/callback?token=${encodeURIComponent(token)}`)
  await expect(page.getByRole('heading', {name: 'Connexion réussie', exact: true})).toBeVisible()
  await expect(page.getByRole('banner').getByRole('link', {name: /choisir|changer/i})).toHaveCount(0)
  await expect(page.getByRole('banner').getByText(/Ferme du Dropt|SIRET/)).toHaveCount(0)
  await expect(page).toHaveURL(`${frontUrl}/choisir-preleveur`)
  await expect(page.getByRole('heading', {name: 'Choisissez votre établissement', exact: true})).toBeVisible()
  expect((await session(page)).user.preleveurProfiles.selectionRequired).toBe(true)
})

test('le choix est protégé et une autorisation retirée laisse un message sans changer de fiche', async ({page, context}) => {
  await page.goto(`${frontUrl}/choisir-preleveur`)
  await expect(page).toHaveURL(/\/login\?/)
  const initial = await login(page, 'refused')
  await chooseProfile(page, /^Camille Martin/)
  await page.getByRole('button', {name: 'Continuer', exact: true}).click()
  await expect(page.getByRole('heading', {name: 'Sélection impossible'})).toBeVisible()
  await expect(page).toHaveURL(`${frontUrl}/choisir-preleveur`)
  expect((await session(page)).user.token).toBe(initial.user.token)
  expect((await requests(context, initial.user.token)).filter(item => item.pathname.startsWith('/dashboard/'))).toEqual([])
  const menuButton = page.getByRole('button', {name: 'Menu', exact: true})
  if (await menuButton.isVisible()) await menuButton.click()
  await page.getByRole('button', {name: 'Se déconnecter', exact: true}).filter({visible: true}).click()
  await expect(page).toHaveURL(`${frontUrl}/login`)
  expect((await session(page)).user).toBeUndefined()
})

test('un cookie ancien sans indicateur est rattrapé par le refus métier de l’API', async ({page, context}) => {
  const initial = await login(page)
  const value = await encode({secret, token: {
    token: initial.user.token, role: 'DECLARANT', apiExpiresAt: initial.user.apiExpiresAt,
    userInfo: {id: firstProfile, socialReason: 'Ferme du Dropt', declarantRole: 'PRELEVEUR'}, infoRefreshedAt: Date.now()
  }})
  await context.addCookies([{name: '__Secure-next-auth.session-token', value, url: frontUrl, httpOnly: true, secure: true, sameSite: 'Lax'}])
  await page.goto(`${frontUrl}/tableau-de-bord`)
  await expect(page).toHaveURL(`${frontUrl}/choisir-preleveur`)
  await expect(page.getByRole('heading', {name: 'Choisissez votre établissement', exact: true})).toBeVisible()
})

test('une réponse sans nouveau jeton demande une reconnexion sans ouvrir de fiche', async ({page}) => {
  await login(page, 'no-token')
  await chooseProfile(page, /^Ferme du Dropt/)
  await page.getByRole('button', {name: 'Continuer', exact: true}).click()
  await expect(page.getByText('La nouvelle session n’a pas pu être récupérée. Veuillez vous reconnecter.')).toBeVisible()
  await expect(page.getByRole('link', {name: 'Se reconnecter', exact: true})).toHaveAttribute('href', '/login')
  await expect(page).toHaveURL(`${frontUrl}/choisir-preleveur`)
})
