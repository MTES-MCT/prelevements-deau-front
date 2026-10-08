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
  const admin = scenario.startsWith('admin')
  const agent = admin || scenario === 'readonly'
  const token = await encode({secret: 'browser-tests-only-never-a-real-secret', maxAge: 3600,
    token: {sub: agent ? ids.preleveur : ids.collector, token: apiToken,
      role: admin ? 'ADMIN' : scenario === 'readonly' ? 'INSTRUCTOR' : 'DECLARANT', declarantRole: 'COLLECTEUR', permissions: [],
      apiExpiresAt: new Date(Date.now() + 3600000).toISOString(), infoRefreshedAt: Date.now(),
      userInfo: {id: agent ? ids.preleveur : ids.collector, email: agent ? 'agent@example.test' : 'collector@example.test'}}})
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

async function setTheme(page, theme) {
  const settings = page.getByRole('button', {name: "Paramètres d'affichage", exact: true})
  await expect(settings).toHaveAttribute('data-fr-js-modal-button', 'true')
  await settings.click()
  const modal = page.locator('#fr-theme-modal')
  const label = theme === 'dark' ? 'Thème sombre' : 'Thème clair'
  await expect(modal).toBeVisible()
  await modal.getByText(label, {exact: true}).click()
  await expect(modal.getByRole('radio', {name: label, exact: true})).toBeChecked()
  await modal.getByRole('button', {name: 'Fermer', exact: true}).click()
  await expect(modal).not.toBeVisible()
  await expect(page.locator('html')).toHaveAttribute('data-fr-theme', theme)
}

async function assertNoHorizontalOverflow(page) {
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true)
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
  const enabled = page.getByLabel('Autoriser ce collecteur', {exact: true})
  await expect(enabled).not.toBeChecked()
  const zones = page.getByRole('button', {name: 'Zones où créer ou déplacer un point', exact: true})
  await expect(zones).toHaveCount(0)
  await enabled.check()
  await expect(zones).toBeVisible()
  await page.getByRole('button', {name: 'Enregistrer les droits', exact: true}).click()
  await expect(page.getByText('Autorisation enregistrée.', {exact: true})).toBeVisible()
  await enabled.uncheck()
  await expect(zones).toHaveCount(0)
  await page.getByRole('button', {name: 'Enregistrer les droits', exact: true}).click()
  await expect(page.getByText('Autorisation retirée. Les autres droits sont conservés.')).toBeVisible()
  await enabled.check()
  await expect(zones).toContainText('Territoire synthétique')
  expect((await writes(context, token)).map(item => item.body)).toEqual([
    {enabled: true, zoneIds: [ids.zone]}, {enabled: false, zoneIds: [ids.zone]}
  ])
})

test('gestion du déclarant : sections accessibles et formulaire conservé dans les deux thèmes', async ({page, context}, testInfo) => {
  const token = await authenticate(context, 'admin')
  await page.goto(`${frontUrl}/declarants/${ids.collector}/gestion`)
  await expect(page.getByRole('heading', {level: 1})).toHaveText('Gestion du déclarant')
  await expect(page.getByRole('link', {name: 'Retour à la fiche', exact: true})).toHaveAttribute('href', `/declarants/${ids.collector}`)
  const titles = ['Création et modification des points', 'Quels agents peuvent consulter ce déclarant ?', 'Types de déclaration autorisés',
    'Connexion temporaire', 'Notification du compte', 'Supprimer le déclarant']
  for (const title of titles) {
    await expect(page.getByRole('heading', {level: 2, name: title, exact: true})).toBeVisible()
    await expect(page.getByRole('region', {name: title, exact: true})).toBeVisible()
  }
  await expect(page.getByRole('heading', {name: 'Déclaration annuelle des volumes prélevés', exact: true})).toBeVisible()
  const enabled = page.getByLabel('Autoriser ce collecteur', {exact: true})
  await enabled.check()
  const card = page.getByRole('region', {name: 'Création et modification des points', exact: true})
  const backgrounds = []
  for (const [index, theme] of ['light', 'dark', 'light'].entries()) {
    await setTheme(page, theme)
    await expect(enabled).toBeChecked()
    await expect(page.getByRole('button', {name: 'Enregistrer les droits', exact: true})).toBeEnabled()
    await assertNoHorizontalOverflow(page)
    const background = await card.evaluate(element => getComputedStyle(element).backgroundColor)
    expect(background).not.toBe('rgba(0, 0, 0, 0)')
    backgrounds.push(background)
    await page.screenshot({path: testInfo.outputPath(`declarant-management-${index}-${theme}.png`), fullPage: true, animations: 'disabled'})
  }
  expect(backgrounds[1]).not.toBe(backgrounds[0])
  expect(backgrounds[2]).toBe(backgrounds[0])
  expect(await writes(context, token)).toEqual([])
})

test('gestion du déclarant : annuler invitation et suppression ne déclenche aucune écriture', async ({page, context}) => {
  const token = await authenticate(context, 'admin')
  await page.goto(`${frontUrl}/declarants/${ids.collector}/gestion`)
  const notification = page.getByRole('region', {name: 'Notification du compte', exact: true})
  const invite = notification.getByRole('button', {name: 'Envoyer le mail de compte', exact: true})
  await invite.click()
  await expect(notification.getByText(/Confirmer l’envoi du mail de création de compte/)).toBeVisible()
  await assertNoHorizontalOverflow(page)
  expect(await writes(context, token)).toEqual([])
  await notification.getByRole('button', {name: 'Annuler', exact: true}).click()
  await expect(invite).toBeVisible()

  const deletion = page.getByRole('region', {name: 'Supprimer le déclarant', exact: true})
  const remove = deletion.getByRole('button', {name: 'Supprimer', exact: true})
  await remove.click()
  const dialog = page.getByRole('dialog')
  await expect(dialog).toBeVisible()
  await expect(dialog.getByText(/Cette action est irréversible/)).toBeVisible()
  await assertNoHorizontalOverflow(page)
  expect(await writes(context, token)).toEqual([])
  await dialog.getByRole('button', {name: 'Annuler', exact: true}).click()
  await expect(dialog).not.toBeVisible()
  await expect(remove).toBeFocused()
  await remove.click()
  await expect(dialog).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(dialog).not.toBeVisible()
  await expect(remove).toBeFocused()
  expect(await writes(context, token)).toEqual([])
})

test('gestion du déclarant : un agent en lecture seule ne voit aucune action de gestion', async ({page, context}) => {
  const token = await authenticate(context, 'readonly')
  await page.goto(`${frontUrl}/declarants/${ids.collector}/gestion`)
  await expect(page.getByRole('heading', {level: 1, name: 'Gestion du déclarant', exact: true})).toBeVisible()
  await expect(page.getByRole('heading', {level: 2})).toHaveText(['Types de déclaration autorisés'])
  await expect(page.getByRole('heading', {name: 'Déclaration annuelle des volumes prélevés', exact: true})).toBeVisible()
  for (const name of ['Ajouter un type', 'Autoriser', 'Modifier', 'Retirer', 'Envoyer le mail de compte', 'Supprimer', 'Prendre la place de ce déclarant']) {
    await expect(page.getByRole('button', {name, exact: true})).toHaveCount(0)
  }
  await assertNoHorizontalOverflow(page)
  expect(await writes(context, token)).toEqual([])
})

test('types autorisés : liste simple et ajout sans limite de dates', async ({page, context}) => {
  const token = await authenticate(context, 'admin')
  await page.goto(`${frontUrl}/declarants/${ids.collector}/gestion`)
  const card = page.getByRole('region', {name: 'Types de déclaration autorisés', exact: true})
  await expect(card.getByText('À partir du 01/01/2026', {exact: true})).toBeVisible()
  await expect(card.getByText(/VOLUMES_ANNUELS|Version|Non bornée/)).toHaveCount(0)
  await expect(card.getByLabel('Type de déclaration', {exact: true})).toHaveCount(0)
  const add = card.getByRole('button', {name: 'Ajouter un type', exact: true})
  await add.click()
  const select = card.getByLabel('Type de déclaration', {exact: true})
  await expect(select).toBeFocused()
  await select.selectOption(ids.secondDeclarationType)
  await expect(select.locator('option:checked')).toHaveText('Relevés de compteurs')
  await expect(card.getByLabel('Date de début (facultative)', {exact: true})).not.toBeVisible()
  await expect(card.getByText('Sans limite de dates', {exact: true})).toBeVisible()
  await assertNoHorizontalOverflow(page)
  await card.getByRole('button', {name: 'Ajouter', exact: true}).click()
  await expect(card.getByText('Autorisation ajoutée.', {exact: true})).toBeVisible()
  await expect(card.getByRole('heading', {name: 'Relevés de compteurs', exact: true})).toBeVisible()
  await expect(add).toBeFocused()
  expect(await writes(context, token)).toEqual([{
    path: `/api/declarants/${ids.collector}/declaration-types`, method: 'POST',
    body: {declarationTypeId: ids.secondDeclarationType, startDate: null, endDate: null}
  }])
})

test('types autorisés : annulation sans écriture et période conservée quand le volet est fermé', async ({page, context}) => {
  const token = await authenticate(context, 'admin')
  await page.goto(`${frontUrl}/declarants/${ids.collector}/gestion`)
  const card = page.getByRole('region', {name: 'Types de déclaration autorisés', exact: true})
  const add = card.getByRole('button', {name: 'Ajouter un type', exact: true})
  await add.click()
  await card.getByLabel('Type de déclaration', {exact: true}).selectOption(ids.secondDeclarationType)
  await card.getByRole('button', {name: 'Annuler', exact: true}).click()
  await expect(add).toBeFocused()
  expect(await writes(context, token)).toEqual([])
  const modify = card.getByRole('button', {name: 'Modifier', exact: true})
  await modify.click()
  const start = card.getByLabel('Date de début (facultative)', {exact: true})
  await expect(start).toBeVisible()
  await expect(start).toHaveValue('2026-01-01')
  await card.getByLabel('Type de déclaration', {exact: true}).press('Escape')
  await expect(modify).toBeFocused()
  expect(await writes(context, token)).toEqual([])
  await modify.click()
  await card.getByLabel('Date de fin (facultative)', {exact: true}).fill('2026-12-31')
  await card.getByRole('button', {name: 'Limiter à une période', exact: true}).click()
  await expect(start).not.toBeVisible()
  await expect(card.getByText('Du 01/01/2026 au 31/12/2026', {exact: true})).toBeVisible()
  await assertNoHorizontalOverflow(page)
  await card.getByRole('button', {name: 'Enregistrer', exact: true}).click()
  await expect(card.getByText('Autorisation mise à jour.', {exact: true})).toBeVisible()
  await expect(card.getByText('Du 01/01/2026 au 31/12/2026', {exact: true})).toBeVisible()
  expect(await writes(context, token)).toEqual([{
    path: `/api/declarants/${ids.collector}/declaration-types/${ids.declarationTypeLink}`, method: 'PUT',
    body: {declarationTypeId: ids.declarationType, startDate: '2026-01-01', endDate: '2026-12-31'}
  }])
})

test('types autorisés : erreur visible et saisie conservée', async ({page, context}) => {
  const token = await authenticate(context, 'admin-type-error')
  await page.goto(`${frontUrl}/declarants/${ids.collector}/gestion`)
  const card = page.getByRole('region', {name: 'Types de déclaration autorisés', exact: true})
  await card.getByRole('button', {name: 'Ajouter un type', exact: true}).click()
  await card.getByLabel('Type de déclaration', {exact: true}).selectOption(ids.declarationType)
  await card.getByRole('button', {name: 'Limiter à une période', exact: true}).click()
  await card.getByLabel('Date de début (facultative)', {exact: true}).fill('2026-06-01')
  await card.getByRole('button', {name: 'Limiter à une période', exact: true}).click()
  await card.getByRole('button', {name: 'Ajouter', exact: true}).click()
  await expect(card.getByRole('alert')).toContainText('Une autorisation existe déjà sur cette période.')
  await expect(card.getByLabel('Type de déclaration', {exact: true})).toHaveValue(ids.declarationType)
  await expect(card.getByText('À partir du 01/06/2026', {exact: true})).toBeVisible()
  await card.getByRole('button', {name: 'Limiter à une période', exact: true}).click()
  await expect(card.getByLabel('Date de début (facultative)', {exact: true})).toHaveValue('2026-06-01')
  expect(await writes(context, token)).toHaveLength(1)
})

test('types autorisés : le retrait exige toujours une confirmation', async ({page, context}) => {
  const token = await authenticate(context, 'admin')
  await page.goto(`${frontUrl}/declarants/${ids.collector}/gestion`)
  const card = page.getByRole('region', {name: 'Types de déclaration autorisés', exact: true})
  page.once('dialog', dialog => dialog.dismiss())
  await card.getByRole('button', {name: 'Retirer', exact: true}).click()
  expect(await writes(context, token)).toEqual([])
  page.once('dialog', dialog => dialog.accept())
  await card.getByRole('button', {name: 'Retirer', exact: true}).click()
  await expect(card.getByText('Autorisation retirée.', {exact: true})).toBeVisible()
  await expect(card.getByRole('heading', {name: 'Déclaration annuelle des volumes prélevés', exact: true})).toHaveCount(0)
  expect(await writes(context, token)).toEqual([{
    path: `/api/declarants/${ids.collector}/declaration-types/${ids.declarationTypeLink}`, method: 'DELETE', body: null
  }])
})
