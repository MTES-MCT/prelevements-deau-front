import {createHash, randomUUID} from 'node:crypto'
import {test, expect} from '@playwright/test'
import {encode} from 'next-auth/jwt'
import {documentUploadId, documentUploadErrors} from '../../.github/scripts/document-upload-fixtures.mjs'

const frontUrl = 'https://127.0.0.1:3443'
const pagePath = `/declarants/${documentUploadId}/documents/new`
test.use({ignoreHTTPSErrors: true})
test.beforeEach(async ({page}) => {
  await page.route('**/*', route => [frontUrl, 'http://127.0.0.1:3417'].includes(new URL(route.request().url()).origin)
    ? route.continue() : route.abort())
})

async function authenticate(context, scenario) {
  const apiToken = `browser-test-document-upload-${scenario}-${randomUUID()}`
  const token = await encode({secret: 'browser-tests-only-never-a-real-secret', maxAge: 3600, token: {
    sub: documentUploadId, token: apiToken, role: 'ADMIN', permissions: [],
    apiExpiresAt: new Date(Date.now() + 3_600_000).toISOString(), infoRefreshedAt: Date.now(),
    userInfo: {id: documentUploadId, email: 'document@example.test'}
  }})
  await context.addCookies(['next-auth.session-token', '__Secure-next-auth.session-token'].map(name => ({
    name, value: token, url: frontUrl, httpOnly: true, secure: true, sameSite: 'Lax'
  })))
  return apiToken
}

async function getAttempts(context, apiToken) {
  const response = await context.request.get('http://127.0.0.1:3431/api/__document-upload-attempts', {
    headers: {authorization: `Bearer ${apiToken}`}
  })
  expect(response.ok()).toBe(true)
  return response.json()
}

for (const [scenario, error] of Object.entries(documentUploadErrors)) {
  test(`document : erreur ${error.code} lisible, fichier et saisie conservés sans déconnexion`, async ({page, context}, testInfo) => {
    const token = await authenticate(context, scenario)
    const pageErrors = []
    page.on('pageerror', error => pageErrors.push(error.message))
    await page.goto(frontUrl + pagePath)
    await expect(page.getByRole('heading', {name: 'Ajouter un document', exact: true})).toBeVisible()
    const file = {name: 'autorisation-synthetique.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4\nDocument synthétique pour test navigateur.\n%%EOF')}
    // The native chooser opens only once the React button handler is ready.
    const chooserReady = page.waitForEvent('filechooser')
    await page.getByRole('button', {name: 'Parcourir les fichiers', exact: true}).click()
    await (await chooserReady).setFiles(file)
    await expect(page.getByLabel('Titre', {exact: true})).toHaveValue(file.name)
    await page.getByLabel('Titre', {exact: true}).fill('Autorisation à conserver')
    await page.getByLabel('Référence', {exact: true}).fill('REF-SYNTHETIQUE')
    await page.getByLabel('Nature *', {exact: true}).selectOption('Autorisation AOT')
    await page.getByLabel('Date de signature *', {exact: true}).fill('2026-10-01')
    await page.getByLabel('Date de fin de validité', {exact: true}).fill('2027-10-01')
    await page.getByLabel('Commentaire', {exact: true}).fill('Saisie conservée après refus.')
    const submit = page.getByRole('button', {name: 'Associer au déclarant', exact: true})
    await submit.click()
    await expect(page.getByText(error.message, {exact: true})).toBeVisible()
    await expect(page).toHaveURL(frontUrl + pagePath)
    await expect(page.getByText(file.name, {exact: true})).toBeVisible()
    await expect(page.getByLabel('Titre', {exact: true})).toHaveValue('Autorisation à conserver')
    await expect(page.getByLabel('Référence', {exact: true})).toHaveValue('REF-SYNTHETIQUE')
    await expect(page.getByLabel('Nature *', {exact: true})).toHaveValue('Autorisation AOT')
    await expect(page.getByLabel('Date de signature *', {exact: true})).toHaveValue('2026-10-01')
    await expect(page.getByLabel('Date de fin de validité', {exact: true})).toHaveValue('2027-10-01')
    await expect(page.getByLabel('Commentaire', {exact: true})).toHaveValue('Saisie conservée après refus.')
    await expect(submit).toBeEnabled()
    await page.screenshot({path: testInfo.outputPath(`document-erreur-${error.code}.png`), fullPage: true})

    // A second real Server Action must resend the retained bytes and form values.
    await submit.click()
    await expect.poll(async () => (await getAttempts(context, token)).length).toBe(2)
    await expect(page.getByText(error.message, {exact: true})).toBeVisible()
    const attempts = await getAttempts(context, token)
    expect(attempts[0]).toEqual({
      fields: {title: 'Autorisation à conserver', reference: 'REF-SYNTHETIQUE', nature: 'Autorisation AOT',
        signatureDate: '2026-10-01', validityEndDate: '2027-10-01', comment: 'Saisie conservée après refus.'},
      file: {name: file.name, type: file.mimeType, size: file.buffer.length,
        sha256: createHash('sha256').update(file.buffer).digest('hex')}
    })
    expect(attempts[1]).toEqual(attempts[0])
    await expect(page).toHaveURL(frontUrl + pagePath)
    const session = await context.request.get(frontUrl + '/auth/nextauth/session')
    expect((await session.json()).user.email).toBe('document@example.test')
    expect(pageErrors).toEqual([])
  })
}
