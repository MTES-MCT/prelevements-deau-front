import test from 'ava'

import {getDeclarationNotificationCallbackUrl} from './declaration-notification-callback.js'

test('utilise l’URL publique configurée derrière le proxy', t => {
  const url = getDeclarationNotificationCallbackUrl({
    requestUrl: 'https://0.0.0.0:8080/callback-mail-relance',
    headers: new Headers(),
    configuredUrl: 'https://app.partageonsleau.beta.gouv.fr'
  })

  t.is(url.toString(), 'https://app.partageonsleau.beta.gouv.fr/mes-declarations/new')
})

test('utilise les en-têtes forwarded sans URL configurée', t => {
  const url = getDeclarationNotificationCallbackUrl({
    requestUrl: 'http://0.0.0.0:8080/callback-mail-relance',
    headers: new Headers({
      'x-forwarded-host': 'app.testing.partageonsleau.beta.gouv.fr',
      'x-forwarded-proto': 'https'
    })
  })

  t.is(url.toString(), 'https://app.testing.partageonsleau.beta.gouv.fr/mes-declarations/new')
})
