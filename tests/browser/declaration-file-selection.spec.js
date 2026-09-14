import {test, expect} from '@playwright/test'

const storiesUrl = 'http://127.0.0.1:3432'
const storyUrl = variant => `${storiesUrl}/iframe.html?id=declarations-selection-des-fichiers--${variant}&viewMode=story`

test.beforeEach(async ({page}) => {
  await page.route('**/*', route => new URL(route.request().url()).origin === storiesUrl
    ? route.continue()
    : route.abort())
})

for (const theme of ['light', 'dark']) {
  test(`sélection des fichiers : bouton identifiable en thème ${theme}`, async ({page}, testInfo) => {
    await page.goto(storyUrl('disponible'))
    const input = page.getByLabel(/Ajouter des fichiers/)
    await expect(input).toBeVisible()
    await page.evaluate(value => document.documentElement.setAttribute('data-fr-theme', value), theme)

    const buttonStyle = await input.evaluate(element => {
      const style = getComputedStyle(element, '::file-selector-button')
      return {
        borderWidth: Number.parseFloat(style.borderTopWidth),
        borderStyle: style.borderTopStyle,
        background: style.backgroundColor,
        color: style.color,
        padding: Number.parseFloat(style.paddingLeft),
        minHeight: Number.parseFloat(style.minHeight)
      }
    })
    expect(buttonStyle.borderWidth).toBeGreaterThanOrEqual(1)
    expect(buttonStyle.borderStyle).toBe('solid')
    expect(buttonStyle.padding).toBeGreaterThanOrEqual(12)
    expect(buttonStyle.minHeight).toBeGreaterThanOrEqual(40)
    expect(buttonStyle.background).not.toBe('rgba(0, 0, 0, 0)')
    expect(buttonStyle.color).not.toBe(buttonStyle.background)
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true)
    await page.screenshot({path: testInfo.outputPath(`selection-fichiers-${theme}.png`), fullPage: true})
  })
}

test('sélection des fichiers : choix du type puis sélection multiple au clavier', async ({page}) => {
  const pageErrors = []
  const submissions = []
  page.on('pageerror', error => pageErrors.push(error.message))
  page.on('request', request => {
    if (request.method() === 'POST') {
      submissions.push(request.url())
    }
  })
  await page.goto(storyUrl('type-a-selectionner'))
  const input = page.getByLabel(/Ajouter des fichiers/)
  await expect(input).toBeDisabled()
  await expect(input).toHaveAttribute('aria-disabled', 'true')
  await page.getByLabel('Type de fichier attendu *', {exact: true}).selectOption('gespoint-file')
  await expect(input).toBeEnabled()
  await expect(input).toHaveAttribute('aria-disabled', 'false')
  await expect(input).toHaveAttribute('multiple', '')
  await expect(input).toHaveAttribute('accept', '.xlsx, .xls, .ods, .csv')

  await input.focus()
  await expect(input).toBeFocused()
  const chooserOpened = page.waitForEvent('filechooser')
  await input.press('Space')
  const chooser = await chooserOpened
  expect(chooser.isMultiple()).toBe(true)
  await chooser.setFiles([
    {name: 'janvier.xlsx', mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', buffer: Buffer.from('fixture janvier')},
    {name: 'fevrier.xlsx', mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', buffer: Buffer.from('fixture février')}
  ])
  await expect(page.getByLabel('Fichiers sélectionnés', {exact: true})).toHaveText('janvier.xlsx, fevrier.xlsx')
  expect(pageErrors).toEqual([])
  expect(submissions).toEqual([])
})
