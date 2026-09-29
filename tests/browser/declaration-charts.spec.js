import {test, expect} from '@playwright/test'

const storiesUrl = 'http://127.0.0.1:3432'
const storyUrl = variant => `${storiesUrl}/iframe.html?id=declarations-graphiques--${variant}&viewMode=story`
const xLabels = '.MuiChartsAxis-directionX .MuiChartsAxis-tickLabel'
const yLabels = '.MuiChartsAxis-directionY .MuiChartsAxis-tickLabel'

test.use({reducedMotion: 'reduce'})

test.beforeEach(async ({page}) => {
  await page.route('**/*', route => new URL(route.request().url()).origin === storiesUrl
    ? route.continue()
    : route.abort())
})

async function expectReadableAxes(page) {
  await expect(page.locator(yLabels).first()).toBeVisible()
  await expect(page.locator(yLabels).first()).toHaveCSS('font-family', /Marianne/)
  await page.evaluate(() => document.fonts.ready)
  await expect.poll(async () => (await page.locator(xLabels).allTextContents()).filter(text => text.trim()).length).toBeGreaterThan(1)
  await expect.poll(async () => (await page.locator(yLabels).allTextContents()).filter(text => text.trim()).length).toBeGreaterThan(1)
  const labels = page.locator(`${xLabels}, ${yLabels}`)
  expect((await labels.allTextContents()).filter(text => !text.trim() || /…|\.{3}/.test(text))).toEqual([])
  const clipped = await labels.evaluateAll(elements => elements.filter(element => {
    const bounds = element.getBoundingClientRect()
    const chartBounds = element.closest('svg').getBoundingClientRect()
    return bounds.left < chartBounds.left - 1 || bounds.right > chartBounds.right + 1
      || bounds.top < chartBounds.top - 1 || bounds.bottom > chartBounds.bottom + 1
  }).map(element => element.textContent))
  expect(clipped).toEqual([])
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true)
}

test('déclaration : graduations complètes avec une ou deux unités et après changement de résolution', async ({page}, testInfo) => {
  const errors = []
  page.on('pageerror', error => errors.push(error.message))
  await page.goto(storyUrl('evolution-des-parametres'))
  await expectReadableAxes(page)
  await expect(page.locator(yLabels).filter({hasText: /^1\s*000\s*000$/})).toBeVisible()

  await page.getByRole('button', {name: 'Débit', exact: true}).click()
  await expect(page.locator('.MuiChartsAxis-right')).toHaveCount(1)
  await expectReadableAxes(page)
  await page.screenshot({path: testInfo.outputPath('declaration-deux-axes.png'), fullPage: true})

  await page.getByRole('button', {name: '15 min', exact: true}).click()
  await expectReadableAxes(page)
  expect(errors).toEqual([])
})

test('calendrier de déclaration : dates et chiffres du détail journalier visibles', async ({page}, testInfo) => {
  const errors = []
  page.on('pageerror', error => errors.push(error.message))
  await page.goto(storyUrl('detail-journalier'))
  await page.getByRole('gridcell', {name: '1 Septembre', exact: true}).click()
  await expectReadableAxes(page)
  await page.locator('svg:has(.MuiChartsAxis-root)').hover()
  await expect(page.getByRole('tooltip')).toContainText('m³')
  await page.screenshot({path: testInfo.outputPath('declaration-detail-journalier.png'), fullPage: true})

  await page.getByRole('tab', {name: 'Débit', exact: true}).click()
  await expectReadableAxes(page)
  await page.keyboard.press('Escape')
  await expect(page.locator('svg:has(.MuiChartsAxis-root)')).toHaveCount(0)
  expect(errors).toEqual([])
})
