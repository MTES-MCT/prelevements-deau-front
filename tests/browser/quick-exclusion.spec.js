import {randomUUID} from 'node:crypto'
import {test, expect} from '@playwright/test'
import {encode} from 'next-auth/jwt'
import {quickExclusionIds as ids} from '../../.github/scripts/quick-exclusion-fixtures.mjs'

const frontUrl = 'https://127.0.0.1:3443'
const fieldLabel = 'Exclure de la saisie rapide'
test.use({ignoreHTTPSErrors: true})

test.beforeEach(async ({page}) => {
  await page.route('**/*', route => [frontUrl, 'http://127.0.0.1:3417'].includes(new URL(route.request().url()).origin) ? route.continue() : route.abort())
})

async function authenticate(context, scenario = 'admin') {
  const apiToken = `browser-test-quick-exclusion-${scenario}-${randomUUID()}`
  const role = scenario.includes('readonly') ? 'DECLARANT' : scenario.includes('instructor') ? 'INSTRUCTOR' : 'ADMIN'
  const token = await encode({secret: 'browser-tests-only-never-a-real-secret', token: {
    sub: ids.user, token: apiToken, role, permissions: role === 'DECLARANT' ? [] : ['exploitation.create', 'exploitation.update'],
    apiExpiresAt: new Date(Date.now() + 3_600_000).toISOString(), infoRefreshedAt: Date.now(),
    userInfo: {id: ids.user, email: 'quick-exclusion@example.test'}
  }, maxAge: 3600})
  await context.addCookies(['next-auth.session-token', '__Secure-next-auth.session-token'].map(name => ({name, value: token, url: frontUrl, httpOnly: true, secure: true, sameSite: 'Lax'})))
  return apiToken
}

async function getRequests(context, apiToken) {
  const response = await context.request.get('http://127.0.0.1:3431/api/__quick-exclusion-requests', {headers: {authorization: `Bearer ${apiToken}`}})
  expect(response.ok()).toBe(true)
  return response.json()
}

for (const scope of ['global', 'zone']) {
  const editPath = scope === 'global' ? `/exploitations/${ids.first}/edit` : `/zones/${ids.zone}/exploitations/${ids.first}/modifier`
  const createPath = scope === 'global' ? `/exploitations/new?idPoint=${ids.point}&idPreleveur=${ids.user}` : `/zones/${ids.zone}/exploitations/nouvelle?pointId=${ids.point}&declarantId=${ids.user}`
  const savedPath = scope === 'global' ? `/exploitations/${ids.first}` : `/zones/${ids.zone}/exploitations`

  for (const excluded of [false, true]) {
    test(`création ${scope} : inclusion par défaut et exclusion ${excluded} transmise`, async ({page, context}) => {
      const apiToken = await authenticate(context, scope === 'zone' ? 'instructor' : 'admin')
      await page.goto(frontUrl + createPath)
      const checkbox = page.getByRole('checkbox', {name: fieldLabel, exact: true})
      await expect(checkbox).not.toBeChecked()
      if (excluded) await page.getByText(fieldLabel, {exact: true}).click()
      await page.getByRole('combobox', {name: 'Usage principal *', exact: true}).selectOption(ids.usage)
      await page.getByRole('button', {name: scope === 'global' ? 'Valider la création de l’exploitation' : 'Créer l’exploitation', exact: true}).click()
      await expect(page).toHaveURL(frontUrl + savedPath)
      const requests = await getRequests(context, apiToken)
      expect(requests).toHaveLength(1)
      expect(requests[0]).toMatchObject({method: 'POST', body: {excludeFromQuickDeclaration: excluded}})
      await page.goto(frontUrl + editPath)
      await expect(checkbox).toBeChecked({checked: excluded})
    })
  }

  test(`édition ${scope} : réafficher la valeur puis inclure et exclure à nouveau`, async ({page, context}, testInfo) => {
    const apiToken = await authenticate(context, `${scope === 'zone' ? 'instructor' : 'admin'}-excluded`)
    await page.goto(frontUrl + editPath)
    const checkbox = page.getByRole('checkbox', {name: fieldLabel, exact: true})
    await expect(checkbox).toBeChecked()
    for (const excluded of [false, true]) {
      await checkbox.focus()
      await checkbox.press('Space')
      await expect(checkbox).toBeChecked({checked: excluded})
      await page.getByRole('button', {name: 'Enregistrer les modifications', exact: true}).click()
      await expect(page).toHaveURL(frontUrl + savedPath)
      expect((await getRequests(context, apiToken)).at(-1)).toMatchObject({method: 'PUT', body: {excludeFromQuickDeclaration: excluded}})
      await page.goto(frontUrl + editPath)
      await expect(checkbox).toBeChecked({checked: excluded})
    }
    await checkbox.scrollIntoViewIfNeeded()
    await page.screenshot({path: testInfo.outputPath(`exclusion-${scope}.png`), animations: 'disabled'})
  })

  test(`lecture seule ${scope} : création et édition inaccessibles`, async ({page, context}) => {
    const apiToken = await authenticate(context, 'readonly')
    for (const route of [createPath, editPath]) {
      await page.goto(frontUrl + route)
      await expect(page.getByRole('heading', {name: 'Accès interdit', exact: true})).toBeVisible()
      await expect(page.getByRole('checkbox', {name: fieldLabel, exact: true})).toHaveCount(0)
    }
    expect(await getRequests(context, apiToken)).toEqual([])
  })
}

test('la saisie rapide affiche seulement le comptage disponible sur un point partagé', async ({page, context}) => {
  await authenticate(context, 'readonly-excluded')
  await page.clock.setFixedTime(new Date('2026-09-22T12:00:00Z'))
  await page.goto(`${frontUrl}/mes-declarations/new`)
  await expect(page.getByRole('textbox', {name: 'Index (m³) — Point partagé synthétique — Code comptage : 002', exact: true})).toBeVisible()
  await expect(page.getByRole('textbox', {name: /Code comptage : 001/})).toHaveCount(0)
})

test('toutes les exploitations exclues : saisie rapide masquée et aucune soumission', async ({page, context}) => {
  const apiToken = await authenticate(context, 'readonly-all-excluded')
  await page.goto(`${frontUrl}/mes-declarations/new`)
  await expect(page.getByText('Aucun mode de déclaration disponible', {exact: true})).toBeVisible()
  await expect(page.getByRole('textbox', {name: /^Index \(m³\) —/})).toHaveCount(0)
  await expect(page.getByRole('button', {name: /^Soumettre/})).toHaveCount(0)
  expect(await getRequests(context, apiToken)).toEqual([])
})

test('formulaire devenu obsolète : refus API explicite et index ou volume conservé', async ({page, context}) => {
  const apiToken = await authenticate(context, 'readonly')
  await page.clock.setFixedTime(new Date('2026-09-22T12:00:00Z'))
  await page.goto(`${frontUrl}/mes-declarations/new`)
  const index = page.getByRole('textbox', {name: 'Index (m³) — Point partagé synthétique — Code comptage : 001', exact: true})
  await index.fill('120')
  const exclusion = await context.request.post('http://127.0.0.1:3431/api/__quick-exclusion-stale', {headers: {authorization: `Bearer ${apiToken}`}})
  expect(exclusion.ok()).toBe(true)
  await page.getByRole('button', {name: 'Soumettre 1 relevé', exact: true}).click()
  await expect(page.getByText('Cette exploitation est exclue de la saisie rapide.', {exact: true})).toBeVisible()
  await expect(index).toHaveValue('120')
  await page.getByRole('radio', {name: 'Volume', exact: true}).focus()
  await page.getByRole('radio', {name: 'Volume', exact: true}).press('Space')
  await page.getByRole('button', {name: /^Période déclarée/}).click()
  const calendar = page.getByRole('dialog', {name: 'Choisir une période'})
  await calendar.getByRole('button', {name: '1', exact: true}).first().click()
  await calendar.getByRole('button', {name: '21', exact: true}).click()
  await calendar.getByRole('button', {name: 'Valider', exact: true}).click()
  await page.getByRole('button', {name: 'Soumettre 1 volume', exact: true}).click()
  await expect(page.getByText('Cette exploitation est exclue de la saisie rapide.', {exact: true})).toBeVisible()
  const writes = await getRequests(context, apiToken)
  expect(writes.map(request => request.path)).toEqual(['/api/declarations/quick', '/api/declarations/quick/conflicts'])
  await expect(page.getByRole('textbox', {name: 'Volume (m³) — Point partagé synthétique — Code comptage : 001', exact: true})).toHaveValue('120')
})


test('collecteur : passer à un préleveur exclu pendant le chargement ferme l’attente', async ({page, context}) => {
  await authenticate(context, 'readonly-collector')
  await page.goto(`${frontUrl}/mes-declarations/new`)
  const declarant = page.getByRole('combobox', {name: 'Déclarant', exact: true})
  // Wait for the interactive form before exercising the in-flight transition.
  await expect(async () => {
    await declarant.selectOption(ids.user)
    await expect(page.getByText('Chargement des points', {exact: true})).toBeVisible({timeout: 250})
  }).toPass({timeout: 5000})
  await declarant.selectOption(ids.second)
  await expect(page.getByText('Saisie rapide indisponible pour ce préleveur', {exact: true})).toBeVisible()
  await expect(page.getByText('Chargement des points', {exact: true})).toHaveCount(0)
  await expect(page.getByRole('textbox', {name: /^Index \(m³\) —/})).toHaveCount(0)
})
