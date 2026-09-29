import {test, expect} from '@playwright/test'

const storiesUrl = 'http://127.0.0.1:3432'
const xLabels = '.MuiChartsAxis-directionX .MuiChartsAxis-tickLabel'
const yLabels = '.MuiChartsAxis-directionY .MuiChartsAxis-tickLabel'

test.use({reducedMotion: 'reduce'})

test.beforeEach(async ({page}) => {
  await page.route('**/*', route => new URL(route.request().url()).origin === storiesUrl ? route.continue() : route.abort())
})

async function checkLabels(page) {
  await page.locator(yLabels).first().waitFor()
  await expect(page.locator(yLabels).first()).toHaveCSS('font-family', /Marianne/)
  await page.evaluate(() => document.fonts.ready)
  await expect.poll(async () => (await page.locator(xLabels).allTextContents()).filter(text => text.trim()).length).toBeGreaterThan(1)
  await expect.poll(async () => (await page.locator(`${xLabels}, ${yLabels}`).allTextContents()).some(text => !text.trim() || /[…]|\.{3}/.test(text))).toBe(false)
  const outside = await page.locator(`${xLabels}, ${yLabels}, .MuiChartsAxis-label`).evaluateAll(labels => labels.filter(label => {
    const bounds = label.getBoundingClientRect()
    const chart = label.closest('svg').getBoundingClientRect()
    return bounds.width > 0 && (bounds.left < chart.left - 1 || bounds.right > chart.right + 1 || bounds.top < chart.top - 1 || bounds.bottom > chart.bottom + 1)
  }).map(label => label.textContent))
  expect(outside).toEqual([])
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true)
}

test('volumes : graduations complètes et dates visibles, y compris après redimensionnement', async ({page}, testInfo) => {
  await page.goto(`${storiesUrl}/iframe.html?id=components-timeserieschart--large-volumes&viewMode=story`)
  await checkLabels(page)
  await expect(page.locator(yLabels).filter({hasText: /^25\s*000$/})).toBeVisible()
  await expect(page.locator('.MuiChartsAxis-right')).toHaveCount(0)
  await page.screenshot({path: testInfo.outputPath('axes-volumes.png'), fullPage: true})
  if (!testInfo.project.use.isMobile) {
    await page.setViewportSize({width: 390, height: 844})
    await checkLabels(page)
    await expect(page.locator(yLabels).filter({hasText: /^25\s*000$/})).toBeVisible()
  }
})

test('deux axes : grands volumes, nombres négatifs et décimales lisibles', async ({page}, testInfo) => {
  await page.goto(`${storiesUrl}/iframe.html?id=components-timeserieschart--large-values-and-decimals&viewMode=story`)
  await checkLabels(page)
  await expect(page.locator('.MuiChartsAxis-left .MuiChartsAxis-tickLabel').filter({hasText: /^1\s*000\s*000$/})).toBeVisible()
  await expect(page.locator('.MuiChartsAxis-right .MuiChartsAxis-tickLabel').filter({hasText: /-\d+,\d{2}/}).first()).toBeVisible()
  await page.screenshot({path: testInfo.outputPath('axes-doubles.png'), fullPage: true})
  await page.locator('.MuiChartsLegend-root').getByText('Volume prélevé (m³)', {exact: true}).click()
  await expect(page.locator('.MuiChartsAxis-left')).toHaveCount(0)
  await checkLabels(page)
  await page.locator('.MuiChartsLegend-root').getByText('Volume prélevé (m³)', {exact: true}).click()
  await expect(page.locator('.MuiChartsAxis-left')).toHaveCount(1)
  await checkLabels(page)
})
