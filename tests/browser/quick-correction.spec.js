import {randomUUID} from 'node:crypto'
import {expect, test} from '@playwright/test'
import {encode} from 'next-auth/jwt'
import {ids} from '../../.github/scripts/quick-correction-fixtures.mjs'
import {quickExclusionIds} from '../../.github/scripts/quick-exclusion-fixtures.mjs'

const front = 'https://127.0.0.1:3443'
const mapTile = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADElEQVR4nGN49+kXAAWsAttzkl10AAAAAElFTkSuQmCC', 'base64')
test.use({ignoreHTTPSErrors: true, reducedMotion: 'reduce'})

const correctionReview = page => page.getByRole('dialog', {name: 'Vérifiez vos modifications'})
const reviewPoint = (review, code) => review.getByRole('region', {name: new RegExp(`Forage des Prés.*${code}`)})

function quantity(page, code, type = 'Index') {
  return page.getByRole('textbox', {name: new RegExp(`^${type} \\(m³\\) — .+Code comptage : ${code}\\b`)})
}

function pencil(page, code) {
  return page.getByRole('button', {name: new RegExp(`^Modifier la saisie de .+Code comptage : ${code}\\b`)})
}

async function openCorrection(page, label) {
  const action = page.getByRole('link', {name: label, exact: true})
  await expect(action).toHaveClass(/\bfr-icon-edit-line\b/)
  await expect(action).toHaveAttribute('href', `/saisie-en-ligne/${ids.declaration}/modifier`)
  await action.click()
}

async function fillMeasurement(page, code, value, type = 'Index') {
  const field = quantity(page, code, type)
  if (await field.evaluate(input => input.readOnly)) {
    await pencil(page, code).click()
    await expect(field).toBeFocused()
  }
  await field.fill(value)
}

async function openPeriods(point) {
  const details = point.locator('details')
  const summary = details.locator('summary')
  await expect(summary).toHaveText('Détail des périodes')
  if (await details.getAttribute('open') === null) await summary.click()
  const table = details.getByRole('table')
  await expect(table.getByRole('columnheader')).toHaveText(['Période', 'Avant', 'Après', 'Écart'])
  return table
}

async function chooseMeasurementType(page, name) {
  const radio = page.getByRole('radio', {name, exact: true})
  await expect(radio).toBeEnabled()
  await radio.press('Space')
  await expect(radio).toBeChecked()
}

async function chooseSeptemberPeriod(page, start, end) {
  await page.getByRole('button', {name: /^Période déclarée/}).click()
  const calendar = page.getByRole('dialog', {name: 'Choisir une période'})
  await calendar.getByRole('button', {name: String(start), exact: true}).first().click()
  await calendar.getByRole('button', {name: String(end), exact: true}).first().click()
  await calendar.getByRole('button', {name: 'Valider'}).click()
}

async function authenticate(context, role, userId, apiToken, declarantRole = 'PRELEVEUR') {
  const value = await encode({secret: 'browser-tests-only-never-a-real-secret', maxAge: 3600, token: {
    sub: userId, token: apiToken, role, permissions: [],
    apiExpiresAt: new Date(Date.now() + 3600000).toISOString(), infoRefreshedAt: Date.now(), userInfo: {id: userId, declarantRole}
  }})
  await context.addCookies(['next-auth.session-token', '__Secure-next-auth.session-token'].map(name => ({
    name, value, url: front, httpOnly: true, secure: true, sameSite: 'Lax'
  })))
}

async function session(context, role, scenario = 'simple') {
  const apiToken = `browser-test-quick-correction-${role}-${scenario}-${randomUUID()}`
  const declarantRole = role === 'DECLARANT' ? (scenario.startsWith('collector') ? 'COLLECTEUR' : 'PRELEVEUR') : null
  await authenticate(context, role, ids.user, apiToken, declarantRole)
  return async () => (await context.request.get('http://127.0.0.1:3431/api/__quick-correction', {
    headers: {authorization: `Bearer ${apiToken}`, connection: 'close'}
  })).json()
}

test.beforeEach(async ({page}) => {
  await page.clock.setFixedTime(new Date('2026-09-22T12:00:00Z'))
  await page.route('**/*', route => {
    const url = new URL(route.request().url())
    if (url.hostname === '127.0.0.1') return route.continue()
    if (url.hostname === 'data.geopf.fr' || (url.hostname === 'openmaptiles.github.io' && url.pathname.endsWith('.png'))) {
      return route.fulfill({contentType: 'image/png', body: mapTile})
    }
    if (url.hostname === 'openmaptiles.github.io' && url.pathname.endsWith('.json')) return route.fulfill({json: {}})
    return route.abort()
  })
})

test('la création accepte la saisie directe et le crayon de correction active uniquement la ligne choisie', async ({page, context}) => {
  const first = quantity(page, '001')
  const second = quantity(page, '002')
  const rows = page.getByRole('listitem').filter({has: page.getByRole('textbox', {name: /^Index \(m³\) —/})})
  const firstRow = rows.filter({has: first})
  const secondRow = rows.filter({has: second})

  await test.step('Saisir dans les champs du formulaire de création', async () => {
    await authenticate(context, 'DECLARANT', quickExclusionIds.user, `browser-test-quick-exclusion-readonly-${randomUUID()}`)
    await page.goto(`${front}/mes-declarations/new`)
    await expect(rows).toHaveCount(2)
    await expect(first).toBeEditable()
    await expect(second).toBeEditable()
    await expect(page.getByRole('button', {name: /^Modifier la saisie de/})).toHaveCount(0)
    await firstRow.getByRole('button', {name: 'Point partagé synthétique', exact: true}).click()
    await expect(first).toBeFocused()
    await first.press('Enter')
    await expect(second).toBeFocused()
    await second.fill('42')
    await expect(second).toHaveValue('42')
    await second.clear()
  })

  await test.step('Activer le crayon au clavier sur le formulaire prérempli', async () => {
    const state = await session(context, 'DECLARANT', 'fixed')
    await page.goto(`${front}/saisie-en-ligne/${ids.declaration}/modifier`)
    await expect(rows).toHaveCount(2)
    await expect(first).toHaveAttribute('inputmode', 'decimal')
    await expect(first).toHaveValue('125')
    await expect(second).toHaveValue('')
    await expect(first).toHaveJSProperty('readOnly', true)
    await expect(second).toHaveJSProperty('readOnly', true)
    const editFirst = pencil(page, '001')
    await expect(editFirst).toHaveClass(/\bfr-icon-edit-line\b/)
    await expect(editFirst).toHaveAccessibleName(/Forage des Prés.*Code comptage : 001.*compteur C-101/)
    await expect(secondRow.getByRole('button', {name: /^Modifier la saisie de/})).toBeVisible()
    await firstRow.getByRole('button', {name: 'Forage des Prés', exact: true}).click()
    await expect(first).toHaveJSProperty('readOnly', true)
    await expect(editFirst).toBeEnabled()
    await editFirst.focus()
    await editFirst.press('Enter')
    await expect(first).toBeFocused()
    await expect(first).toBeEditable()
    await expect(second).toHaveJSProperty('readOnly', true)
    const changed = firstRow.getByText('Modifié', {exact: true})
    const verify = page.getByRole('button', {name: 'Vérifier les modifications'})
    await expect(changed).toHaveCount(0)
    await expect(verify).toBeDisabled()
    await first.fill('140')
    await expect(changed).toBeVisible()
    await expect(verify).toBeEnabled()
    await first.press('Enter')
    await expect(second).toHaveJSProperty('readOnly', true)
    await expect(secondRow.getByText('Modifié', {exact: true})).toHaveCount(0)
    await fillMeasurement(page, '001', '125')
    await expect(changed).toHaveCount(0)
    await expect(verify).toBeDisabled()
    expect((await state()).revision).toBe(0)
  })
})

test('le préleveur déplace son index, contacte PE et confirme uniquement la dernière date', async ({page, context}) => {
  const state = await session(context, 'DECLARANT')
  await page.goto(`${front}/mes-declarations/${ids.declaration}`)
  await openCorrection(page, 'Modifier ma déclaration')
  const day = page.getByLabel('Date du relevé d’index')
  await day.fill('2026-09-10')
  await page.getByRole('button', {name: 'Contacter l’équipe PE'}).click()
  const contact = page.getByRole('dialog', {name: 'Contacter l’équipe PE'})
  await expect(contact.getByRole('textbox')).toHaveValue(/Index du 10\/09\/2026 : 125/)
  await contact.getByRole('button', {name: 'Envoyer le message'}).click()
  await expect(contact.getByRole('status')).toHaveText('Votre message a été envoyé à l’équipe PE.')
  await page.keyboard.press('Escape')
  await expect(contact).not.toBeVisible()
  const verify = page.getByRole('button', {name: 'Vérifier les modifications'})
  const review = correctionReview(page)
  const point = reviewPoint(review, '001')
  await verify.click()
  await expect(point.getByText(/Index supérieur au relevé suivant/)).toBeVisible()
  await expect(review.getByText('Vous pouvez confirmer cette saisie.', {exact: true})).toHaveCount(1)
  await expect(review.getByRole('button', {name: 'Confirmer la modification'})).toBeEnabled()
  await review.getByRole('button', {name: 'Revenir à la saisie'}).click()
  await day.fill('2026-09-15')
  await expect(page.getByRole('button', {name: 'Contacter l’équipe PE'})).toHaveCount(0)
  await verify.click()
  await expect(point.getByRole('heading', {level: 3})).toContainText('Forage des Prés')
  await expect((await openPeriods(point)).getByText('15/09/2026')).toBeVisible()
  await expect(review.getByText('Vous pouvez confirmer cette saisie.', {exact: true})).toHaveCount(0)
  expect((await state()).revision).toBe(0)
  await review.getByRole('button', {name: 'Confirmer la modification'}).click()
  await expect(page.getByText('La déclaration a été modifiée.')).toBeVisible()
  expect((await state()).entries[0].readingDate).toBe('2026-09-15')
})

test('la fiche du collecteur donne accès au crayon lorsque le dossier est modifiable', async ({page, context}) => {
  const detail = `${front}/mes-declarations/${ids.declaration}`
  await session(context, 'DECLARANT', 'collector')
  await page.goto(detail)
  await openCorrection(page, 'Modifier ma déclaration')
  const first = quantity(page, '001')
  await expect(first).toHaveJSProperty('readOnly', true)
  await expect(first).toHaveValue('125')
  await pencil(page, '001').click()
  await expect(first).toBeFocused()
  await expect(first).toBeEditable()

  await session(context, 'DECLARANT', 'collector-denied')
  await page.goto(detail)
  await expect(page.getByRole('heading', {name: /Déclaration n°PE-2026/})).toBeVisible()
  await expect(page.getByRole('link', {name: 'Modifier ma déclaration'})).toHaveCount(0)
  await expect(page.getByRole('button', {name: 'Demander une modification'})).toHaveCount(0)
})

test('un dépôt fichier conserve la demande de modification de points', async ({page, context}) => {
  await session(context, 'DECLARANT', 'file')
  await page.goto(`${front}/mes-declarations/${ids.declaration}`)
  const request = page.getByRole('button', {name: 'Demander une modification', exact: true})
  await expect(request).toBeVisible()
  await expect(page.getByRole('link', {name: 'Modifier ma déclaration'})).toHaveCount(0)
  await request.click()
  await expect(page.getByRole('dialog', {name: /Demande d['’]ajout ou modification de points/})).toBeVisible()
})

test('l’administrateur peut convertir et retirer la dernière ligne, l’agent reste en lecture', async ({page, context}) => {
  const state = await session(context, 'ADMIN')
  const detail = `${front}/declarations/${ids.source}`
  await page.goto(detail)
  await openCorrection(page, 'Modifier la déclaration')
  await chooseMeasurementType(page, 'Volume')
  await expect(quantity(page, '001', 'Volume')).toHaveValue('125')
  await expect(quantity(page, '001', 'Volume')).toHaveJSProperty('readOnly', true)
  await chooseSeptemberPeriod(page, 1, 16)
  const verify = page.getByRole('button', {name: 'Vérifier les modifications'})
  await verify.click()
  const review = correctionReview(page)
  const point = reviewPoint(review, '001')
  await expect((await openPeriods(point)).getByText(/01\/09\/2026 au 16\/09\/2026/)).toBeVisible()
  await review.getByRole('button', {name: 'Revenir à la saisie'}).click()
  await chooseSeptemberPeriod(page, 1, 20)
  await verify.click()
  await expect((await openPeriods(point)).getByText(/01\/09\/2026 au 20\/09\/2026/)).toBeVisible()
  await review.getByRole('button', {name: 'Confirmer la modification'}).click()
  await expect(page.getByText('La déclaration a été modifiée.')).toBeVisible()
  const converted = await state()
  expect(converted).toMatchObject({measurementType: 'VOLUME', revision: 1})
  expect(converted.requests.at(-1).body).toMatchObject({revision: 0, entries: [{id: ids.row, value: 125}]})
  await openCorrection(page, 'Modifier la déclaration')
  await fillMeasurement(page, '001', '', 'Volume')
  await expect(page.getByText('Supprimé', {exact: true})).toBeVisible()
  await verify.click()
  await review.getByRole('button', {name: 'Confirmer la modification'}).click()
  await expect(page.getByText('Sans mesure active', {exact: true}).first()).toBeVisible()
  const emptied = await state()
  expect(emptied).toMatchObject({entries: [], revision: 2})
  const confirmation = emptied.requests.at(-1)
  expect(confirmation.body).toMatchObject({entries: [], revision: 1, previewToken: expect.any(String)})
  expect(emptied.requests.filter(request => request.path.endsWith('/preview')).at(-1).body).toMatchObject({entries: [], revision: 1})
  await expect(page.getByRole('link', {name: 'Modifier la déclaration'})).toHaveCount(0)
  await page.goto(`${front}/saisie-en-ligne/${ids.declaration}/modifier`)
  await expect(page.getByText('Cette déclaration ne contient plus de mesure active.')).toBeVisible()
  await expect(page.getByRole('textbox', {name: /Code comptage/})).toHaveCount(0)
  await expect(verify).toHaveCount(0)
  await session(context, 'INSTRUCTOR')
  await page.goto(detail)
  await expect(page.getByRole('link', {name: 'Modifier la déclaration'})).toHaveCount(0)
})

test('une valeur à zéro se saisit sur un comptage déjà présent, sans modifier la liste des points', async ({page, context}) => {
  const state = await session(context, 'DECLARANT', 'fixed')
  await page.goto(`${front}/saisie-en-ligne/${ids.declaration}/modifier`)
  const verify = page.getByRole('button', {name: 'Vérifier les modifications'})
  const original = quantity(page, '001')
  const blankValue = quantity(page, '002')
  const removedBadge = page.getByRole('listitem').filter({has: original}).getByText('Supprimé', {exact: true})
  const addedBadge = page.getByRole('listitem').filter({has: blankValue}).getByText('Ajouté', {exact: true})
  await expect(original).toHaveValue('125')
  await expect(page.getByRole('combobox', {name: 'Point de prélèvement à ajouter'})).toHaveCount(0)
  await expect(page.getByRole('button', {name: 'Ajouter le point'})).toHaveCount(0)
  await expect(blankValue).toHaveValue('')
  const pointMap = page.getByRole('complementary', {name: 'Carte des points de la déclaration'})
  await expect(pointMap.locator('[data-map-points]')).toHaveAttribute('data-map-points', '1')
  await expect(verify).toBeDisabled()
  await expect(addedBadge).toHaveCount(0)
  await fillMeasurement(page, '002', '5')
  await expect(addedBadge).toBeVisible()
  await expect(verify).toBeEnabled()
  await chooseMeasurementType(page, 'Volume')
  const blankVolume = quantity(page, '002', 'Volume')
  await expect(blankVolume).toHaveValue('5')
  await fillMeasurement(page, '002', '', 'Volume')
  await chooseMeasurementType(page, 'Relevé d’index')
  await expect(blankValue).toHaveValue('')
  await expect(addedBadge).toHaveCount(0)
  await expect(verify).toBeDisabled()
  await fillMeasurement(page, '001', '')
  await expect(removedBadge).toBeVisible()
  await expect(verify).toBeEnabled()
  await fillMeasurement(page, '001', '125')
  await expect(removedBadge).toHaveCount(0)
  await expect(verify).toBeDisabled()
  await fillMeasurement(page, '002', '0')
  await expect(addedBadge).toBeVisible()
  await page.getByLabel('Date du relevé d’index').fill('2026-09-18')
  await fillMeasurement(page, '001', '')
  await expect(removedBadge).toBeVisible()
  await verify.click()
  const review = correctionReview(page)
  await expect(review.getByRole('region')).toHaveCount(2)
  const originalPoint = reviewPoint(review, '001')
  const addedPoint = reviewPoint(review, '002')
  await expect(originalPoint.getByRole('heading', {level: 3})).toContainText('001')
  await expect(addedPoint.getByRole('heading', {level: 3})).toContainText('002')
  await expect(originalPoint.getByRole('table')).toHaveCount(0)
  await expect(addedPoint.getByRole('table')).toHaveCount(0)
  const removedPeriod = (await openPeriods(originalPoint)).getByRole('row').filter({hasText: '12/09/2026'})
  await expect(removedPeriod.locator('th, td').nth(1)).toHaveText(/^25\s*m³$/)
  await expect(removedPeriod.locator('th, td').nth(2)).toHaveText('Aucun')
  const addedPeriod = (await openPeriods(addedPoint)).getByRole('row').filter({hasText: '18/09/2026'})
  await expect(addedPeriod.locator('th, td').nth(1)).toHaveText('Aucun')
  await expect(addedPeriod.locator('th, td').nth(2)).toHaveText(/^0\s*m³$/)
  expect((await state()).entries.map(row => row.id)).toEqual([ids.row])
  await review.getByRole('button', {name: 'Confirmer la modification'}).click()
  await expect(page.getByText('La déclaration a été modifiée.')).toBeVisible()
  const updated = await state()
  expect(updated.entries).toHaveLength(1)
  expect(updated.entries[0]).toMatchObject({pointPrelevementId: ids.point, exploitationId: ids.secondExploitation, readingDate: '2026-09-18', value: 0})
  expect(updated.entries[0].id).not.toBe(ids.row)
  const submitted = updated.requests.filter(request => request.path.endsWith('/quick'))
  expect(submitted).toHaveLength(1)
  expect(submitted[0].body.entries[0]).not.toHaveProperty('id')
})

test('une vérification encore en cours ne peut confirmer la date précédente', async ({page, context}) => {
  const state = await session(context, 'DECLARANT')
  const edit = `${front}/saisie-en-ligne/${ids.declaration}/modifier`
  await page.goto(edit)
  const date = page.getByLabel('Date du relevé d’index')
  const verify = page.getByRole('button', {name: 'Vérifier les modifications'})
  const review = correctionReview(page)
  const confirm = review.getByRole('button', {name: 'Confirmer la modification'})
  await date.fill('2026-09-10')
  await verify.click()
  await expect(confirm).toBeEnabled()
  await review.getByRole('button', {name: 'Revenir à la saisie'}).click()

  const previous = Promise.withResolvers()
  const latest = Promise.withResolvers()
  const heldPreviews = new Map([['2026-09-09', previous], ['2026-09-14', latest]])
  await page.route(edit, async route => {
    const request = route.request()
    const [draft] = request.headers()['next-action'] ? request.postDataJSON() : []
    const hold = !draft?.previewToken && heldPreviews.get(draft?.readingDate)
    if (!hold) return route.fallback()
    const response = await route.fetch()
    await hold.promise
    await route.fulfill({response})
  })
  const lastPreviewDate = async () => (await state()).requests.filter(request => request.path.endsWith('/preview')).at(-1)?.body.readingDate
  try {
    await date.fill('2026-09-09')
    await expect.poll(lastPreviewDate).toBe('2026-09-09')
    await date.fill('2026-09-14')
    await verify.click()
    await expect(confirm).toBeDisabled()

    // Let the previous date arrive after the edit, while the latest date is still pending.
    const previousResponse = page.waitForResponse(response =>
      response.url() === edit && response.request().postDataJSON()?.[0]?.readingDate === '2026-09-09')
    previous.resolve()
    await previousResponse
    await expect.poll(lastPreviewDate).toBe('2026-09-14')
    await expect(confirm).toBeDisabled()
    await expect(review.getByRole('status')).toHaveText('Vérification des volumes en cours…')
    await expect(review.getByText(/Index supérieur au relevé suivant/)).toHaveCount(0)
  } finally {
    previous.resolve()
    latest.resolve()
  }
  await expect((await openPeriods(reviewPoint(review, '001'))).getByText('14/09/2026')).toBeVisible()
  await expect(review.getByText(/Index supérieur au relevé suivant/)).toHaveCount(0)
  await confirm.click()
  await expect(page.getByText('La déclaration a été modifiée.')).toBeVisible()
  expect((await state()).entries[0].readingDate).toBe('2026-09-14')
})

test('une date puis une période déplacent ensemble les mesures de deux points', async ({page, context}) => {
  const state = await session(context, 'DECLARANT', 'multi')
  const edit = `${front}/saisie-en-ligne/${ids.declaration}/modifier`
  const verify = page.getByRole('button', {name: 'Vérifier les modifications'})
  const review = correctionReview(page)
  await page.goto(edit)
  const date = page.getByLabel('Date du relevé d’index', {exact: true})
  await expect(date).toHaveValue('2026-09-12')
  const rows = page.getByRole('listitem').filter({has: page.getByRole('textbox', {name: /^Index \(m³\) —/})})
  await expect(rows).toHaveCount(2)
  await expect(quantity(page, '001')).toHaveValue('125')
  await expect(quantity(page, '002')).toHaveValue('230')
  const labelsInForm = await rows.getByRole('textbox', {name: /^Index \(m³\) —/}).evaluateAll(inputs =>
    inputs.map(input => input.getAttribute('aria-label').replace('Index (m³) — ', '')))
  await date.fill('2026-09-10')
  const warningGroups = page.locator('.fr-alert').filter({has: page.getByRole('heading', {name: 'Saisie à vérifier'})}).getByRole('region')
  await expect(warningGroups).toHaveCount(labelsInForm.length)
  for (const [index, label] of labelsInForm.entries()) {
    await expect(warningGroups.nth(index)).toHaveAccessibleName(label)
  }
  const map = page.getByRole('complementary', {name: 'Carte des points de la déclaration'})
  await expect(map).toBeVisible()
  await expect(map.locator('[data-map-points]')).toHaveAttribute('data-map-points', '2')
  await expect(map.locator('[data-map-ready="true"]')).toHaveAttribute('data-map-visible-count', '2', {timeout: 20_000})
  await expect(rows.locator('input[type=date]')).toHaveCount(0)
  await date.fill('2026-09-19')
  await expect(quantity(page, '001')).toHaveJSProperty('readOnly', true)
  await expect(quantity(page, '002')).toHaveJSProperty('readOnly', true)
  await verify.click()
  await expect(review.getByText('Date de relevé commune', {exact: true})).toHaveCount(1)
  await expect(review.getByRole('region')).toHaveCount(2)
  for (const point of await review.getByRole('region').all()) {
    await expect((await openPeriods(point)).getByText('19/09/2026')).toBeVisible()
  }
  await review.getByRole('button', {name: 'Confirmer la modification'}).click()
  await expect(page.getByText('La déclaration a été modifiée.')).toBeVisible()
  expect((await state()).entries.map(row => row.readingDate)).toEqual(['2026-09-19', '2026-09-19'])
  await page.goto(edit)
  await chooseMeasurementType(page, 'Volume')
  await chooseSeptemberPeriod(page, 3, 18)
  await verify.click()
  await expect(review.getByText('Période commune', {exact: true})).toHaveCount(1)
  await expect(review.getByRole('region')).toHaveCount(2)
  await review.getByRole('button', {name: 'Confirmer la modification'}).click()
  await expect(page.getByText('La déclaration a été modifiée.')).toBeVisible()
  expect((await state()).entries.map(row => [row.periodStartDate, row.periodEndDate])).toEqual([
    ['2026-09-03', '2026-09-18'], ['2026-09-03', '2026-09-18']
  ])
})

test('un dossier historique avec des dates différentes attend un choix commun explicite', async ({page, context}) => {
  const state = await session(context, 'DECLARANT', 'multi-legacy')
  await page.goto(`${front}/saisie-en-ligne/${ids.declaration}/modifier`)
  const date = page.getByLabel('Date du relevé d’index', {exact: true})
  await expect(date).toHaveValue('')
  const verify = page.getByRole('button', {name: 'Vérifier les modifications'})
  await expect(verify).toBeDisabled()
  await expect(quantity(page, '001')).toHaveValue('125')
  await expect(quantity(page, '002')).toHaveValue('230')
  await fillMeasurement(page, '001', '140')
  await expect(verify).toBeDisabled()
  expect((await state()).entries.map(row => row.readingDate)).toEqual(['2026-09-12', '2026-09-13'])
  await date.fill('2026-09-20')
  await verify.click()
  const review = correctionReview(page)
  await expect(review.getByRole('button', {name: 'Confirmer la modification'})).toBeEnabled()
  expect((await state()).requests.at(-1).body.readingDate).toBe('2026-09-20')
  expect((await state()).revision).toBe(0)
})
