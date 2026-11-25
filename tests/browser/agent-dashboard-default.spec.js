import {randomUUID} from 'node:crypto'
import {test, expect} from '@playwright/test'
import {encode} from 'next-auth/jwt'
import {agentId, managerPermissions, zones} from '../../.github/scripts/agent-dashboard-default-fixtures.mjs'

const frontUrl = 'https://127.0.0.1:3443'
const setDefault = 'Définir comme zone par défaut'
const removeDefault = 'Ne plus utiliser cette zone par défaut'
const badge = 'Zone par défaut'
test.use({ignoreHTTPSErrors: true, reducedMotion: 'reduce'})

async function openAgent(page, context, role, path, {impersonating = false} = {}) {
  const token = await encode({
    secret: 'browser-tests-only-never-a-real-secret',
    token: {
      sub: 'acteur-test', token: `browser-test-agent-default-${role}-${impersonating ? 'impersonation-' : ''}${randomUUID()}`, role,
      impersonation: impersonating ? {active: true} : null,
      permissions: managerPermissions, userInfo: {id: 'acteur-test', email: 'acteur@example.test'},
      apiExpiresAt: new Date(Date.now() + 3_600_000).toISOString(), infoRefreshedAt: Date.now()
    },
    maxAge: 3600
  })
  await context.addCookies(['next-auth.session-token', '__Secure-next-auth.session-token'].map(name => ({
    name, value: token, url: frontUrl, httpOnly: true, secure: true, sameSite: 'Lax'
  })))
  await page.route('**/*', route => [frontUrl, 'http://127.0.0.1:3417'].includes(new URL(route.request().url()).origin)
    ? route.continue() : route.abort())
  await page.goto(frontUrl + path)
}

test('équipe PE : définir la première zone, la remplacer par la deuxième puis retirer le défaut', async ({page, context}) => {
  await openAgent(page, context, 'ADMIN', '/agents/' + agentId)
  await expect(page.getByRole('heading', {name: 'Accès aux zones'})).toBeVisible()
  const [first, second] = zones.map(zone => page.getByRole('article').filter({has: page.getByRole('heading', {name: zone.name})}))
  const badges = page.getByText(badge, {exact: true})
  await expect(first.getByRole('button', {name: setDefault})).toBeVisible()
  await expect(badges).toHaveCount(0)
  await first.getByRole('button', {name: setDefault}).click()
  await expect(first.getByText(badge, {exact: true})).toBeVisible()
  await second.getByRole('button', {name: setDefault}).click()
  await expect(second.getByText(badge, {exact: true})).toBeVisible()
  await expect(first.getByRole('button', {name: setDefault})).toBeVisible()
  await expect(badges).toHaveCount(1)
  await page.reload()
  await second.getByRole('button', {name: removeDefault}).click()
  await expect(second.getByRole('button', {name: setDefault})).toBeVisible()
  await page.reload()
  await expect(page.getByRole('button', {name: setDefault})).toHaveCount(2)
  await expect(badges).toHaveCount(0)
})

test('administrateur de zone : gérer le défaut sur sa fiche locale', async ({page, context}) => {
  await openAgent(page, context, 'INSTRUCTOR', '/zones/' + zones[0].id + '/agents/' + agentId)
  await expect(page.getByText('Accès à cette zone', {exact: true})).toBeVisible()
  await expect(page.getByText(zones[1].name, {exact: true})).toBeVisible()
  const set = page.getByRole('button', {name: setDefault})
  await expect(set).toHaveCount(1)
  await set.click()
  await expect(page.getByText(badge, {exact: true})).toBeVisible()
  await page.reload()
  await page.getByRole('button', {name: removeDefault}).click()
  await expect(set).toBeVisible()
  await page.reload()
  await expect(set).toBeVisible()
  await expect(page.getByText(badge, {exact: true})).toHaveCount(0)
})

test('prise de rôle : le badge de la fiche locale reste visible sans commande de modification', async ({page, context}) => {
  await openAgent(page, context, 'INSTRUCTOR', '/zones/' + zones[0].id + '/agents/' + agentId, {impersonating: true})
  await expect(page.getByRole('status').filter({hasText: 'Vous prenez la place de'})).toBeVisible()
  await expect(page.getByText(badge, {exact: true})).toBeVisible()
  await expect(page.getByRole('button', {name: setDefault})).toHaveCount(0)
  await expect(page.getByRole('button', {name: removeDefault})).toHaveCount(0)
})
