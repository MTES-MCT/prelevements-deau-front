import {test, expect} from '@playwright/test'
import {encode} from 'next-auth/jwt'

const frontUrl = 'https://127.0.0.1:3443'
const exploitationId = '11111111-1111-4111-8111-111111111111'
const meterId = '22222222-2222-4222-8222-222222222222'
test.use({ignoreHTTPSErrors: true})

test.beforeEach(async ({page}) => {
  await page.route('**/*', route => [frontUrl, 'http://127.0.0.1:3417'].includes(new URL(route.request().url()).origin)
    ? route.continue() : route.abort())
})

async function authenticate(context, role) {
  const token = await encode({
    secret: 'browser-tests-only-never-a-real-secret',
    token: {
      sub: exploitationId, token: `browser-test-meter-${role.toLowerCase()}`, role, permissions: [],
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
}

test('le préleveur voit sa part sans index global ni navigation de campagne', async ({page, context}) => {
  await authenticate(context, 'DECLARANT')
  const response = await page.goto(`${frontUrl}/exploitations/${exploitationId}`)
  expect(response.status()).toBe(200)
  await expect(page.getByRole('heading', {name: 'Compteurs et synchronisation'})).toBeVisible()
  await expect(page.getByText('70 %', {exact: true})).toBeVisible()
  await expect(page.getByRole('button', {name: 'Voir les relevés du compteur'})).toHaveCount(0)
  await expect(page.getByRole('link', {name: 'Campagnes', exact: true})).toHaveCount(0)
  expect(await response.text()).not.toContain('12300')
  const forbidden = await context.request.get(`http://127.0.0.1:3431/api/exploitations/${exploitationId}/meters/${meterId}/readings`, {
    headers: {authorization: 'Bearer browser-test-meter-declarant'}
  })
  expect(forbidden.status()).toBe(403)
  await page.setViewportSize({width: 390, height: 844})
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true)
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
  const table = page.getByRole('table', {name: 'Relevés physiques du compteur'})
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
  await page.setViewportSize({width: 390, height: 844})
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true)
  await page.screenshot({path: testInfo.outputPath('compteurs-et-synchronisation.png'), fullPage: true})
})
