import {randomUUID} from 'node:crypto'
import {expect, test} from '@playwright/test'
import {encode} from 'next-auth/jwt'
import {ids} from '../../.github/scripts/quick-correction-fixtures.mjs'

const front = 'https://127.0.0.1:3443'
test.use({ignoreHTTPSErrors: true})

const correctionReview = page => page.getByRole('dialog', {name: 'Vérifiez vos modifications'})
const reviewPoint = (review, code) => review.getByRole('region', {name: new RegExp(`Forage des Prés.*${code}`)})

async function openPeriods(point) {
  const details = point.locator('details')
  const summary = details.locator('summary')
  await expect(summary).toHaveText('Détail des périodes')
  if (await details.getAttribute('open') === null) await summary.click()
  const table = details.getByRole('table')
  await expect(table.getByRole('columnheader')).toHaveText(['Période', 'Avant', 'Après', 'Écart'])
  return table
}

async function session(context, role) {
  const apiToken = `browser-test-quick-correction-${role}-${randomUUID()}`
  const value = await encode({secret: 'browser-tests-only-never-a-real-secret', maxAge: 3600, token: {
    sub: ids.user, token: apiToken, role, declarantRole: 'PRELEVEUR', permissions: [],
    apiExpiresAt: new Date(Date.now() + 3600000).toISOString(), infoRefreshedAt: Date.now(), userInfo: {id: ids.user}
  }})
  await context.addCookies(['next-auth.session-token', '__Secure-next-auth.session-token'].map(name => ({
    name, value, url: front, httpOnly: true, secure: true, sameSite: 'Lax'
  })))
  return async () => (await context.request.get('http://127.0.0.1:3431/api/__quick-correction', {
    headers: {authorization: `Bearer ${apiToken}`, connection: 'close'}
  })).json()
}

test.beforeEach(async ({page}) => {
  await page.clock.setFixedTime(new Date('2026-09-22T12:00:00Z'))
  await page.route('**/*', route => new URL(route.request().url()).hostname === '127.0.0.1' ? route.continue() : route.abort())
})

test('le préleveur déplace son index, contacte PE et confirme uniquement la dernière date', async ({page, context}) => {
  const state = await session(context, 'DECLARANT')
  await page.goto(`${front}/mes-declarations/${ids.declaration}`)
  await page.getByRole('link', {name: 'Modifier ma déclaration'}).click()
  await page.getByRole('button', {name: 'Modifier la saisie de Forage des Prés'}).click()
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

test('l’administrateur peut convertir et retirer la dernière ligne, l’agent reste en lecture', async ({page, context}) => {
  const state = await session(context, 'ADMIN')
  const detail = `${front}/declarations/${ids.source}`
  await page.goto(detail)
  await page.getByRole('link', {name: 'Modifier la déclaration'}).click()
  const volume = page.getByRole('radio', {name: 'Volume', exact: true})
  await volume.focus()
  await volume.press('Space')
  await expect(page.getByLabel('Volume (m³)', {exact: true})).toHaveValue('125')
  await page.getByLabel('Début de période').fill('2026-09-01')
  await page.getByLabel('Fin de période').fill('2026-09-16')
  const verify = page.getByRole('button', {name: 'Vérifier les modifications'})
  await verify.click()
  const review = correctionReview(page)
  const point = reviewPoint(review, '001')
  await expect((await openPeriods(point)).getByText(/01\/09\/2026 au 16\/09\/2026/)).toBeVisible()
  await review.getByRole('button', {name: 'Revenir à la saisie'}).click()
  await page.getByLabel('Fin de période').fill('2026-09-20')
  await verify.click()
  await expect((await openPeriods(point)).getByText(/01\/09\/2026 au 20\/09\/2026/)).toBeVisible()
  await review.getByRole('button', {name: 'Confirmer la modification'}).click()
  await expect(page.getByText('La déclaration a été modifiée.')).toBeVisible()
  expect((await state()).measurementType).toBe('VOLUME')
  await page.getByRole('link', {name: 'Modifier la déclaration'}).click()
  await page.getByRole('button', {name: 'Supprimer la saisie de Forage des Prés'}).click()
  await verify.click()
  await review.getByRole('button', {name: 'Confirmer la modification'}).click()
  await expect(page.getByText('Sans mesure active', {exact: true}).first()).toBeVisible()
  expect((await state()).entries).toEqual([])
  await expect(page.getByRole('link', {name: 'Modifier la déclaration'})).toHaveCount(0)
  await page.goto(`${front}/saisie-en-ligne/${ids.declaration}/modifier`)
  await expect(page.getByText('Cette déclaration ne contient plus de mesure active.')).toBeVisible()
  await expect(page.getByRole('button', {name: 'Ajouter le point'})).toHaveCount(0)
  await session(context, 'INSTRUCTOR')
  await page.goto(detail)
  await expect(page.getByRole('link', {name: 'Modifier la déclaration'})).toHaveCount(0)
})

test('un ajout à zéro remplace un comptage retiré du même point après validation du brouillon', async ({page, context}) => {
  const state = await session(context, 'DECLARANT')
  const select = page.getByRole('combobox', {name: 'Point de prélèvement à ajouter'})
  const add = page.getByRole('button', {name: 'Ajouter le point'})
  const verify = page.getByRole('button', {name: 'Vérifier les modifications'})
  const original = page.getByRole('group', {name: /Forage des Prés.*001/})
  const added = page.getByRole('group', {name: /Forage des Prés.*002/})

  const scripts = Promise.withResolvers()
  await page.route('**/_next/static/**/*.js*', async route => {
    await scripts.promise
    await route.fallback()
  })
  try {
    await page.goto(`${front}/saisie-en-ligne/${ids.declaration}/modifier`, {waitUntil: 'commit'})
    await expect(select).toBeVisible()
    await expect(select).toBeDisabled()
  } finally {
    scripts.resolve()
  }
  await expect(select).toBeEnabled()
  await select.selectOption(ids.secondExploitation)
  await expect(add).toBeEnabled()
  await add.click()
  await expect(added.getByLabel('Date du relevé d’index')).toHaveValue('')
  await expect(verify).toBeDisabled()
  await added.getByRole('button', {name: /Annuler l’ajout/}).click()
  await expect(added).toHaveCount(0)
  await expect(verify).toBeDisabled()

  await original.getByRole('button', {name: /Supprimer la saisie/}).click()
  await select.selectOption(ids.exploitation)
  await add.click()
  await expect(original.getByLabel('Index (m³)', {exact: true})).toHaveValue('125')
  await expect(verify).toBeDisabled()

  await select.selectOption(ids.secondExploitation)
  await add.click()
  await added.getByLabel('Index (m³)', {exact: true}).fill('0')
  await added.getByLabel('Date du relevé d’index').fill('2026-09-18')
  await original.getByRole('button', {name: /Supprimer la saisie/}).click()
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
  await page.goto(`${front}/saisie-en-ligne/${ids.declaration}/modifier`)
  await page.getByRole('button', {name: 'Modifier la saisie de Forage des Prés'}).click()
  const date = page.getByLabel('Date du relevé d’index')
  await date.fill('2026-09-09')
  await expect.poll(async () => (await state()).requests.at(-1)?.body.entries?.[0].readingDate).toBe('2026-09-09')
  await date.fill('2026-09-14')
  await page.getByRole('button', {name: 'Vérifier les modifications'}).click()
  const review = correctionReview(page)
  const confirm = review.getByRole('button', {name: 'Confirmer la modification'})
  await expect(confirm).toBeDisabled()
  await expect((await openPeriods(reviewPoint(review, '001'))).getByText('14/09/2026')).toBeVisible()
  await expect(review.getByText(/Index supérieur au relevé suivant/)).toHaveCount(0)
  await confirm.click()
  await expect(page.getByText('La déclaration a été modifiée.')).toBeVisible()
  expect((await state()).entries[0].readingDate).toBe('2026-09-14')
})
