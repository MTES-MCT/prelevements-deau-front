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
  const select = page.getByRole('combobox', {name: /Zone par défaut du tableau de bord/})
  const save = page.getByRole('button', {name: 'Enregistrer', exact: true})
  const confirmation = page.getByText('Zone enregistrée.', {exact: true})
  const cards = page.getByRole('article')
  await expect(cards.getByRole('button', {name: /email de rattachement/})).toHaveCount(0)
  await expect(cards.getByText(/Dernier envoi/)).toHaveCount(0)
  await expect(cards.getByRole('button', {name: setDefault})).toHaveCount(0)
  await expect(select).toHaveValue('')
  await expect(save).toHaveCount(0)
  for (const zone of zones) {
    await expect(cards.getByRole('heading', {name: zone.name})).toBeVisible()
    await select.selectOption({label: zone.name})
    await save.click()
    await expect(confirmation).toBeVisible()
    await expect(select).toHaveValue(zone.id)
    await expect(save).toHaveCount(0)
  }
  const {promise: scriptsReady, resolve: releaseScripts} = Promise.withResolvers()
  await page.route(/\/_next\/static\/chunks\/app\/agents\/[^/]+\/page-[^/]+\.js$/, async route => {
    await scriptsReady
    await route.fallback()
  })
  try {
    await page.reload({waitUntil: 'commit'})
    await expect(select).toHaveValue(zones[1].id)
    await expect(select).toBeDisabled()
  } finally {
    releaseScripts()
  }
  await select.selectOption('')
  await save.click()
  await expect(confirmation).toBeVisible()
  await page.reload()
  await expect(select).toHaveValue('')
  await expect(save).toHaveCount(0)
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
