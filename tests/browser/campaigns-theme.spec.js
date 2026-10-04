import {randomUUID} from 'node:crypto'

import {expect, test} from '@playwright/test'
import {encode} from 'next-auth/jwt'

import {campaignIds} from '../../.github/scripts/campaign-fixtures.mjs'

const frontUrl = 'https://127.0.0.1:3443'
const campaignUrl = `${frontUrl}/campagnes/${campaignIds.campaign}`
const adminCampaignUrl = `${frontUrl}/administration/campagnes/${campaignIds.campaign}`
const responseUrl = `${campaignUrl}/reponses/${campaignIds.response}`
const needsSeasonTitle = 'Demande étiage du 1er juin au 31 octobre 2027'
const needsOffSeasonTitle = 'Demande hors-étiage du 1er novembre 2027 au 31 mai 2028'
test.use({ignoreHTTPSErrors: true, reducedMotion: 'reduce', colorScheme: 'light'})

test.beforeEach(async ({page}) => {
  await page.route('**/*', route => [frontUrl, 'http://127.0.0.1:3417'].includes(new URL(route.request().url()).origin) ? route.continue() : route.abort())
  await page.clock.setFixedTime(new Date('2026-11-01T12:00:00Z'))
})

async function authenticate(context, role, fixture = 'campaign') {
  const apiToken = `browser-test-${fixture}-${role}-${randomUUID()}`
  const token = await encode({secret: 'browser-tests-only-never-a-real-secret', token: {
    sub: campaignIds.user, token: apiToken, role: role.startsWith('admin') ? 'ADMIN' : 'DECLARANT', permissions: [],
    apiExpiresAt: new Date(Date.now() + 3_600_000).toISOString(), infoRefreshedAt: Date.now(),
    userInfo: {id: campaignIds.user, email: 'theme@example.test', declarantRole: role.startsWith('collector') ? 'COLLECTEUR' : 'PRELEVEUR'}
  }, maxAge: 3600})
  await context.addCookies(['next-auth.session-token', '__Secure-next-auth.session-token'].map(name => ({name, value: token, url: frontUrl, httpOnly: true, secure: true, sameSite: 'Lax'})))
  return async () => (await context.request.get('http://127.0.0.1:3431/api/__campaign-requests', {headers: {authorization: `Bearer ${apiToken}`}})).json()
}

// Exercise the actual DSFR preference, including React theme consumers. Merely
// changing data-fr-theme would miss menus whose colours depend on that state.
async function setTheme(page, theme) {
  const settings = page.getByRole('button', {name: "Paramètres d'affichage", exact: true})
  await expect(settings).toHaveAttribute('data-fr-js-modal-button', 'true')
  await settings.click()
  const modal = page.locator('#fr-theme-modal')
  await expect(modal).toBeVisible()
  const label = theme === 'dark' ? 'Thème sombre' : 'Thème clair'
  await modal.getByText(label, {exact: true}).click()
  await expect(modal.getByRole('radio', {name: label, exact: true})).toBeChecked()
  await modal.getByRole('button', {name: 'Fermer', exact: true}).click()
  await expect(modal).not.toBeVisible()
  await expect(page.locator('html')).toHaveAttribute('data-fr-theme', theme)
}

async function colours(locator) {
  return locator.evaluate(element => {
    const canvas = document.createElement('canvas')
    canvas.width = canvas.height = 1
    const context = canvas.getContext('2d', {willReadFrequently: true})
    const rgba = value => {
      context.clearRect(0, 0, 1, 1)
      context.fillStyle = value
      context.fillRect(0, 0, 1, 1)
      const [r, g, b, a] = context.getImageData(0, 0, 1, 1).data
      return [r, g, b, a / 255]
    }
    const blend = (front, back) => front.slice(0, 3).map((value, index) => value * front[3] + back[index] * (1 - front[3]))
    const luminance = rgb => rgb.map(value => {
      const channel = value / 255
      return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4
    }).reduce((sum, value, index) => sum + value * [0.2126, 0.7152, 0.0722][index], 0)
    const ancestors = []
    for (let node = element; node; node = node.parentElement) ancestors.unshift(node)
    const background = ancestors.reduce((result, node) => blend(rgba(getComputedStyle(node).backgroundColor), result), [255, 255, 255])
    const foreground = blend(rgba(getComputedStyle(element).color), background)
    const backgroundLuminance = luminance(background)
    const foregroundLuminance = luminance(foreground)
    return {
      background, foreground, backgroundLuminance,
      contrast: (Math.max(backgroundLuminance, foregroundLuminance) + 0.05) / (Math.min(backgroundLuminance, foregroundLuminance) + 0.05)
    }
  })
}

async function readable(locator, {theme, surface = false} = {}) {
  await expect(locator).toBeVisible()
  await expect.poll(async () => (await colours(locator)).contrast, {message: `Texte lisible : ${locator}`}).toBeGreaterThanOrEqual(4.5)
  if (surface) {
    // Theme transitions may still be running after the document attribute changes.
    const backgroundLuminance = () => colours(locator).then(value => value.backgroundLuminance)
    if (theme === 'dark') await expect.poll(backgroundLuminance).toBeLessThan(0.25)
    else await expect.poll(backgroundLuminance).toBeGreaterThan(0.5)
  }
}

async function checkThemes(page, testInfo, name, check) {
  // The last light pass proves an in-place return to the original theme, without
  // a reload or loss of local form state.
  for (const theme of ['light', 'dark', 'light']) {
    await setTheme(page, theme)
    await check(theme)
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true)
    await page.screenshot({path: testInfo.outputPath(`${name}-${theme}.png`), fullPage: true, animations: 'disabled'})
  }
}

test('thème : la liste admin garde titre, campagne et avancement lisibles', async ({page, context}, testInfo) => {
  const writes = await authenticate(context, 'admin')
  await page.goto(`${frontUrl}/administration/campagnes`)
  const content = page.locator('#content')
  await checkThemes(page, testInfo, 'campagnes-admin-liste', async theme => {
    await readable(content.getByRole('heading', {name: 'Campagnes', exact: true}), {theme, surface: true})
    await readable(content.getByRole('link', {name: 'Collecte synthétique', exact: true}), {theme, surface: true})
    await readable(content.getByText('0 / 1 exploitations ont répondu', {exact: true}))
    await readable(content.getByText('Brouillon', {exact: true}))
    await readable(content.getByRole('link', {name: 'Voir les points et les réponses', exact: true}))
  })
  expect(await writes()).toEqual([])
})

test('thème : le suivi admin et ses résultats conservent les identités des points', async ({page, context}, testInfo) => {
  await authenticate(context, 'admin-review')
  await page.goto(adminCampaignUrl)
  const content = page.locator('#content')
  await checkThemes(page, testInfo, 'campagne-admin-suivi', async theme => {
    await readable(content.getByRole('heading', {name: 'Points de la campagne', exact: true}), {theme, surface: true})
    await readable(content.getByText('Point synthétique', {exact: true}), {theme, surface: true})
    await readable(content.getByText('Commune de test · Parcelle du moulin', {exact: true}), {theme, surface: true})
    await readable(content.getByText('Code compteur Agence de l’eau : 001', {exact: true}), {theme, surface: true})
    await readable(content.getByRole('link', {name: 'Modifier', exact: true}))
    await content.getByRole('button', {name: 'Résultats envoyés', exact: true}).click()
    await readable(content.getByRole('heading', {name: 'Volumes prélevés calculés', exact: true}), {theme, surface: true})
    await readable(content.getByText('120 m³', {exact: true}).first(), {theme, surface: true})
    await content.getByRole('button', {name: 'Suivi des réponses', exact: true}).click()
  })
})

test('thème : l’édition admin garde les champs et la sélection sans perte de saisie', async ({page, context}, testInfo) => {
  const writes = await authenticate(context, 'admin')
  await page.goto(`${adminCampaignUrl}/modifier`)
  const name = page.getByLabel('Nom de la campagne', {exact: true})
  await name.fill('Nom conservé lors du changement de thème')
  await checkThemes(page, testInfo, 'campagne-admin-edition', async theme => {
    await expect(name).toHaveValue('Nom conservé lors du changement de thème')
    await readable(name, {theme, surface: true})
    await readable(page.getByRole('heading', {name: 'Informations générales', exact: true}), {theme, surface: true})
    await readable(page.getByLabel('Collecteur destinataire', {exact: true}), {theme, surface: true})
    const candidate = page.getByRole('checkbox', {name: /Point synthétique/})
    await expect(candidate).toBeChecked()
    await readable(page.locator(`label[for="candidate-${campaignIds.exploitation}"]`), {theme, surface: true})
    await readable(page.getByRole('button', {name: 'Enregistrer les modifications', exact: true}))
  })
  expect(await writes()).toEqual([])
})

test('thème : les campagnes du collecteur et les codes des points restent lisibles', async ({page, context}, testInfo) => {
  await authenticate(context, 'collector')
  await page.goto(`${frontUrl}/campagnes`)
  await checkThemes(page, testInfo, 'campagnes-collecteur-liste', async theme => {
    await readable(page.locator('#content').getByRole('link', {name: 'Collecte synthétique', exact: true}), {theme, surface: true})
    await readable(page.getByText('1 / 1 exploitations ont répondu', {exact: true}))
  })
  await page.getByRole('link', {name: 'Voir les points et les réponses', exact: true}).click()
  await checkThemes(page, testInfo, 'campagne-collecteur-points', async theme => {
    await readable(page.getByText('Point synthétique', {exact: true}), {theme, surface: true})
    await readable(page.getByText('Commune de test · Parcelle du moulin', {exact: true}), {theme, surface: true})
    await readable(page.getByText('Code compteur Agence de l’eau : 001', {exact: true}), {theme, surface: true})
    const pointRow = page.locator('#content li').filter({has: page.getByText('Point synthétique', {exact: true})})
    await readable(pointRow.getByText('Ferme synthétique'), {theme, surface: true})
    await readable(page.getByRole('link', {name: 'Consulter / modifier', exact: true}))
  })
})

test('thème : relevés, besoins, indications et barre d’enregistrement restent lisibles', async ({page, context}, testInfo) => {
  await authenticate(context, 'prefill-missing')
  await page.goto(responseUrl)
  const index = page.locator('[name="meters.0.offSeason.indexStart"]')
  await index.fill('144414')
  await page.getByRole('checkbox', {name: 'Je souhaite signaler un changement de compteur', exact: true}).focus()
  await page.getByRole('checkbox', {name: 'Je souhaite signaler un changement de compteur', exact: true}).press('Space')
  const reason = page.getByRole('textbox', {name: 'Motif du changement de compteur', exact: true})
  await reason.fill('Nouveau compteur THEME-2')
  await checkThemes(page, testInfo, 'campagne-declarant-formulaire', async theme => {
    await expect(index).toHaveValue(/144\s?414/)
    await expect(reason).toHaveValue('Nouveau compteur THEME-2')
    await readable(reason, {theme, surface: true})
    for (const name of ['Hors étiage 2025–2026', 'Étiage 2026', needsSeasonTitle, needsOffSeasonTitle]) {
      const period = page.getByRole('group', {name, exact: true})
      await readable(period.locator('legend'), {theme, surface: true})
      await readable(period.locator('label').first(), {theme, surface: true})
      await readable(period.locator('input[inputmode="decimal"]').first(), {theme, surface: true})
    }
    const season = await colours(page.getByRole('group', {name: needsSeasonTitle, exact: true}))
    const offSeason = await colours(page.getByRole('group', {name: needsOffSeasonTitle, exact: true}))
    expect(season.background).not.toEqual(offSeason.background)
    await readable(page.getByText('Données préremplies à vérifier.', {exact: true}), {theme, surface: true})
    await readable(page.getByRole('button', {name: 'Enregistrer le brouillon', exact: true}), {theme, surface: true})
    await readable(page.getByRole('button', {name: 'Envoyer ma réponse', exact: true}))
    if (theme === 'dark') {
      await page.locator('section').filter({has: page.getByRole('heading', {name: 'Besoins 2027–2028', exact: true})})
        .screenshot({path: testInfo.outputPath('besoins-mode-sombre.png'), animations: 'disabled'})
    }
  })
  await setTheme(page, 'dark')
  await page.getByRole('button', {name: 'Enregistrer le brouillon', exact: true}).click()
  await readable(page.getByRole('region', {name: 'Enregistrement de la réponse', exact: true}).getByRole('status'), {theme: 'dark', surface: true})
})

test('thème : le menu des cultures distingue les options choisies et garde le focus clavier', async ({page, context}, testInfo) => {
  await authenticate(context, 'prefill-missing')
  await page.goto(responseUrl)
  const crops = page.getByRole('group', {name: needsSeasonTitle, exact: true}).getByRole('button', {name: 'Cultures irriguées', exact: true})
  await checkThemes(page, testInfo, 'campagne-cultures', async theme => {
    await crops.click()
    const choices = page.getByRole('listbox', {name: 'Cultures irriguées', exact: true})
    const selected = choices.getByRole('option', {name: 'Céréales', exact: true})
    if (await selected.getAttribute('aria-selected') !== 'true') await selected.click()
    await expect(selected).toHaveAttribute('aria-selected', 'true')
    await readable(selected.locator('[data-crop-level]'), {theme, surface: true})
    await readable(selected.locator('[data-selection-indicator="checkbox"]'))
    await readable(choices.getByRole('option', {name: 'Maïs grain', exact: true}).locator('[data-crop-level]'), {theme, surface: true})
    const popup = page.locator('.grouped-multiselect-popup')
    expect(await popup.evaluate(element => Number(getComputedStyle(element).zIndex))).toBeGreaterThan(10)
    await popup.screenshot({path: testInfo.outputPath(`cultures-options-${theme}.png`), animations: 'disabled'})
    await page.keyboard.press('Escape')
    await expect(choices).not.toBeVisible()
    await expect(crops).toBeFocused()
    await expect(crops).toContainText('Céréales')
  })
})

test('thème : le menu des usages et ses sous-usages conservent une sélection lisible', async ({page, context}, testInfo) => {
  await authenticate(context, 'prefill-missing')
  await page.goto(responseUrl)
  const usage = page.getByRole('group', {name: needsSeasonTitle, exact: true}).getByRole('combobox')
  await usage.click()
  await page.getByRole('option', {name: /Goutte-à-goutte/}).click()
  await checkThemes(page, testInfo, 'campagne-usages', async theme => {
    await expect(usage).toHaveValue('Goutte-à-goutte')
    await readable(usage, {theme, surface: true})
    await usage.click()
    const list = page.getByRole('listbox')
    const selected = list.getByRole('option', {name: /Goutte-à-goutte/})
    await expect(selected).toHaveAttribute('aria-selected', 'true')
    await readable(selected, {theme, surface: true})
    await readable(list.getByRole('option', {name: 'Irrigation', exact: true}), {theme, surface: true})
    await readable(list.getByRole('option', {name: /Aspersion/}), {theme, surface: true})
    await list.screenshot({path: testInfo.outputPath(`usages-options-${theme}.png`), animations: 'disabled'})
    await usage.press('Escape')
    await expect(list).not.toBeVisible()
    await expect(usage).toBeFocused()
  })
})

test('thème : le préleveur distingue son point sélectionné et retrouve sa carte', async ({page, context}, testInfo) => {
  test.setTimeout(60_000)
  const mapTile = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADElEQVR4nGN49+kXAAWsAttzkl10AAAAAElFTkSuQmCC', 'base64')
  await page.route('**/*', route => {
    const url = new URL(route.request().url())
    if (url.hostname === 'data.geopf.fr' || (url.hostname === 'openmaptiles.github.io' && url.pathname.endsWith('.png'))) return route.fulfill({contentType: 'image/png', body: mapTile})
    if (url.hostname === 'openmaptiles.github.io' && url.pathname.endsWith('.json')) return route.fulfill({json: {}})
    return route.fallback()
  })
  const writes = await authenticate(context, 'map-many')
  await page.goto(campaignUrl)
  await expect(page.getByText('Page 1 sur 2', {exact: true})).toBeVisible()
  await expect(page.locator('button[aria-pressed="true"]')).toHaveCount(0)
  await page.getByRole('searchbox', {name: 'Rechercher un point', exact: true}).fill('001')
  const point = page.getByRole('button', {name: /Point partagé.*001/})
  await point.click()
  const map = page.getByRole('region', {name: 'Localisation des points de prélèvement', exact: true})
  await map.scrollIntoViewIfNeeded()
  await expect(map.locator('[data-map-ready="true"]')).toBeVisible({timeout: 20_000})
  // Recentring is offered only after a real user movement, not for the initial
  // fit or the programmatic focus of a selected point.
  await map.locator('.maplibregl-ctrl-zoom-in').click()
  await expect(map.getByRole('button', {name: 'Recentrer la carte sur tous les points', exact: true})).toBeVisible()
  await checkThemes(page, testInfo, 'campagne-preleveur-carte', async theme => {
    await expect(point).toHaveAttribute('aria-pressed', 'true')
    await readable(point.getByText('Point partagé', {exact: true}), {theme, surface: true})
    await readable(point.getByText('Code compteur Agence de l’eau : 001', {exact: true}), {theme, surface: true})
    await readable(page.getByRole('link', {name: 'Commencer ma déclaration', exact: true}))
    await readable(map.getByRole('button', {name: 'Recentrer la carte sur tous les points', exact: true}), {theme, surface: true})
    const selectedBorder = await point.evaluate(element => getComputedStyle(element.closest('li')).borderColor)
    const activeBorder = await page.evaluate(() => {
      const probe = document.createElement('span')
      probe.style.color = 'var(--border-active-blue-france)'
      document.body.append(probe)
      const colour = getComputedStyle(probe).color
      probe.remove()
      return colour
    })
    expect(selectedBorder).toBe(activeBorder)
    await expect(map.locator('canvas')).toBeVisible()
  })
  expect(await writes()).toEqual([])
})


test('thème : la saisie rapide, ses usages et son calendrier gardent la saisie lisible', async ({page, context}, testInfo) => {
  await authenticate(context, 'readonly', 'quick-exclusion')
  await page.goto(`${frontUrl}/mes-declarations/new`)
  const value = page.getByRole('textbox', {name: /Index \(m³\) — Point partagé synthétique — Code comptage : 001/})
  await value.fill('120')
  await checkThemes(page, testInfo, 'declaration-rapide', async theme => {
    await expect(value).toHaveValue('120')
    await readable(value, {theme, surface: true})
    await readable(page.getByText('Point partagé synthétique', {exact: true}).first(), {theme, surface: true})
  })
  await page.getByRole('radio', {name: 'Volume', exact: true}).focus()
  await page.getByRole('radio', {name: 'Volume', exact: true}).press('Space')
  for (const theme of ['light', 'dark']) {
    await setTheme(page, theme)
    await page.getByRole('button', {name: /^Période déclarée/}).click()
    const calendar = page.getByRole('dialog', {name: 'Choisir une période'})
    const day = calendar.getByRole('button', {name: '1', exact: true}).first()
    await day.click()
    await readable(day, {theme})
    await page.keyboard.press('Escape')
  }
})

test('thème : le dépôt de fichier conserve commentaire, sélection et erreurs lisibles', async ({page, context}, testInfo) => {
  await authenticate(context, 'readonly-file', 'quick-exclusion')
  await page.goto(`${frontUrl}/mes-declarations/new`)
  // Wait for client-side controls before selecting files on the server-rendered form.
  await setTheme(page, 'light')
  const comment = page.getByRole('textbox', {name: 'Commentaire Facultatif', exact: true})
  const upload = page.getByLabel(/Ajouter des fichiers/)
  await upload.setInputFiles({name: 'invalide.csv', mimeType: 'text/csv', buffer: Buffer.from('colonne_invalide\nvaleur')})
  await expect(page.getByText('invalide.csv', {exact: true})).toBeVisible()
  await comment.fill('Commentaire conservé dans les deux thèmes')
  await checkThemes(page, testInfo, 'declaration-fichier', async theme => {
    await expect(comment).toHaveValue('Commentaire conservé dans les deux thèmes')
    await readable(comment, {theme, surface: true})
    await readable(page.getByText('invalide.csv', {exact: true}), {theme, surface: true})
    await expect(page.getByRole('button', {name: 'Soumettre la déclaration', exact: true})).toBeDisabled()
    await readable(page.getByRole('button', {name: 'Réinitialiser', exact: true}), {theme})
  })
})
