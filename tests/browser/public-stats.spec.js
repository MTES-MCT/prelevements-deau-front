import {test, expect} from '@playwright/test'
import {encode} from 'next-auth/jwt'

test.use({reducedMotion: 'reduce', ignoreHTTPSErrors: true})

const territoriesName = 'Nombre de déclarations mensuelles par territoire'
const activityName = 'Nombre d’utilisateurs actifs / mois'

async function useExistingSession(context, {secure = false} = {}) {
  const id = '11111111-1111-4111-8111-111111111111'
  const cookie = await encode({
    secret: 'browser-tests-only-never-a-real-secret',
    token: {
      sub: id,
      token: 'browser-test-api-token',
      role: 'INSTRUCTOR',
      permissions: [],
      apiExpiresAt: new Date(Date.now() + 3_600_000).toISOString(),
      infoRefreshedAt: Date.now(),
      userInfo: {id, email: 'test@example.test'}
    },
    maxAge: 3600
  })
  if (secure) {
    // The existing fixture's NEXTAUTH_URL is HTTP (middleware cookie name),
    // while server sessions enforce the production __Secure- name. Both cookies
    // travel only over this test proxy's HTTPS connection.
    await context.addCookies(['next-auth.session-token', '__Secure-next-auth.session-token'].map(name => ({
      name, value: cookie,
      url: 'https://127.0.0.1:3443', secure: true, httpOnly: true, sameSite: 'Lax'
    })))
    return
  }

  // Direct HTTP fixture requests cannot store Secure cookies. Browser session
  // scenarios below use the HTTPS fixture and the real secure cookie instead.
  await context.setExtraHTTPHeaders({cookie: `next-auth.session-token=${cookie}; __Secure-next-auth.session-token=${cookie}`})
}

test.beforeEach(async ({page}) => {
  await page.route('**/*', route => {
    const url = new URL(route.request().url())
    return ['http://127.0.0.1:3417', 'https://127.0.0.1:3443'].includes(url.origin) ? route.continue() : route.abort()
  })
})

test('le mois ne change que les déclarations territoriales, pas les canaux ni le graphique', async ({page}, testInfo) => {
  const errors = []
  page.on('pageerror', error => errors.push(error.message))
  await page.goto('/stats')
  const territories = page.getByRole('region', {name: territoriesName})
  const activity = page.getByRole('region', {name: activityName})
  const channels = page.getByRole('region', {name: 'Comment la donnée arrive'})
  await expect(page.getByRole('combobox')).toHaveCount(1)
  await expect(territories.getByRole('combobox', {name: 'Mois', exact: true})).toHaveValue('2026-08')
  await expect(territories.getByRole('article')).toContainText(/7\s*déclarations mensuelles/)
  const graphBefore = await activity.getByRole('img').getAttribute('aria-label')
  const channelsBefore = await channels.innerText()
  await territories.getByRole('combobox').selectOption('2026-07')
  await territories.getByRole('button', {name: 'Afficher', exact: true}).click()
  await expect(page).toHaveURL(/\/stats\?month=2026-07$/)
  await expect(territories.getByRole('article')).toContainText(/3\s*déclarations mensuelles/)
  await expect(activity.getByRole('img')).toHaveAttribute('aria-label', graphBefore)
  await expect(channels).toHaveText(channelsBefore, {useInnerText: true})
  await expect(territories).not.toContainText('30 %')
  await expect(page.getByText('Voir les chiffres détaillés')).toHaveCount(0)
  await expect(page.getByText('Mois observé', {exact: true})).toHaveCount(0)
  await expect(activity).toContainText('Nombre d’utilisateurs uniques utilisant le service chaque mois.')
  await expect(activity).toContainText('* Historique incomplet.')
  await expect(page.getByText(/Les visiteurs anonymes|Les SAGE et les départements sont deux lectures|Chaque préleveur est compté une seule fois|Part des préleveurs pour lesquels/)).toHaveCount(0)
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true)
  await territories.screenshot({path: testInfo.outputPath('declarations-territoriales.png')})
  await activity.screenshot({path: testInfo.outputPath('utilisateurs-actifs.png')})
  expect(errors).toEqual([])
})

test('les onglets restent accessibles au clavier et les profils consultables', async ({page}) => {
  await page.goto('/stats')
  const territories = page.getByRole('region', {name: territoriesName})
  await territories.getByRole('tab', {name: 'SAGE', exact: true}).focus()
  await page.keyboard.press('ArrowRight')
  await expect(territories.getByRole('tab', {name: 'Départements'})).toBeFocused()
  await expect(territories.getByRole('tab', {name: 'Départements'})).toHaveAttribute('aria-selected', 'true')
  await expect(territories.getByRole('heading', {name: 'Département de démonstration'})).toBeVisible()
  await territories.getByText('Répartition des préleveurs par profil', {exact: true}).click()
  await expect(territories.getByText('Agriculture', {exact: true})).toBeVisible()
})

test('un mois refusé ne masque pas les indicateurs globaux ni l’activité', async ({page}) => {
  await page.goto('/stats?month=2099-12')
  const territories = page.getByRole('region', {name: territoriesName})
  await expect(territories.getByRole('status')).toContainText('Ce mois n’est pas disponible')
  await expect(territories.getByRole('article')).toHaveCount(0)
  await expect(page.getByRole('region', {name: activityName}).getByRole('img')).toBeVisible()
  await expect(page.getByRole('region', {name: 'Où en est le déploiement'})).toContainText('12')
})

test('le vrai POST Next vide enregistre une activité, sans exposer de choix d’identité', async ({page, context}) => {
  const headers = {Origin: 'http://127.0.0.1:3417', 'X-Activity-Signal': '1'}
  const anonymous = await context.request.post('/auth/activity', {headers})
  expect(anonymous.status()).toBe(401)
  await useExistingSession(context)
  const activity = await context.request.post('/auth/activity', {headers})
  expect(activity.status()).toBe(200)
  expect(await activity.json()).toEqual({month: expect.stringMatching(/^\d{4}-\d{2}$/)})
  expect(activity.headers()['cache-control']).toContain('no-store')
  const invalidBody = await context.request.post('/auth/activity', {headers, data: {userId: 'another-user'}})
  expect(invalidBody.status()).toBe(400)
  const crossOrigin = await context.request.post('/auth/activity', {headers: {...headers, Origin: 'https://other.example.test'}})
  expect(crossOrigin.status()).toBe(403)
  await page.goto('/stats')
  await expect(page.getByRole('heading', {name: activityName})).toBeVisible()
})

test('une session déjà ouverte produit un signal, pas les rafraîchissements de session', async ({page, context}) => {
  await useExistingSession(context, {secure: true})
  await page.clock.install()
  const signals = []
  page.on('request', request => {
    if (new URL(request.url()).pathname === '/auth/activity') {
      signals.push(request)
    }
  })
  const recorded = page.waitForResponse(response => new URL(response.url()).pathname === '/auth/activity')
  await page.goto('https://127.0.0.1:3443/mon-compte')
  expect((await recorded).status()).toBe(200)
  await expect(page.getByRole('heading', {name: 'Mon compte', exact: true})).toBeVisible()
  const refreshed = page.waitForResponse(response => new URL(response.url()).pathname === '/auth/nextauth/session')
  await page.clock.fastForward(5 * 60 * 1000)
  expect((await refreshed).ok()).toBe(true)
  await page.getByRole('heading', {name: 'Mon compte', exact: true}).click()
  expect(signals).toHaveLength(1)
})
