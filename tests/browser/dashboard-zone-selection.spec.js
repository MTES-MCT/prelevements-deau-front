import {randomUUID} from 'node:crypto'

import {test, expect} from '@playwright/test'
import {encode} from 'next-auth/jwt'

const frontUrl = 'https://127.0.0.1:3443'
const fixtureUrl = 'http://127.0.0.1:3431'
test.use({ignoreHTTPSErrors: true, reducedMotion: 'reduce'})

test.beforeEach(async ({page}) => {
  await page.route('**/*', route => [frontUrl, 'http://127.0.0.1:3417'].includes(new URL(route.request().url()).origin)
    ? route.continue() : route.abort())
})

async function openDashboard(page, context, role) {
  const apiToken = `browser-test-dashboard-${role.toLowerCase()}-${randomUUID()}`
  const id = '11111111-1111-4111-8111-111111111111'
  const cookie = await encode({
    secret: 'browser-tests-only-never-a-real-secret',
    token: {
      sub: id, token: apiToken, role, permissions: ['zone.dashboard.read'],
      declarantRole: role === 'DECLARANT' ? 'PRELEVEUR' : null,
      apiExpiresAt: new Date(Date.now() + 3_600_000).toISOString(),
      infoRefreshedAt: Date.now(),
      userInfo: {id, firstName: 'Camille', email: 'dashboard@example.test', declarantRole: role === 'DECLARANT' ? 'PRELEVEUR' : null}
    },
    maxAge: 3600
  })
  await context.addCookies(['next-auth.session-token', '__Secure-next-auth.session-token'].map(name => ({
    name, value: cookie, url: frontUrl, httpOnly: true, secure: true, sameSite: 'Lax'
  })))
  const headers = {authorization: `Bearer ${apiToken}`}
  const requests = async () => {
    const response = await context.request.get(`${fixtureUrl}/api/__dashboard-requests`, {headers})
    expect(response.ok()).toBe(true)
    return response.json()
  }
  const control = async data => {
    const response = await context.request.post(`${fixtureUrl}/api/__dashboard-control`, {headers, data})
    expect(response.ok()).toBe(true)
  }
  await page.goto(`${frontUrl}/tableau-de-bord`)
  const trigger = page.getByRole('button', {name: role === 'DECLARANT' ? 'Zones' : 'Filtrer le contenu de la page par :', exact: true})
  await expect(trigger).toBeVisible()
  await expect(trigger).toContainText('Gironde')
  await expect(page).toHaveURL(/zones=DEP-33/)
  await expect.poll(async () => (await requests()).length).toBe(1)
  return {trigger, requests, control}
}

for (const role of ['ADMIN', 'DECLARANT']) {
  test(`${role} : cases, actions groupées et recherche restent locales jusqu’à Appliquer`, async ({page, context}, testInfo) => {
    const {trigger, requests} = await openDashboard(page, context, role)
    await trigger.click()
    await page.getByRole('option', {name: /Lot-et-Garonne/}).click()
    await page.getByRole('option', {name: /Dropt/}).click()
    await expect(trigger).toContainText('Gironde')
    await page.getByRole('button', {name: 'Tout désélectionner', exact: true}).click()
    await expect(page.getByRole('button', {name: 'Appliquer', exact: true})).toBeDisabled()
    await expect(page.getByText('Sélectionnez au moins une zone.', {exact: true})).toBeVisible()
    await page.getByRole('button', {name: 'Tout sélectionner', exact: true}).click()
    const search = page.getByRole('textbox', {name: /Rechercher dans/})
    await search.fill('gironde')
    await expect(page.getByRole('listbox').getByRole('option')).toHaveCount(1)
    await page.getByRole('button', {name: 'Désélectionner les résultats', exact: true}).click()
    await page.getByRole('button', {name: 'Sélectionner les résultats', exact: true}).click()
    await page.getByRole('button', {name: 'Désélectionner les résultats', exact: true}).click()
    await search.fill('')
    await expect(page.getByRole('option', {name: /Gironde/})).toHaveAttribute('aria-selected', 'false')
    await expect(page.getByRole('option', {name: /Lot-et-Garonne/})).toHaveAttribute('aria-selected', 'true')
    await expect(page.getByRole('option', {name: /Dropt/})).toHaveAttribute('aria-selected', 'true')
    expect((await requests()).length).toBe(1)
    await page.screenshot({path: testInfo.outputPath(`selection-zones-${role.toLowerCase()}.png`), fullPage: false})

    await page.getByRole('button', {name: 'Appliquer', exact: true}).click()
    await expect.poll(async () => (await requests()).length).toBe(2)
    await expect(trigger).toContainText('Lot-et-Garonne')
    const [initialRequest, appliedRequest] = await requests()
    expect(initialRequest.zones).toBeUndefined()
    expect(appliedRequest.zones).toBe('DEP-47,SAGE-DROPT')
    await expect(page).toHaveURL(/zones=DEP-47%2CSAGE-DROPT/)

    // Return to the same set in a different toggle order: no server refresh.
    await trigger.click()
    await page.getByRole('option', {name: /Lot-et-Garonne/}).click()
    await page.getByRole('option', {name: /Lot-et-Garonne/}).click()
    await expect(page.getByRole('button', {name: 'Appliquer', exact: true})).toBeDisabled()
    await page.getByRole('button', {name: 'Annuler', exact: true}).click()
    await expect(page.getByRole('listbox')).toBeHidden()
    expect((await requests()).length).toBe(2)
  })

  test(`${role} : annuler, Échap et clic extérieur abandonnent le brouillon sans actualisation`, async ({page, context}) => {
    const {trigger, requests} = await openDashboard(page, context, role)
    for (const close of ['cancel', 'escape', 'outside', 'trigger']) {
      await trigger.click()
      await expect(page.getByRole('option', {name: /Lot-et-Garonne/})).toHaveAttribute('aria-selected', 'false')
      await page.getByRole('option', {name: /Lot-et-Garonne/}).click()
      if (close === 'cancel') await page.getByRole('button', {name: 'Annuler', exact: true}).click()
      if (close === 'escape') await page.keyboard.press('Escape')
      if (close === 'outside') await page.getByRole('heading', {name: 'Bonjour Camille,', exact: true}).click()
      if (close === 'trigger') await trigger.click()
      await expect(page.getByRole('listbox')).toBeHidden()
      await expect(trigger).toContainText('Gironde')
      expect((await requests()).length).toBe(1)
    }
  })

  test(`${role} : le périmètre affiché reste stable pendant le chargement et après une erreur`, async ({page, context}) => {
    const {trigger, requests, control} = await openDashboard(page, context, role)
    const initialHash = new URL(page.url()).hash
    await control({holdNext: true})
    await trigger.click()
    await page.getByRole('option', {name: /Lot-et-Garonne/}).click()
    await page.getByRole('button', {name: 'Appliquer', exact: true}).click()
    await expect.poll(async () => (await requests()).length).toBe(2)
    await expect(page.getByRole('status').filter({hasText: 'Actualisation du tableau de bord...'})).toBeVisible()
    await expect(trigger).toHaveAttribute('aria-disabled', 'true')
    await expect(trigger).toContainText('Gironde')
    await expect(trigger).not.toContainText('Lot-et-Garonne')
    expect(new URL(page.url()).hash).toBe(initialHash)
    await control({releaseStatus: 503})
    await expect(page.getByText('Erreur synthétique de chargement du territoire', {exact: true})).toBeVisible()
    await expect(trigger).toHaveAttribute('aria-disabled', 'false')
    await expect(trigger).toContainText('Gironde')
    expect(new URL(page.url()).hash).toBe(initialHash)

    // Retry from the committed selection, not from the failed draft.
    await control({holdNext: true})
    await trigger.click()
    await expect(page.getByRole('option', {name: /Lot-et-Garonne/})).toHaveAttribute('aria-selected', 'false')
    await page.getByRole('option', {name: /Lot-et-Garonne/}).click()
    await page.getByRole('button', {name: 'Appliquer', exact: true}).click()
    await expect.poll(async () => (await requests()).length).toBe(3)
    await expect(trigger).toContainText('Gironde')
    await expect(trigger).not.toContainText('Lot-et-Garonne')
    await control({releaseStatus: 200})
    await expect(trigger).toHaveAttribute('aria-disabled', 'false')
    await expect(page).toHaveURL(/zones=DEP-33%2CDEP-47/)
    expect((await requests()).length).toBe(3)
  })
}
