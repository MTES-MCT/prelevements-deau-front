import {randomUUID} from 'node:crypto'

import {test, expect} from '@playwright/test'
import {encode} from 'next-auth/jwt'

const frontUrl = 'https://127.0.0.1:3443'
const apiUrl = 'http://127.0.0.1:3431'
const cookieName = '__Secure-next-auth.session-token'
const secret = 'browser-tests-only-never-a-real-secret'
const userId = 'dddddddd-1111-4111-8111-111111111111'
test.use({ignoreHTTPSErrors: true})

test.beforeEach(async ({page}) => {
  // No production API, tile service, analytics or mail can be contacted.
  await page.route('**/*', route => {
    const url = new URL(route.request().url())
    return [frontUrl, apiUrl, 'http://127.0.0.1:3417'].includes(url.origin)
      ? route.continue()
      : route.abort()
  })
})

async function configure(context, token, data) {
  const response = await context.request.put(`${apiUrl}/__login-session`, {
    headers: {Authorization: `Bearer ${token}`}, data
  })
  expect(response.ok()).toBe(true)
}

async function authenticate(context, {mode = 'valid', expired = false, refreshDue = false, selectionRequired = false} = {}) {
  const token = `browser-test-login-${randomUUID()}`
  const expiresAt = new Date(Date.now() + (expired ? -60_000 : 3_600_000)).toISOString()
  await configure(context, token, {mode, expiresAt, selectionRequired})
  const value = await encode({secret, maxAge: 3600, token: {
    sub: userId, token, role: 'INSTRUCTOR', permissions: [], apiExpiresAt: expiresAt,
    infoRefreshedAt: Date.now() - (refreshDue ? 6 * 60_000 : 0),
    // Keep the cookie's profile flags deliberately stale: /login must check the API.
    userInfo: {id: userId, email: 'login@example.test', firstName: 'Camille', lastName: 'Martin'}
  }})
  await context.addCookies([{name: cookieName, value, url: frontUrl, httpOnly: true, secure: true, sameSite: 'Lax'}])
  return token
}

async function currentSession(page) {
  return page.evaluate(async () => (await fetch('/auth/nextauth/session')).json())
}

async function requests(context, token) {
  const response = await context.request.get(`${apiUrl}/__login-session`, {headers: {Authorization: `Bearer ${token}`}})
  return (await response.json()).requests
}

test('une session déjà ouverte quitte /login pour son accueil', async ({page, context}) => {
  const token = await authenticate(context)
  await page.goto(`${frontUrl}/login`)
  await expect(page).toHaveURL(`${frontUrl}/mon-compte`)
  await expect(page.getByRole('heading', {name: 'Mon compte', exact: true})).toBeVisible()
  await expect(page.getByRole('button', {name: 'Recevoir un lien de connexion'})).toHaveCount(0)
  expect((await currentSession(page)).user.token).toBe(token)
  expect((await requests(context, token)).some(item => item.pathname === '/info')).toBe(true)
})

test('une session valide suit la destination interne, même avec un ancien message d’expiration', async ({page, context}) => {
  await authenticate(context)
  const callbackUrl = '/mon-compte?updated=profile'
  await page.goto(`${frontUrl}/login?error=session_expired&callbackUrl=${encodeURIComponent(callbackUrl)}`)
  await expect(page).toHaveURL(frontUrl + callbackUrl)
  await expect(page.getByText('Votre session a expiré. Veuillez vous reconnecter.', {exact: true})).toHaveCount(0)
})

test('les destinations de connexion ou externes ne provoquent aucune boucle', async ({page, context}) => {
  await authenticate(context)
  for (const callbackUrl of ['/login?callbackUrl=%2Flogin', '/auth/callback?token=unused', '/activation-mot-de-passe', '/validation-email', 'https://outside.example.test']) {
    await page.goto(`${frontUrl}/login?callbackUrl=${encodeURIComponent(callbackUrl)}`)
    await expect(page).toHaveURL(`${frontUrl}/mon-compte`)
  }
})

for (const mode of ['revoked', 'forbidden']) {
  test(`un cookie encore récent mais refusé par l’API (${mode}) revient au formulaire sans boucle`, async ({page, context}) => {
    await authenticate(context, {mode})
    await page.goto(`${frontUrl}/login?error=session_expired&callbackUrl=%2Fmon-compte`)
    await expect(page.getByRole('tab', {name: 'Mot de passe', exact: true})).toBeVisible()
    await expect(page).toHaveURL(/\/login\?/)
    await expect.poll(async () => (await context.cookies(frontUrl)).some(cookie => cookie.name === cookieName)).toBe(false)
    expect((await currentSession(page)).user).toBeUndefined()
  })
}

test('une session réellement expirée reste sur le formulaire de connexion', async ({page, context}) => {
  await authenticate(context, {expired: true})
  await page.goto(`${frontUrl}/login?callbackUrl=%2Fmon-compte`)
  await expect(page.getByRole('tab', {name: 'Mot de passe', exact: true})).toBeVisible()
  await expect(page).toHaveURL(/\/login\?/)
  expect((await currentSession(page)).user).toBeUndefined()
})

for (const mode of ['unavailable', 'network']) {
  test(`la vérification sur /login supporte ${mode}, conserve la session et permet de réessayer`, async ({page, context}) => {
    const token = await authenticate(context, {mode})
    await page.goto(`${frontUrl}/login?callbackUrl=%2Fmon-compte`)
    await expect(page.getByRole('heading', {name: 'Vérification de la connexion indisponible', exact: true})).toBeVisible()
    await expect(page).toHaveURL(/\/login\?/)
    await expect(page.getByRole('tab', {name: 'Mot de passe', exact: true})).toHaveCount(0)
    expect((await currentSession(page)).user.token).toBe(token)
    expect((await context.cookies(frontUrl)).some(cookie => cookie.name === cookieName)).toBe(true)
    await configure(context, token, {mode: 'valid'})
    await page.getByRole('button', {name: 'Réessayer', exact: true}).click()
    await expect(page).toHaveURL(`${frontUrl}/mon-compte`)
    expect((await currentSession(page)).user.token).toBe(token)
    expect((await requests(context, token)).filter(item => item.pathname === '/auth/logout')).toEqual([])
  })

  test(`un rafraîchissement de session en échec ${mode} ne déconnecte pas une page privée`, async ({page, context}) => {
    const token = await authenticate(context, {mode, refreshDue: true})
    await page.goto(`${frontUrl}/mon-compte`)
    await expect(page.getByRole('heading', {name: 'Compte indisponible', exact: true})).toBeVisible()
    await expect(page).toHaveURL(`${frontUrl}/mon-compte`)
    expect((await currentSession(page)).user.token).toBe(token)
    expect((await context.cookies(frontUrl)).some(cookie => cookie.name === cookieName)).toBe(true)
    await configure(context, token, {mode: 'valid'})
    await page.reload()
    await expect(page.getByRole('heading', {name: 'Mon compte', exact: true})).toBeVisible()
    expect((await currentSession(page)).user.token).toBe(token)
  })
}

test('la vérification fraîche sur /login impose le choix de l’établissement', async ({page, context}) => {
  await authenticate(context, {selectionRequired: true})
  await page.goto(`${frontUrl}/login?callbackUrl=%2Fmon-compte`)
  await expect(page).toHaveURL(`${frontUrl}/choisir-preleveur`)
  await expect(page.getByRole('heading', {name: 'Choisissez votre établissement', exact: true})).toBeVisible()
  await expect(page.getByRole('radio', {name: /Établissement de test/})).toBeVisible()
})
