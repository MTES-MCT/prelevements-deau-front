import {test, expect} from '@playwright/test'
import {encode} from 'next-auth/jwt'
import {randomUUID} from 'node:crypto'

const frontUrl = 'https://127.0.0.1:3443'
const navigation = page => page.getByRole('navigation', {name: 'Pagination des déclarations', exact: true}).first()
const rows = page => page.locator('a[href^="/mes-declarations/sources/"]')
test.use({ignoreHTTPSErrors: true})

test.beforeEach(async ({page}) => {
  await page.route('**/*', route => [frontUrl, 'http://127.0.0.1:3417'].includes(new URL(route.request().url()).origin) ? route.continue() : route.abort())
})

async function authenticate(context, mode = 'collector') {
  const apiToken = `browser-test-declaration-feed-${mode}-${randomUUID()}`
  const token = await encode({
    secret: 'browser-tests-only-never-a-real-secret',
    token: {sub: 'synthetic-user', token: apiToken, role: mode === 'admin' ? 'ADMIN' : 'DECLARANT', declarantRole: mode === 'preleveur' ? 'PRELEVEUR' : 'COLLECTEUR', permissions: [], apiExpiresAt: new Date(Date.now() + 3600000).toISOString(), infoRefreshedAt: Date.now(), userInfo: {id: 'synthetic-user', email: 'feed@example.test'}},
    maxAge: 3600
  })
  await context.addCookies(['next-auth.session-token', '__Secure-next-auth.session-token'].map(name => ({name, value: token, url: frontUrl, httpOnly: true, secure: true, sameSite: 'Lax'})))
  return apiToken
}

async function requests(request, token) {
  return (await request.get('http://127.0.0.1:3431/api/__declaration-feed-requests', {headers: {Authorization: `Bearer ${token}`}})).json()
}

test('ouvre 140 000 télérelèves sans compter et remplace les pages sans accumulation', async ({page, context, request}, testInfo) => {
  const token = await authenticate(context)
  await page.goto(`${frontUrl}/mes-declarations`)
  await expect(rows(page)).toHaveCount(25)
  await expect(page.getByText('1-25 déclarations', {exact: true})).toBeVisible()
  await expect(page.getByRole('button', {name: 'Nouvelle déclaration'})).toHaveCount(0)
  await expect(page.getByRole('link', {name: 'Nouvelle déclaration'})).toHaveCount(0)
  expect(await requests(request, token)).toEqual([{includeCounts: 'false', limit: '25'}])
  await navigation(page).getByRole('button', {name: 'Suivant', exact: true}).click()
  await expect(navigation(page).getByRole('button', {name: '2', exact: true})).toHaveAttribute('aria-current', 'page')
  await expect(rows(page)).toHaveCount(25)
  await expect(page.getByText('Point synthétique 25', {exact: true})).toBeVisible()
  await expect(page.getByText('Point synthétique 0', {exact: true})).toHaveCount(0)
  await expect(page.getByText('26-50 déclarations', {exact: true})).toBeFocused()
  await navigation(page).getByRole('button', {name: 'Précédent', exact: true}).click()
  await expect(page.getByText('Point synthétique 0', {exact: true})).toBeVisible()
  await expect(rows(page)).toHaveCount(25)
  expect((await requests(request, token)).map(query => query.cursor ?? null)).toEqual([null, 'offset-25', null])
  await navigation(page).getByRole('button', {name: '2', exact: true}).click()
  await expect(page.getByText('26-50 déclarations', {exact: true})).toBeVisible()
  await navigation(page).getByRole('button', {name: '3', exact: true}).click()
  await expect(page.getByText('51-75 déclarations', {exact: true})).toBeVisible()
  await navigation(page).getByRole('button', {name: '1', exact: true}).click()
  await expect(page.getByText('1-25 déclarations', {exact: true})).toBeVisible()
  await navigation(page).getByRole('button', {name: '4', exact: true}).click()
  await expect(page.getByText('76-100 déclarations', {exact: true})).toBeVisible()
  expect((await requests(request, token)).map(query => query.cursor ?? null)).toEqual([null, 'offset-25', null, 'offset-25', 'offset-50', null, 'offset-75'])
  await page.getByLabel('Par page', {exact: true}).selectOption('100')
  await expect(rows(page)).toHaveCount(100)
  await expect(navigation(page).getByRole('button', {name: '1', exact: true})).toHaveAttribute('aria-current', 'page')
  expect((await requests(request, token)).at(-1).limit).toBe('100')
  await expect(navigation(page).getByRole('button', {name: '3', exact: true})).toHaveCount(0)
  await expect(page.getByRole('checkbox', {name: 'Autres', exact: true})).toHaveCount(0)
  const paginations = page.getByRole('navigation', {name: 'Pagination des déclarations', exact: true})
  await expect(paginations).toHaveCount(2)
  const renderedButtons = await paginations.evaluateAll(navs => navs.map(nav => [...nav.querySelectorAll('button')].map(button => ({
    text: button.textContent, className: button.className, disabled: button.disabled, current: button.getAttribute('aria-current')
  }))))
  expect(renderedButtons[0]).toEqual(renderedButtons[1])
  await page.screenshot({path: testInfo.outputPath('pagination-haut.png'), fullPage: false})
  await paginations.last().scrollIntoViewIfNeeded()
  await page.screenshot({path: testInfo.outputPath('pagination-bas.png'), fullPage: false})
})

test('applique une recherche côté serveur en un appel et remet la navigation à la première page', async ({page, context, request}) => {
  const token = await authenticate(context)
  await page.goto(`${frontUrl}/mes-declarations`)
  await expect(rows(page)).toHaveCount(25)
  await navigation(page).getByRole('button', {name: 'Suivant', exact: true}).click()
  await expect(page.getByText('Point synthétique 25', {exact: true})).toBeVisible()
  await page.getByLabel('Numéro', {exact: true}).fill('239999')
  await page.getByLabel('Déclarant concerné', {exact: true}).fill('Ferme & Cie')
  await page.getByLabel('Du', {exact: true}).fill('2026-07-01')
  await page.getByLabel('Au', {exact: true}).fill('2026-07-31')
  await page.getByRole('checkbox', {name: 'Saisie rapide', exact: true}).uncheck()
  expect(await requests(request, token)).toHaveLength(2)
  await page.getByRole('button', {name: 'Rechercher', exact: true}).click()
  await expect(rows(page)).toHaveCount(1)
  await expect(page.getByText('Point synthétique 139999', {exact: true})).toBeVisible()
  await expect(navigation(page).getByRole('button', {name: '1', exact: true})).toHaveAttribute('aria-current', 'page')
  await expect(navigation(page).getByRole('button', {name: 'Suivant', exact: true})).toBeDisabled()
  const queries = await requests(request, token)
  expect(queries).toHaveLength(3)
  expect(queries[2]).toMatchObject({includeCounts: 'false', includeMeta: 'false', kinds: 'SPREADSHEET,TELEMETRY', declarationCode: '239999', declarantName: 'Ferme & Cie', dateFrom: '2026-07-01', dateTo: '2026-07-31'})
  expect(queries[2].cursor).toBeUndefined()
  await page.getByRole('button', {name: 'Rechercher', exact: true}).click()
  expect(await requests(request, token)).toHaveLength(3)
  await page.getByRole('button', {name: 'Réinitialiser', exact: true}).click()
  await expect(rows(page)).toHaveCount(25)
  await expect(page.getByText('Point synthétique 0', {exact: true})).toBeVisible()
  expect(await requests(request, token)).toHaveLength(4)
})

test('aucun type coché donne une page vide et conserve les filtres accessibles', async ({page, context, request}) => {
  const token = await authenticate(context)
  await page.goto(`${frontUrl}/mes-declarations`)
  await expect(rows(page)).toHaveCount(25)
  for (const name of ['Saisie rapide', 'Fichier déposé', 'Télérelève']) await page.getByRole('checkbox', {name, exact: true}).uncheck()
  await page.getByRole('button', {name: 'Rechercher', exact: true}).click()
  await expect(page.getByText('Aucune déclaration ne correspond à ces filtres.', {exact: true})).toBeVisible()
  await expect(rows(page)).toHaveCount(0)
  expect((await requests(request, token)).at(-1).kinds).toBe('')
  await page.getByRole('button', {name: 'Réinitialiser', exact: true}).click()
  await expect(rows(page)).toHaveCount(25)
})

test('une erreur masque les anciennes lignes et réessaie uniquement la page demandée', async ({page, context, request}) => {
  const token = await authenticate(context, 'retry')
  await page.goto(`${frontUrl}/mes-declarations`)
  await expect(rows(page)).toHaveCount(25)
  await navigation(page).getByRole('button', {name: 'Suivant', exact: true}).click()
  await expect(page.getByRole('heading', {name: 'Déclarations indisponibles', exact: true})).toBeVisible()
  await expect(rows(page)).toHaveCount(0)
  await page.getByRole('button', {name: 'Réessayer', exact: true}).click()
  await expect(rows(page)).toHaveCount(25)
  await expect(page.getByText('Point synthétique 25', {exact: true})).toBeVisible()
  expect((await requests(request, token)).map(query => query.cursor ?? null)).toEqual([null, 'offset-25', 'offset-25'])
})

test('les droits de création restent disponibles sans comptes globaux', async ({page, context}) => {
  await authenticate(context, 'preleveur')
  await page.goto(`${frontUrl}/mes-declarations`)
  await expect(rows(page)).toHaveCount(25)
  await expect(page.getByRole('link', {name: 'Nouvelle déclaration', exact: true})).toBeVisible()
  await expect(page.getByLabel('Déclarant concerné', {exact: true})).toHaveCount(0)
})


test('décocher puis recocher les types visibles ne recharge pas une sélection identique', async ({page, context, request}) => {
  const token = await authenticate(context)
  await page.goto(`${frontUrl}/mes-declarations`)
  await expect(rows(page)).toHaveCount(25)
  await page.getByRole('checkbox', {name: 'Saisie rapide', exact: true}).uncheck()
  await page.getByRole('checkbox', {name: 'Saisie rapide', exact: true}).check()
  await page.getByRole('button', {name: 'Rechercher', exact: true}).click()
  expect(await requests(request, token)).toHaveLength(1)
})

test('Autres reste accessible lorsqu’une déclaration existe hors de la première page', async ({page, context, request}, testInfo) => {
  const token = await authenticate(context, 'with-other')
  await page.goto(`${frontUrl}/mes-declarations`)
  await expect(rows(page)).toHaveCount(25)
  await expect(page.getByRole('checkbox', {name: 'Autres', exact: true})).toBeChecked()
  for (const name of ['Saisie rapide', 'Fichier déposé', 'Télérelève']) await page.getByRole('checkbox', {name, exact: true}).uncheck()
  await page.getByRole('button', {name: 'Rechercher', exact: true}).click()
  await expect(page.getByText('N° AUTRE-139999', {exact: true})).toBeVisible()
  expect((await requests(request, token)).at(-1).kinds).toBe('NONE')
  await page.getByRole('form', {name: 'Filtres des déclarations', exact: true}).scrollIntoViewIfNeeded()
  await page.screenshot({path: testInfo.outputPath('filtre-autres-present.png'), fullPage: false})
})


test('la liste admin conserve ses totaux, ses liens numérotés et son sélecteur après partage du rendu', async ({page, context}, testInfo) => {
  await authenticate(context, 'admin')
  await page.goto(`${frontUrl}/declarations`)
  await expect(page.getByText('1-25 sur 80 déclarations', {exact: true})).toBeVisible()
  await expect(page.locator('a[href^="/declarations/"]')).toHaveCount(25)
  await navigation(page).getByRole('button', {name: '4', exact: true}).click()
  await expect(page.getByText('76-80 sur 80 déclarations', {exact: true})).toBeVisible()
  await expect(page.locator('a[href^="/declarations/"]')).toHaveCount(5)
  await expect(navigation(page).getByRole('button', {name: 'Suivant', exact: true})).toBeDisabled()
  await page.getByLabel('Par page', {exact: true}).selectOption('50')
  await expect(page.getByText('1-50 sur 80 déclarations', {exact: true})).toBeVisible()
  await expect(page.locator('a[href^="/declarations/"]')).toHaveCount(50)
  await navigation(page).scrollIntoViewIfNeeded()
  await page.screenshot({path: testInfo.outputPath('pagination-admin-haut.png'), fullPage: false})
  await page.getByRole('navigation', {name: 'Pagination des déclarations', exact: true}).last().scrollIntoViewIfNeeded()
  await page.screenshot({path: testInfo.outputPath('pagination-admin-bas.png'), fullPage: false})
})
