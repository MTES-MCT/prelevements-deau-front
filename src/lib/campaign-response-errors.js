export function campaignSaveError(result) {
  if (Number(result.code) === 403 || result.error === 'INSUFFICIENT_PERMISSIONS') {
    return 'Vous n’avez pas les droits pour enregistrer cette réponse. Vos saisies sont conservées ici.'
  }
  return `${result.error || 'La réponse n’a pas été enregistrée.'}${Number(result.code) === 409 ? ' Vos saisies sont conservées ici.' : ''}`
}
