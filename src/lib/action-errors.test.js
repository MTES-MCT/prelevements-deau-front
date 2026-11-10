import test from 'ava'

import {createValidationError, ERROR_MESSAGES, getErrorMessage, getValidationErrors, isSuccessResponse, parseApiResponse, toErrorResult} from './action-errors.js'

const antivirus = 'L’analyse antivirus est temporairement indisponible. Aucun fichier du dépôt n’a été enregistré. Réessayez dans 30 secondes.'

test('le résultat Server Action conserve le 503 antivirus déclaré public', t => {
  const result = toErrorResult({code: 503, message: antivirus, messageIsPublic: true})
  t.false(result.success)
  t.is(result.error, antivirus)
  t.deepEqual(parseApiResponse(result), {isError: true, errorMessage: antivirus, validationErrors: []})
  t.is(getErrorMessage({code: 503, error: antivirus, messageIsPublic: true}), antivirus)
})

test('les 422 métier restent précis sous les deux formes message et error', t => {
  const message = 'Le fichier est protégé par un mot de passe. Envoyez une version lisible.'
  for (const key of ['message', 'error']) {
    t.is(getErrorMessage({code: 422, [key]: message}), message)
  }
})

test('les exceptions, pages HTML et détails internes ne sont jamais des messages de formulaire', t => {
  for (const error of [
    new Error('SELECT secret FROM credentials'),
    new TypeError('Cannot read properties of undefined'),
    {code: 500, message: 'internal secret', messageIsPublic: true},
    {code: 502, message: 'provider internal secret', messageIsPublic: true},
    {code: 503, message: 'BREVO_API_KEY manquant'},
    {code: 422, message: '<html>proxy failure</html>'},
    {code: 503, message: 'SELECT secret FROM credentials', messageIsPublic: true}
  ]) {
    t.true(Object.values(ERROR_MESSAGES).includes(getErrorMessage(error)))
  }
  const result = toErrorResult({code: 500, message: 'private', validationErrors: [{message: 'private'}], data: {sql: 'private'}})
  t.deepEqual(result.validationErrors, [])
  t.is(result.data, undefined)
})

test('les erreurs réseau et délais expliquent quoi faire sans annoncer une déconnexion ni un échec certain de sauvegarde', t => {
  for (const error of [new TypeError('Failed to fetch'), new TypeError('fetch failed'), {cause: {code: 'ECONNRESET'}}]) {
    t.is(getErrorMessage(error), ERROR_MESSAGES.network)
    t.not(toErrorResult(error).code, 401)
  }
  for (const error of [{name: 'TimeoutError'}, {name: 'AbortError'}, {code: 504}, {cause: {code: 'UND_ERR_HEADERS_TIMEOUT'}}]) {
    t.is(getErrorMessage(error), ERROR_MESSAGES.timeout)
    t.regex(getErrorMessage(error), /Vérifiez si votre demande a été enregistrée/)
  }
})

test('les validations locales et par champ restent exploitables', t => {
  t.is(toErrorResult(createValidationError('Aucun fichier fourni.')).error, 'Aucun fichier fourni.')
  const validationErrors = [{path: ['title'], message: 'Saisissez un titre.'}]
  const response = {success: false, code: 400, validationErrors}
  t.deepEqual(parseApiResponse(response), {isError: true, errorMessage: null, validationErrors})
  t.deepEqual(getValidationErrors({code: 400, validationErrors: {title: 'invalid'}}), [])
})

test('un échec explicite ou une réponse absente ne déclenche pas de réussite même sans indicateur', t => {
  for (const response of [null, undefined, false, '', 1, {success: false}, {error: 'échec'}, {id: 'document', success: false}, {code: 503}]) {
    t.true(parseApiResponse(response).isError)
    t.false(isSuccessResponse(response, null))
  }
  t.true(isSuccessResponse({id: 'document'}, 'id'))
  t.true(isSuccessResponse({deleted: true}, null))
  t.false(isSuccessResponse({}, 'id'))
})

test('les accès et les limites de fichiers ont une marche à suivre', t => {
  for (const code of [401, 403, 404, 409, 413, 415, 429]) {
    t.is(getErrorMessage({code}), ERROR_MESSAGES[code])
  }
  t.is(getErrorMessage({error: 'SESSION_EXPIRED'}), ERROR_MESSAGES[401])
  t.is(getErrorMessage({error: 'INSUFFICIENT_PERMISSIONS'}), ERROR_MESSAGES[403])
})
