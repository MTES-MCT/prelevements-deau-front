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

async function authenticate(context, role, scenario = '') {
  const apiToken = `browser-test-declaration-processing-${role.toLowerCase()}-${scenario}-${randomUUID()}`
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

async function expectIndexesAboveVolumes(figure) {
  const panels = figure.locator('[data-panel]')
  await expect(panels).toHaveCount(2)
  await expect(panels.first()).toHaveAttribute('data-panel', 'indexes')
  await expect(panels.last()).toHaveAttribute('data-panel', 'volumes')
  const indexArea = await panels.first().boundingBox()
  const volumeArea = await panels.last().boundingBox()
  expect(indexArea.y).toBeLessThan(volumeArea.y)
}

for (const role of ['DECLARANT', 'INSTRUCTOR']) {
  test(`saisie rapide ordinaire : ${role} voit le reçu entre les relevés précédent et suivant`, async ({page, context}) => {
    await authenticate(context, role, 'quick-intermediate')
    await page.goto(frontUrl + declarationPath(role))
    const figure = page.getByRole('article').filter({hasText: 'Forage des prés'}).getByRole('figure')
    const previous = figure.locator('[data-mark="index"][data-day="2026-06-12"]')
    const current = figure.locator('[data-mark="index"][data-day="2026-07-10"]')
    const next = figure.locator('[data-mark="index"][data-day="2026-08-08"]')
    await expect(next).toBeVisible()
    const [before, focus, after] = await Promise.all([previous, current, next].map(mark => mark.boundingBox()))
    expect(before.x).toBeLessThan(focus.x)
    expect(focus.x).toBeLessThan(after.x)
    const bracket = figure.locator('[data-scope-range]')
    await expect(bracket).toHaveAttribute('data-start', String(Date.parse('2026-06-12')))
    await expect(bracket).toHaveAttribute('data-end', String(Date.parse('2026-07-10')))
    await figure.locator('summary').click()
    const receipt = figure.getByRole('rowgroup', {name: 'Cette déclaration', exact: true})
    const following = figure.getByRole('rowgroup', {name: 'Déclarations suivantes', exact: true})
    await expect(receipt.getByRole('cell', {name: '25 m³', exact: true})).toBeVisible()
    await expect(receipt).not.toContainText('42 m³')
    await expect(following.getByRole('cell', {name: '42 m³', exact: true})).toBeVisible()
    await expect(following.getByRole('cell', {name: /1\s567 m³/})).toBeVisible()
  })
}

for (const [role, scenario, expected] of [
  ['INSTRUCTOR', 'computed', '25 m³'],
  ['DECLARANT', 'zero', '0 m³']
]) {
  test(`saisie rapide ordinaire : ${role} consulte le volume de son point (${scenario})`, async ({page, context, hasTouch}) => {
    await authenticate(context, role, 'quick-' + scenario)
    await page.goto(frontUrl + declarationPath(role))
    const point = page.getByRole('article').filter({hasText: 'Forage des prés'})
    const figure = point.getByRole('figure')
    await expectIndexesAboveVolumes(figure)
    const indexes = figure.locator('[data-panel="indexes"]')
    const volumes = figure.locator('[data-panel="volumes"]')
    if (scenario === 'zero') {
      const period = volumes.locator('button[data-mark="volume"][data-value="0"]')
      await expect(period).toHaveAccessibleName(/0 m³/)
      await expect(period).toHaveAttribute('data-start', '2026-06-12')
      await expect(period).toHaveAttribute('data-end', '2026-07-10')
      await expect(indexes.locator('button[data-mark="index"][data-value="1525"]')).toHaveCount(2)
      await expect(volumes.locator('[data-mark="volume"]')).toHaveCount(1)
      await expect(figure.getByRole('combobox', {name: 'Pas de temps'})).toBeVisible()
      await period.press('Enter')
      await expect(period).toHaveAttribute('aria-pressed', 'true')
      await expect(figure.getByRole('tooltip')).toContainText('0 m³')
      await period.press('Escape')
      await expect(figure.getByRole('tooltip')).toHaveCount(0)

      await figure.getByRole('combobox', {name: 'Pas de temps'}).selectOption('year')
      const june = indexes.locator('button[data-mark="index"][data-day="2026-06-12"]')
      const july = indexes.locator('button[data-mark="index"][data-day="2026-07-10"]')
      const juneTarget = await june.boundingBox()
      const julyTarget = await july.boundingBox()
      expect(juneTarget.x + juneTarget.width).toBeLessThanOrEqual(julyTarget.x + 0.5)

      for (const [mark, day, label] of [[june, '2026-06-12', '12/06/2026'], [july, '2026-07-10', '10/07/2026']]) {
        if (hasTouch) await mark.tap()
        else await mark.click()
        const tooltip = indexes.getByRole('tooltip')
        await expect(tooltip).toContainText(label)
        await expect(tooltip).toContainText(/1\s525 m³/)
        await expect(mark).toHaveAttribute('aria-pressed', 'true')
        await mark.press('Escape')
        await expect(tooltip).toHaveCount(0)

        const reading = indexes.locator(`li[data-day="${day}"] > button`)
        await reading.press('Enter')
        await expect(tooltip).toContainText(label)
        await expect(tooltip).toContainText(/1\s525 m³/)
        await expect(reading).toHaveAttribute('aria-pressed', 'true')
        await reading.press('Escape')
        await expect(tooltip).toHaveCount(0)
      }
    } else {
      await expect(indexes.locator('circle[data-mark="index"]')).toHaveCount(3)
      await expect(volumes.locator('[data-mark="volume"]')).toHaveCount(2)
      const mark = volumes.locator('[data-mark="volume"][data-end="2026-07-10"]')
      await expect(mark).toHaveAttribute('data-start', '2026-06-12')
      await expect(mark).toHaveAttribute('data-value', '25')
      await expect(volumes.locator('[data-mark="volume"][data-start="2026-05-25"][data-end="2026-06-01"]')).toHaveAttribute('data-value', '10')
      const current = volumes.getByRole('button', {name: /Volume prélevé.*Cette déclaration/})
      await expect(current).toHaveAttribute('data-current', 'true')
      const historical = indexes.getByRole('button', {name: /Index du 01\/06\/2026 · 1\s450 m³/})
      await historical.focus()
      await expect(figure.getByRole('tooltip')).toBeVisible()
      await historical.press('Escape')
      await expect(figure.getByRole('tooltip')).toHaveCount(0)
      await historical.press('Enter')
      await expect(historical).toHaveAttribute('aria-pressed', 'true')
      await expect(figure.getByRole('tooltip')).toContainText(/1\s450 m³/)
      await expect(current).toHaveAttribute('aria-pressed', 'false')
      await expect(current).toHaveAttribute('data-current', 'true')
      await expect(figure.getByText('Cette déclaration', {exact: true}).first()).toBeVisible()
    }
    const details = figure.locator(':scope > details')
    await details.locator(':scope > summary').focus()
    await page.keyboard.press('Enter')
    await expect(details).toHaveAttribute('open', '')
    await expect(details.getByRole('cell', {name: expected, exact: true})).toBeVisible()
    await expect(details).toContainText('12/06/2026')
    await expect(details).toContainText('10/07/2026')
    await expect(page.getByText('Ces index proviennent d’une campagne.', {exact: false})).toHaveCount(0)
  })
}

for (const [role, scenario] of [['INSTRUCTOR', 'volume'], ['DECLARANT', 'first']]) {
  test(`saisie rapide ordinaire : ${role} lit chaque mesure avec sa date (${scenario})`, async ({page, context}) => {
    await authenticate(context, role, 'quick-' + scenario)
    await page.goto(frontUrl + declarationPath(role))
    const figure = page.getByRole('article').filter({hasText: 'Forage des prés'}).getByRole('figure')
    const rows = figure.locator('li[data-current]')
    const current = rows.filter({hasText: 'Cette déclaration'})
    const indexes = figure.locator('[data-panel="indexes"]')
    await expect(indexes.getByRole('heading', {name: 'Index du compteur'})).toBeVisible()
    await expect(current).toBeVisible()
    await expect(current).toHaveAttribute('data-current', 'true')
    await expect(figure.locator('svg[role="group"]')).toHaveCount(0)
    if (scenario === 'volume') {
      await expectIndexesAboveVolumes(figure)
      const prior = rows.filter({hasText: 'Historique'})
      await expect(rows).toHaveCount(2)
      await expect(prior).toHaveAttribute('data-current', 'false')
      await expect(indexes.getByRole('listitem')).toContainText('Historique')
      await expect(prior).toContainText(/1\s450 m³/)
      await expect(prior.locator('time[datetime="2026-06-01"]')).toBeVisible()
      await expect(current).toContainText(/volume.*saisi/i)
      await expect(current).toContainText('83 m³')
      await expect(current.locator('time[datetime="2026-06-12"]')).toBeVisible()
      await expect(current.locator('time[datetime="2026-07-10"]')).toBeVisible()
      const historicIndex = indexes.locator('button[data-mark="index"]')
      await expect(historicIndex).toHaveAttribute('data-current', 'false')
      await expect(historicIndex).toHaveAttribute('data-day', '2026-06-01')
      await historicIndex.press('Enter')
      await expect(figure.getByRole('tooltip')).toContainText(/1\s450 m³/)
      await expect(historicIndex).toHaveAttribute('aria-pressed', 'true')
      await historicIndex.press('Escape')
      await expect(figure.getByRole('tooltip')).toHaveCount(0)
    } else {
      await expect(rows).toHaveCount(1)
      await expect(indexes.getByRole('listitem')).toContainText('Cette déclaration')
      await expect(current).toContainText(/1\s525 m³/)
      await expect(current.locator('time[datetime="2026-07-10"]')).toBeVisible()
      await expect(figure).toContainText(/deux relevés/i)
      await expect(figure.locator('[data-mark="volume"]')).toHaveCount(0)
    }

    const scale = figure.getByRole('combobox', {name: 'Pas de temps'})
    const marker = figure.locator(scenario === 'volume'
      ? '[data-panel="volumes"] button[data-calendar-mark="period"][data-current="true"]'
      : '[data-panel="indexes"] button[data-calendar-mark="reading"][data-current="true"]')
    const before = await marker.boundingBox()
    await scale.selectOption('year')
    const after = await marker.boundingBox()
    if (scenario === 'volume') {
      expect(after.width).toBeLessThan(before.width)
    } else {
      expect(Math.abs(after.x - before.x)).toBeGreaterThan(1)
    }
    await expect(marker).toHaveAttribute('data-current', 'true')
    await expect(current).toContainText(scenario === 'volume' ? '83 m³' : /1\s525 m³/)

    const details = figure.locator('details')
    const toggle = details.locator('summary')
    await toggle.press('Enter')
    await expect(details).toHaveAttribute('open', '')
    await expect(details.getByRole('cell', {name: scenario === 'volume' ? '83 m³' : /1\s525 m³/})).toBeVisible()
    await toggle.press('Space')
    await expect(details).not.toHaveAttribute('open', '')
  })
}
