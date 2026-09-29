import test from 'ava'

import {campaignSaveError} from './campaign-response-errors.js'

test('un refus de droits est expliqué sans afficher le code technique', t => {
  for (const result of [{code: 403, error: 'INSUFFICIENT_PERMISSIONS'}, {code: '403'}, {error: 'INSUFFICIENT_PERMISSIONS'}]) {
    t.is(campaignSaveError(result), 'Vous n’avez pas les droits pour enregistrer cette réponse. Vos saisies sont conservées ici.')
  }
})

test('les conflits et erreurs métier restent explicites', t => {
  t.is(campaignSaveError({code: 409, error: 'La réponse a été modifiée.'}), 'La réponse a été modifiée. Vos saisies sont conservées ici.')
  t.is(campaignSaveError({code: 400, error: 'Le compteur doit être vérifié.'}), 'Le compteur doit être vérifié.')
  t.is(campaignSaveError({}), 'La réponse n’a pas été enregistrée.')
})
