import {test, expect} from '@playwright/test'

const storiesUrl = 'http://127.0.0.1:3432'
const xLabels = '.MuiChartsAxis-directionX .MuiChartsAxis-tickLabel'
const yLabels = '.MuiChartsAxis-directionY .MuiChartsAxis-tickLabel'
const legendLabels = ['Saisies rapides', 'Fichiers déposés', 'Autres dépôts', 'Échecs de traitement']

test.use({reducedMotion: 'reduce'})

test.beforeEach(async ({page}) => {
  await page.route('**/*', route => new URL(route.request().url()).origin === storiesUrl ? route.continue() : route.abort())
})

for (const story of ['quotidienne', 'hebdomadaire']) {
  test(`administration : dates, nombres et légende de l’activité ${story} lisibles`, async ({page}, testInfo) => {
    const errors = []
    page.on('pageerror', error => errors.push(error.message))
    await page.goto(`${storiesUrl}/iframe.html?id=administration-activité-des-déclarations--${story}&viewMode=story`)
    await expect(page.locator(xLabels).first()).toHaveCSS('font-family', /Marianne/)
    await page.evaluate(() => document.fonts.ready)
    await expect(page.locator(yLabels).filter({hasText: /^40\s*000$/})).toBeVisible()
    await expect.poll(() => page.locator(xLabels).count()).toBeGreaterThan(1)
    for (const label of legendLabels) {
      await expect(page.locator('.MuiChartsLegend-root').getByText(label, {exact: true})).toBeVisible()
    }

    const dates = await page.locator(xLabels).allTextContents()
    for (const date of dates) {
      expect(date).toMatch(story === 'quotidienne' ? /^\d{1,2} août$/ : /^Sem\. \d{1,2} [\p{L}.]+$/u)
    }

    const labels = await page.locator(`${xLabels}, ${yLabels}`).allTextContents()
    expect(labels.every(label => label.trim() && !/[…]|\.{3}/.test(label))).toBe(true)

    const layout = await page.locator(`${xLabels}, ${yLabels}`).evaluateAll(elements => {
      const outside = elements.filter(element => {
        const bounds = element.getBoundingClientRect()
        const chart = element.closest('svg').getBoundingClientRect()
        return bounds.left < chart.left - 1 || bounds.right > chart.right + 1
          || bounds.top < chart.top - 1 || bounds.bottom > chart.bottom + 1
      }).map(element => element.textContent)
      const dates = elements.filter(element => element.closest('.MuiChartsAxis-directionX'))
        .map(element => element.getBoundingClientRect()).sort((a, b) => a.left - b.left)
      return {outside, overlappingDates: dates.some((date, index) => index > 0 && date.left < dates[index - 1].right)}
    })

    expect(layout).toEqual({outside: [], overlappingDates: false})
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true)
    expect(errors).toEqual([])
    await page.screenshot({path: testInfo.outputPath(`admin-activite-${story}.png`), fullPage: true})
  })
}
