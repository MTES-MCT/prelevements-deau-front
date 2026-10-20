import {randomUUID} from 'node:crypto'
import {test, expect} from '@playwright/test'
import {encode} from 'next-auth/jwt'
import {declarationProcessingIds as ids} from '../../.github/scripts/declaration-processing-fixtures.mjs'

const frontUrl = 'https://127.0.0.1:3443'
const fixtureUrl = 'http://127.0.0.1:3431/api/__declaration-processing-state'
test.use({ignoreHTTPSErrors: true})
test.beforeEach(async ({page}) => {
  await page.route('**/*', route => [frontUrl, 'http://127.0.0.1:3417'].includes(new URL(route.request().url()).origin)
    ? route.continue() : route.abort())
  await page.clock.install()
})

async function authenticate(context, role) {
  const apiToken = `browser-test-declaration-processing-${role.toLowerCase()}-${randomUUID()}`
  const token = await encode({
    secret: 'browser-tests-only-never-a-real-secret', maxAge: 3600,
    token: {
      sub: ids.user, token: apiToken, role, declarantRole: 'PRELEVEUR', permissions: [],
      apiExpiresAt: new Date(Date.now() + 3600000).toISOString(), infoRefreshedAt: Date.now(),
      userInfo: {id: ids.user, email: 'declaration@example.test'}
    }
  })
  await context.addCookies(['next-auth.session-token', '__Secure-next-auth.session-token'].map(name => ({
    name, value: token, url: frontUrl, httpOnly: true, secure: true, sameSite: 'Lax'
  })))
  return apiToken
}

// These checks deliberately span several polling intervals: do not reuse a
// fixture-control socket that Node may close at its keep-alive boundary.
const stateOptions = token => ({headers: {authorization: `Bearer ${token}`, connection: 'close'}})
const readState = async (context, token) => (await context.request.get(fixtureUrl, stateOptions(token))).json()
const setState = (context, token, processingStatus, sourceStatus) => context.request.patch(fixtureUrl, {
  ...stateOptions(token), data: {processingStatus, sourceStatus}
})
const declarationPath = role => role === 'DECLARANT' ? `/mes-declarations/${ids.declaration}` : `/declarations/${ids.source}`
const isRefresh = (request, path) => new URL(request.url()).pathname === path
  && (request.headers().rsc === '1' || Boolean(request.headers()['next-action']))

async function expectPollingStopped(page, path) {
  const refreshed = page.waitForRequest(request => isRefresh(request, path), {timeout: 1000}).then(() => true, () => false)
  await page.clock.runFor(12_000)
  expect(await refreshed).toBe(false)
}

async function expectFailedWithoutOldData(page) {
  await expect(page.getByRole('heading', {name: 'Traitement en erreur', exact: true})).toBeVisible()
  await expect(page.getByText(/Le traitement automatique n’a pas abouti/)).toBeVisible()
  await expect(page.getByRole('link', {name: 'declaration-synthetique.xlsx', exact: true})).toBeVisible()
  await expect(page.getByLabel('Traitement en cours', {exact: true})).toHaveCount(0)
  await expect(page.getByText(/Ancien point à ne pas afficher/)).toHaveCount(0)
  await expect(page.getByText(/123[\s\u202f]456/)).toHaveCount(0)
  await expect(page.getByText(/Prisma|P2028|internal\/transaction|Internal SQL/)).toHaveCount(0)
}

for (const role of ['ADMIN', 'INSTRUCTOR', 'DECLARANT']) {
  test(`${role} : une source en attente ne masque pas l’échec et ne déclenche pas de polling`, async ({page, context}) => {
    const token = await authenticate(context, role)
    const path = declarationPath(role)
    await page.goto(frontUrl + path)
    await expectFailedWithoutOldData(page)
    const {reads} = await readState(context, token)
    await expectPollingStopped(page, path)
    expect((await readState(context, token)).reads).toEqual(reads)
  })

  test(`${role} : un rejeu masque les anciens résultats et arrête le polling après son échec`, async ({page, context}) => {
    const token = await authenticate(context, role)
    await setState(context, token, 'QUEUED', 'COMPLETED')
    const path = declarationPath(role)
    await page.goto(frontUrl + path)
    await expect(page.getByRole('heading', {name: 'Traitement planifié', exact: true})).toBeVisible()
    await expect(page.getByLabel('Traitement en cours', {exact: true})).toBeVisible()
    await expect(page.getByText(/Ancien point à ne pas afficher/)).toHaveCount(0)
    await expect(page.getByText(/123[\s\u202f]456/)).toHaveCount(0)
    expect((await readState(context, token)).reads.some(path => path.endsWith('/available-points-prelevements'))).toBe(false)
    await setState(context, token, 'FAILED', 'COMPLETED')
    await page.clock.runFor(3_100)
    await expectFailedWithoutOldData(page)
    const {reads} = await readState(context, token)
    await expectPollingStopped(page, path)
    expect((await readState(context, token)).reads).toEqual(reads)
  })
}
