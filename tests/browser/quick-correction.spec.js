import {randomUUID} from 'node:crypto'
import {expect, test} from '@playwright/test'
import {encode} from 'next-auth/jwt'
import {ids} from '../../.github/scripts/quick-correction-fixtures.mjs'

const front = 'https://127.0.0.1:3443'
test.use({ignoreHTTPSErrors: true})

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
  await day.fill('2026-09-15')
  await expect(page.getByRole('button', {name: 'Contacter l’équipe PE'})).toHaveCount(0)
  await page.getByRole('button', {name: 'Vérifier les modifications'}).click()
  const review = page.getByRole('dialog', {name: 'Vérifiez les volumes modifiés'})
  await expect(review.getByRole('cell', {name: /15\/09\/2026/})).toBeVisible()
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
  const review = page.getByRole('dialog', {name: 'Vérifiez les volumes modifiés'})
  await expect(review.getByRole('cell', {name: /01\/09\/2026 au 16\/09\/2026/})).toBeVisible()
  await review.getByRole('button', {name: 'Revenir à la saisie'}).click()
  await page.getByLabel('Fin de période').fill('2026-09-20')
  await verify.click()
  await expect(review.getByRole('cell', {name: /01\/09\/2026 au 20\/09\/2026/})).toBeVisible()
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
  await session(context, 'INSTRUCTOR')
  await page.goto(detail)
  await expect(page.getByRole('link', {name: 'Modifier la déclaration'})).toHaveCount(0)
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
  const review = page.getByRole('dialog', {name: 'Vérifiez les volumes modifiés'})
  const confirm = review.getByRole('button', {name: 'Confirmer la modification'})
  await expect(confirm).toBeDisabled()
  await expect(review.getByRole('cell', {name: /14\/09\/2026/})).toBeVisible()
  await expect(review.getByText(/Index supérieur au relevé suivant/)).toHaveCount(0)
  await confirm.click()
  await expect(page.getByText('La déclaration a été modifiée.')).toBeVisible()
  expect((await state()).entries[0].readingDate).toBe('2026-09-14')
})
