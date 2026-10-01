import {randomUUID} from 'node:crypto'

import {expect, test} from '@playwright/test'
import {encode} from 'next-auth/jwt'

import {campaignIds} from '../../.github/scripts/campaign-fixtures.mjs'

const frontUrl = 'https://127.0.0.1:3443'
const campaignUrl = `${frontUrl}/campagnes/${campaignIds.campaign}`
const navigationSelector = 'nav[aria-label="Menu principal"] a[href="/campagnes"]'
test.use({ignoreHTTPSErrors: true, reducedMotion: 'reduce'})

test.beforeEach(async ({page}) => {
  await page.route('**/*', route => [frontUrl, 'http://127.0.0.1:3417'].includes(new URL(route.request().url()).origin) ? route.continue() : route.abort())
  await page.clock.setFixedTime(new Date('2026-11-01T12:00:00Z'))
})

async function authenticate(context, role = 'collector-fresh', {userId = campaignIds.user, impersonation = null} = {}) {
  const apiToken = `browser-test-campaign-${role}-${randomUUID()}`
  const token = await encode({secret: 'browser-tests-only-never-a-real-secret', token: {
    sub: userId, token: apiToken, role: role === 'admin' ? 'ADMIN' : 'DECLARANT', permissions: [], impersonation,
    apiExpiresAt: new Date(Date.now() + 3_600_000).toISOString(), infoRefreshedAt: Date.now(),
    userInfo: {id: userId, firstName: userId, email: 'navigation@example.test', declarantRole: role.startsWith('collector') ? 'COLLECTEUR' : 'PRELEVEUR'}
  }, maxAge: 3600})
  await context.addCookies(['next-auth.session-token', '__Secure-next-auth.session-token'].map(name => ({name, value: token, url: frontUrl, httpOnly: true, secure: true, sameSite: 'Lax'})))
  return async () => (await context.request.get('http://127.0.0.1:3431/api/__campaign-summary-reads', {headers: {authorization: `Bearer ${apiToken}`}})).json()
}

test('le lien Campagnes reste présent entre les pages sans recharger son résumé', async ({page, context, isMobile}) => {
  const summaryReads = await authenticate(context)
  await page.goto(campaignUrl)
  await expect(page.locator(navigationSelector)).toHaveCount(1)
  await expect.poll(summaryReads).toBe(1)
  await page.evaluate(selector => {
    window.campaignNavigationDisappearances = 0
    new MutationObserver(() => {
      if (!document.querySelector(selector)) window.campaignNavigationDisappearances++
    }).observe(document.querySelector('header'), {subtree: true, childList: true})
  }, navigationSelector)

  await page.getByRole('link', {name: 'Consulter', exact: true}).click()
  await expect(page.getByRole('link', {name: 'Retour à la campagne', exact: true})).toBeVisible()
  await page.getByRole('link', {name: 'Retour à la campagne', exact: true}).click()
  await expect(page.getByRole('link', {name: 'Consulter', exact: true})).toBeVisible()
  if (isMobile) await page.getByRole('button', {name: 'Menu', exact: true}).click()
  await page.locator(navigationSelector).click()
  await expect(page).toHaveURL(`${frontUrl}/campagnes`)
  await expect(page.getByRole('heading', {name: 'Campagnes', exact: true})).toBeVisible()

  expect(await page.evaluate(() => window.campaignNavigationDisappearances)).toBe(0)
  expect(await summaryReads()).toBe(1)
})

test('le résultat de navigation est invalidé au changement d’identité et à la prise de place', async ({page, context}) => {
  await authenticate(context)
  await page.goto(campaignUrl)
  await expect(page.locator(navigationSelector)).toHaveCount(1)

  const noCampaignReads = await authenticate(context, 'collector-no-campaigns', {userId: 'other-collector'})
  await page.evaluate(() => document.dispatchEvent(new Event('visibilitychange')))
  await expect.poll(noCampaignReads).toBe(1)
  await expect(page.locator(navigationSelector)).toHaveCount(0)

  // The same target user can be consulted by an administrator. Its old result
  // must not be reused across that session transition.
  const impersonationReads = await authenticate(context, 'collector-fresh', {
    userId: 'other-collector', impersonation: {active: true, actor: {id: 'admin-1', role: 'ADMIN'}}
  })
  await page.evaluate(() => document.dispatchEvent(new Event('visibilitychange')))
  await expect.poll(impersonationReads).toBe(1)
  await expect(page.locator(navigationSelector)).toHaveCount(1)
})

test('une revalidation en erreur conserve le lien de la même identité et peut être retentée au focus', async ({page, context}) => {
  await authenticate(context)
  await page.goto(campaignUrl)
  await expect(page.locator(navigationSelector)).toHaveCount(1)

  const failedReads = await authenticate(context, 'collector-summary-error')
  const failedRevalidation = page.waitForResponse(response => Boolean(response.request().headers()['next-action']))
  await page.evaluate(() => document.dispatchEvent(new Event('visibilitychange')))
  await failedRevalidation
  await expect.poll(failedReads).toBe(1)
  await expect(page.locator(navigationSelector)).toHaveCount(1)

  const retryReads = await authenticate(context, 'collector-no-campaigns')
  await page.evaluate(() => document.dispatchEvent(new Event('visibilitychange')))
  await expect.poll(retryReads).toBe(1)
  await expect(page.locator(navigationSelector)).toHaveCount(0)
})

test('un ancien résumé en vol ne restaure pas le lien après un changement de compte', async ({page, context}) => {
  await authenticate(context)
  let unblockSummary
  let summaryStarted
  let delayedRequest
  const summaryGate = new Promise(resolve => { unblockSummary = resolve })
  const summaryRequest = new Promise(resolve => { summaryStarted = resolve })
  await page.route('**/*', async route => {
    if (!delayedRequest && route.request().headers()['next-action']) {
      delayedRequest = route.request()
      summaryStarted()
      await summaryGate
    }
    await route.fallback()
  })
  const delayedResponse = page.waitForResponse(response => response.request() === delayedRequest)
  await page.goto(campaignUrl)
  await summaryRequest

  const currentReads = await authenticate(context, 'collector-no-campaigns', {userId: 'current-collector'})
  await page.evaluate(() => document.dispatchEvent(new Event('visibilitychange')))
  await expect(page.getByRole('banner')).toContainText('current-collector')
  await expect(page.locator(navigationSelector)).toHaveCount(0)
  unblockSummary()
  await delayedResponse
  await expect.poll(currentReads).toBe(1)
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))))
  await expect(page.locator(navigationSelector)).toHaveCount(0)
})

for (const role of ['preleveur', 'admin', 'collector-no-campaigns']) {
  test(`${role} : ne présente pas de lien Campagnes non applicable`, async ({page, context}) => {
    const summaryReads = await authenticate(context, role)
    await page.goto(campaignUrl)
    await expect(page.locator('main h1')).toBeVisible()
    if (role === 'collector-no-campaigns') await expect.poll(summaryReads).toBe(1)
    await expect(page.locator(navigationSelector)).toHaveCount(0)
    expect(await summaryReads()).toBe(role === 'collector-no-campaigns' ? 1 : 0)
  })
}
