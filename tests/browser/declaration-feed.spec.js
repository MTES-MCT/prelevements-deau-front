import {test, expect} from '@playwright/test'
import {encode} from 'next-auth/jwt'
import {randomUUID} from 'node:crypto'

const frontUrl = 'https://127.0.0.1:3443'
const rows = page => page.locator('a[href^="/mes-declarations/sources/"]')
test.use({ignoreHTTPSErrors: true})

test.beforeEach(async ({page}) => {
  await page.route('**/*', route => [frontUrl, 'http://127.0.0.1:3417'].includes(new URL(route.request().url()).origin) ? route.continue() : route.abort())
})

async function authenticate(context, mode = 'collector') {
  const apiToken = `browser-test-declaration-feed-${mode}-${randomUUID()}`
  const token = await encode({
    secret: 'browser-tests-only-never-a-real-secret',
    token: {sub: 'synthetic-user', token: apiToken, role: 'DECLARANT', declarantRole: mode === 'preleveur' ? 'PRELEVEUR' : 'COLLECTEUR', permissions: [], apiExpiresAt: new Date(Date.now() + 3600000).toISOString(), infoRefreshedAt: Date.now(), userInfo: {id: 'synthetic-user', email: 'feed@example.test'}},
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
  await expect(page.getByText('25 éléments affichés', {exact: true})).toBeVisible()
  await expect(page.getByRole('button', {name: 'Nouvelle déclaration'})).toHaveCount(0)
  await expect(page.getByRole('link', {name: 'Nouvelle déclaration'})).toHaveCount(0)
  expect(await requests(request, token)).toEqual([{includeCounts: 'false', limit: '25'}])
  await page.getByRole('button', {name: 'Suivant', exact: true}).click()
  await expect(page.getByText('Page 2', {exact: true})).toBeVisible()
  await expect(rows(page)).toHaveCount(25)
  await expect(page.getByText('Point synthétique 25', {exact: true})).toBeVisible()
  await expect(page.getByText('Point synthétique 0', {exact: true})).toHaveCount(0)
  await expect(page.getByText('25 éléments affichés', {exact: true})).toBeFocused()
  await page.getByRole('button', {name: 'Précédent', exact: true}).click()
  await expect(page.getByText('Point synthétique 0', {exact: true})).toBeVisible()
  await expect(rows(page)).toHaveCount(25)
  expect((await requests(request, token)).map(query => query.cursor ?? null)).toEqual([null, 'offset-25', null])
  await page.getByLabel('Par page', {exact: true}).selectOption('100')
  await expect(rows(page)).toHaveCount(100)
  await expect(page.getByText('Page 1', {exact: true})).toBeVisible()
  expect((await requests(request, token)).at(-1).limit).toBe('100')
  await page.screenshot({path: testInfo.outputPath('pagination-bornee.png'), fullPage: false})
})

test('applique une recherche côté serveur en un appel et remet la navigation à la première page', async ({page, context, request}) => {
  const token = await authenticate(context)
  await page.goto(`${frontUrl}/mes-declarations`)
  await expect(rows(page)).toHaveCount(25)
  await page.getByRole('button', {name: 'Suivant', exact: true}).click()
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
  await expect(page.getByText('Page 1', {exact: true})).toBeVisible()
  await expect(page.getByRole('button', {name: 'Suivant', exact: true})).toBeDisabled()
  const queries = await requests(request, token)
  expect(queries).toHaveLength(3)
  expect(queries[2]).toMatchObject({includeCounts: 'false', includeMeta: 'false', kinds: 'SPREADSHEET,TELEMETRY,NONE', declarationCode: '239999', declarantName: 'Ferme & Cie', dateFrom: '2026-07-01', dateTo: '2026-07-31'})
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
  for (const name of ['Saisie rapide', 'Fichier déposé', 'Télérelève', 'Autres']) await page.getByRole('checkbox', {name, exact: true}).uncheck()
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
  await page.getByRole('button', {name: 'Suivant', exact: true}).click()
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
