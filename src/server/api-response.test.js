import test from 'ava'

import {ERROR_MESSAGES, toErrorResult} from '@/lib/action-errors.js'
import {readApiResponse} from './api-response.js'

const jsonResponse = (status, body) => new Response(JSON.stringify(body), {status, headers: {'Content-Type': 'application/json'}})

test('un message 503 public traverse la réponse HTTP et le résultat Server Action', async t => {
  const message = 'L’analyse antivirus est indisponible. Réessayez dans 30 secondes.'
  const error = await t.throwsAsync(readApiResponse(jsonResponse(503, {code: 503, message, messageIsPublic: true})))
  t.is(error.code, 503)
  t.is(toErrorResult(error).error, message)
})

test('les erreurs HTML et les 5xx non publics sont masqués pour JSON et les téléchargements', async t => {
  for (const blob of [false, true]) {
    for (const response of [new Response('<html>nginx internal error</html>', {status: 502}), jsonResponse(503, {message: 'BREVO_API_KEY', data: {secret: 'hidden'}})]) {
      const error = await t.throwsAsync(readApiResponse(response, {blob}))
      t.true([ERROR_MESSAGES.unexpected, ERROR_MESSAGES[503]].includes(error.message))
      t.is(error.data, undefined)
    }
  }
})

test('une réponse non JSON présentée comme réussie ne devient pas une fausse réussite', async t => {
  const error = await t.throwsAsync(readApiResponse(new Response('<html>gateway page</html>')))
  t.is(error.code, 'INVALID_RESPONSE')
  t.is(error.message, ERROR_MESSAGES.invalidResponse)
})

test('les erreurs métier gardent validation et métadonnées de conflit', async t => {
  const details = {code: 409, message: 'Ce point a été modifié.', data: {code: 'COLLECTOR_RESOURCE_CHANGED'}}
  const error = await t.throwsAsync(readApiResponse(jsonResponse(409, details)))
  t.is(error.message, details.message)
  t.deepEqual(error.data, details)
  const fields = [{path: ['title'], message: 'Saisissez un titre.'}]
  const validation = await t.throwsAsync(readApiResponse(jsonResponse(400, {validationErrors: fields})))
  t.deepEqual(validation.validationErrors, fields)
})

test('les succès JSON, réponses vides et téléchargements sont conservés', async t => {
  t.deepEqual(await readApiResponse(jsonResponse(200, {id: 'document'})), {id: 'document'})
  t.is(await readApiResponse(new Response(null, {status: 204})), null)
  const file = await readApiResponse(new Response('document'), {blob: true})
  t.is(await file.text(), 'document')
})
