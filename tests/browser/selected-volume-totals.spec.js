import {test, expect} from '@playwright/test'

const storiesUrl = 'http://127.0.0.1:3432'
const totalsLabel = 'Totaux sur la période affichée'

test.use({reducedMotion: 'reduce'})

test.beforeEach(async ({page}) => {
  await page.route('**/*', route => {
    const url = new URL(route.request().url())
    return url.origin === storiesUrl ? route.continue() : route.abort()
  })
})

const showStory = (page, story = 'periode-complete') =>
  page.goto(`${storiesUrl}/iframe.html?id=components-totaux-des-volumes--${story}&viewMode=story`)

const readRequests = async page => JSON.parse(await page.getByLabel('Requêtes de total bornées').textContent())

async function openFixtureControls(page) {
  await page.getByText('Contrôles de démonstration', {exact: true}).click()
}

async function dragEndToDay(page, day) {
  const endSlider = page.getByRole('slider').nth(1)
  const slider = page.locator('.MuiSlider-root')
  await page.evaluate(() => document.fonts.ready)
  await slider.scrollIntoViewIfNeeded()
  await page.locator('.MuiSlider-thumb').nth(1).hover()
  const track = await slider.boundingBox()
  await page.mouse.down()
  await page.mouse.move(track.x + track.width * day / 45, track.y + track.height / 2, {steps: 8})
  await expect(endSlider).toHaveAttribute('aria-valuenow', String(day))
}

test('totaux distincts des volumes, pas des index en m³, sans requête supplémentaire', async ({page}, testInfo) => {
  const errors = []
  page.on('pageerror', error => errors.push(error.message))
  await showStory(page)
  const totals = page.getByLabel(totalsLabel)
  await expect(totals).toContainText(/Total prélevé\s*:\s*45\s*000\s*m³/)
  await expect(totals).toContainText(/Total rejeté\s*:\s*9\s*000\s*m³/)
  expect(await readRequests(page)).toEqual([])
  await expect.poll(() => page.locator('#storybook-root path.MuiLineChart-line:not([d=""])').count()).toBeGreaterThan(0)
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true)
  await page.screenshot({path: testInfo.outputPath('totaux-volumes.png'), fullPage: true, animations: 'disabled'})
  await openFixtureControls(page)
  await page.getByRole('button', {name: 'Afficher aussi l’index', exact: true}).click()
  const parameterSelector = page.getByRole('button', {name: 'Paramètres à afficher', exact: true})
  await parameterSelector.click()
  await expect(page.getByRole('option', {name: /Index du compteur/})).toHaveAttribute('aria-selected', 'true')
  await parameterSelector.press('Escape')
  await expect(totals).toContainText(/45\s*000\s*m³/)
  await expect(totals).not.toContainText('Index')
  expect(await readRequests(page)).toEqual([])
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true)
  await page.getByRole('button', {name: 'Afficher uniquement l’index', exact: true}).click()
  await expect(totals).toHaveCount(0)
  expect(await readRequests(page)).toEqual([])
  expect(errors).toEqual([])
})

test('plage de dix jours : calcul au relâchement, bornes inclusives et indépendance de la résolution', async ({page}) => {
  await showStory(page)
  const totals = page.getByLabel(totalsLabel)
  await expect(totals).toContainText(/45\s*000\s*m³/)
  await dragEndToDay(page, 10)
  expect(await readRequests(page)).toEqual([])
  await page.mouse.up()
  await expect(totals).toContainText(/Total prélevé\s*:\s*10\s*000\s*m³/)
  await expect(totals).toContainText(/Total rejeté\s*:\s*2\s*000\s*m³/)
  expect(await readRequests(page)).toEqual([
    {id: 1, parameterId: 'volume:PRELEVEMENT', startDate: '2024-01-01', endDate: '2024-01-10'},
    {id: 2, parameterId: 'volume:REJET', startDate: '2024-01-01', endDate: '2024-01-10'}
  ])

  await openFixtureControls(page)
  await page.getByRole('button', {name: 'Résolution hebdomadaire', exact: true}).click()
  await expect(totals).toContainText(/10\s*000\s*m³/)
  expect(await readRequests(page)).toHaveLength(2)
})

test('semaine partielle : somme serveur exacte, pas prorata des points du graphique', async ({page}) => {
  await showStory(page, 'somme-partielle-hebdomadaire')
  const totals = page.getByLabel(totalsLabel)
  await expect(totals).toContainText(/103\s*500\s*m³/)
  await dragEndToDay(page, 10)
  expect(await readRequests(page)).toEqual([])
  await page.mouse.up()
  // Daily volumes 100, 200, ... 1 000 sum to 5 500. A proportional
  // split of the second weekly bucket would incorrectly yield 6 100.
  await expect(totals).toContainText(/5\s*500\s*m³/)
  await expect(totals).not.toContainText(/6\s*100/)
  expect(await readRequests(page)).toEqual([
    {id: 1, parameterId: 'volume:PRELEVEMENT', startDate: '2024-01-01', endDate: '2024-01-10'}
  ])
})

test('ancienne réponse asynchrone ignorée après un nouveau changement de période', async ({page}) => {
  await showStory(page, 'reponses-differees')
  const totals = page.getByLabel(totalsLabel)
  await expect(totals).toContainText(/45\s*000\s*m³/)
  const endSlider = page.getByRole('slider').nth(1)
  await endSlider.press('ArrowLeft')
  await expect.poll(async () => (await readRequests(page)).length).toBe(1)
  await expect(totals).toContainText('Chargement')
  await expect(totals).not.toContainText(/45\s*000/)
  await endSlider.press('ArrowLeft')
  await expect.poll(async () => (await readRequests(page)).length).toBe(2)
  await openFixtureControls(page)
  await page.getByRole('button', {name: 'Résoudre le calcul 2', exact: true}).click()
  await expect(totals).toContainText(/43\s*000\s*m³/)
  await page.getByRole('button', {name: 'Résoudre le calcul 1', exact: true}).click()
  await expect(totals).toContainText(/43\s*000\s*m³/)
  await expect(totals).not.toContainText(/44\s*000/)
})

test('zéro réel et absence de données restent distincts', async ({page}) => {
  await showStory(page, 'volume-nul')
  const totals = page.getByLabel(totalsLabel)
  await expect(totals).toContainText(/Total prélevé\s*:\s*0\s*m³/)
  await expect(totals).toContainText(/Total rejeté\s*:\s*0\s*m³/)
  await showStory(page, 'sans-donnees')
  await expect(page.getByText('Aucune donnée disponible pour la période sélectionnée', {exact: true})).toBeVisible()
  await expect(page.getByLabel(totalsLabel)).toHaveCount(0)
  await expect(page.getByText('Total indisponible', {exact: true})).toHaveCount(0)
})

test('sous-période sans données : aucun total ni fausse erreur', async ({page}) => {
  await showStory(page, 'sous-periode-sans-donnees')
  await expect(page.getByLabel(totalsLabel)).toContainText(/Total prélevé\s*:\s*1\s*000\s*m³/)
  await page.getByRole('slider').first().press('ArrowRight')
  await expect.poll(() => readRequests(page)).toEqual([
    {id: 1, parameterId: 'volume:PRELEVEMENT', startDate: '2024-01-02', endDate: '2024-02-14'}
  ])
  await expect(page.getByLabel(totalsLabel)).toHaveCount(0)
  await expect(page.getByText('Total indisponible', {exact: true})).toHaveCount(0)
})

test('échec du total sans disparition du graphique', async ({page}) => {
  await showStory(page, 'erreur-du-calcul')
  const totals = page.getByLabel(totalsLabel)
  await expect(totals).toContainText(/45\s*000\s*m³/)
  await page.getByRole('slider').nth(1).press('ArrowLeft')
  await expect(totals).toContainText('Total indisponible')
  await expect(page.getByRole('figure', {name: 'Graphique séries temporelles'})).toBeVisible()
  await expect.poll(() => page.locator('#storybook-root path.MuiLineChart-line:not([d=""])').count()).toBeGreaterThan(0)
})
