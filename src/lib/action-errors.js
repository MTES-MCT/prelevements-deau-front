export const ERROR_MESSAGES = {
  unexpected: 'Le service rencontre un problème. Réessayez dans quelques instants. Si le problème persiste, contactez l’assistance.',
  network: 'Impossible de joindre le service. Vérifiez votre connexion Internet, puis réessayez. Si vous venez d’envoyer un formulaire, vérifiez d’abord si votre demande a été enregistrée.',
  timeout: 'Le service met trop de temps à répondre. Vérifiez si votre demande a été enregistrée avant de réessayer.',
  invalidResponse: 'Le service n’a pas pu confirmer le résultat. Vérifiez si votre demande a été enregistrée avant de réessayer.',
  400: 'Certaines informations sont invalides ou manquantes. Vérifiez les champs du formulaire, puis réessayez.',
  401: 'Votre session a expiré. Reconnectez-vous pour continuer.',
  403: 'Vous n’avez pas les droits nécessaires pour cette action. Contactez la personne qui gère vos accès.',
  404: 'Cet élément est introuvable ou a été supprimé. Revenez à la liste pour vérifier qu’il existe encore.',
  409: 'Les informations ont changé ou cet élément existe déjà. Vérifiez la liste avant de réessayer.',
  413: 'Le fichier ou l’ensemble des fichiers dépasse la taille autorisée. Réduisez leur taille ou envoyez-les séparément.',
  415: 'Ce format de fichier n’est pas accepté. Choisissez l’un des formats indiqués dans le formulaire.',
  422: 'Le fichier ou les informations envoyées ne peuvent pas être traités. Vérifiez leur contenu avant de réessayer.',
  429: 'Trop de demandes ont été envoyées. Patientez quelques instants avant de réessayer.',
  503: 'Le service est temporairement indisponible. Réessayez dans quelques instants. Si le problème persiste, contactez l’assistance.'
}

const timeoutCodes = new Set(['ETIMEDOUT', 'ABORT_ERR', 'UND_ERR_CONNECT_TIMEOUT', 'UND_ERR_HEADERS_TIMEOUT', 'UND_ERR_BODY_TIMEOUT'])
const networkCodes = new Set(['ECONNRESET', 'ECONNREFUSED', 'ENOTFOUND', 'EAI_AGAIN', 'ENETUNREACH', 'UND_ERR_SOCKET'])

// Public messages are plain text. Never turn an upstream HTML page or a stack
// trace into form feedback, even when a response claims to be a business error.
function readableMessage(value) {
  if (typeof value !== 'string' || !value.trim() || value.length > 2000
    || [...value].some(character => character.codePointAt(0) < 32)
    || /[<>]|\b(?:SQLSTATE|SQLITE_\w*|SELECT\s.+\sFROM|INSERT\s+INTO|DELETE\s+FROM|UPDATE\s.+\sSET|(?:Type|Reference|Syntax)Error:)/i.test(value)) {
    return null
  }

  return value.trim()
}

export function getErrorMessage(error) {
  const status = Number(error?.code || error?.status || error?.statusCode)
  const causeCode = error?.cause?.code || error?.code

  if (error?.name === 'TimeoutError' || error?.name === 'AbortError' || timeoutCodes.has(causeCode) || status === 408 || status === 504) {
    return ERROR_MESSAGES.timeout
  }

  if (networkCodes.has(causeCode) || /^(?:fetch failed|Failed to fetch|NetworkError when attempting to fetch resource\.?|Load failed)$/i.test(error?.message || '')) {
    return ERROR_MESSAGES.network
  }

  if (error?.code === 'INVALID_RESPONSE') {
    return ERROR_MESSAGES.invalidResponse
  }

  if (status === 401 || error?.error === 'SESSION_EXPIRED' || error?.message === 'UNAUTHORIZED') {
    return ERROR_MESSAGES[401]
  }

  if (status === 403 || error?.error === 'INSUFFICIENT_PERMISSIONS') {
    return ERROR_MESSAGES[403]
  }

  const message = readableMessage(error?.error) || readableMessage(error?.message)
  // 500 is always unexpected. Other 5xx messages need an explicit public
  // contract from the API; status alone cannot make an exception safe to show.
  if (status >= 500) {
    return (status === 503 && error?.messageIsPublic === true && message)
      || ERROR_MESSAGES[status] || ERROR_MESSAGES.unexpected
  }

  if ((status >= 400 && status < 500) || error?.messageIsPublic === true) {
    return message || ERROR_MESSAGES[status] || ERROR_MESSAGES.unexpected
  }

  return ERROR_MESSAGES.unexpected
}

export function getValidationErrors(error) {
  const status = Number(error?.code || error?.status || error?.statusCode)
  const errors = error?.validationErrors ?? error?.data?.validationErrors
  if (status >= 500 || !Array.isArray(errors)) return []
  return errors.filter(item => readableMessage(item?.message)).map(item => ({...item, message: item.message.trim()}))
}

export function createValidationError(message) {
  const error = new Error(message)
  error.code = 400
  return error
}

export function parseApiResponse(response) {
  const status = Number(response?.code || response?.status)
  const validationErrors = getValidationErrors(response)
  const isError = !response || typeof response !== 'object' || response instanceof Error
    || response.success === false || Boolean(response.error) || status >= 400 || validationErrors.length > 0
  return {
    isError,
    errorMessage: isError ? (validationErrors.length ? null : getErrorMessage(response)) : null,
    validationErrors
  }
}

export function isSuccessResponse(response, successIndicator = '_id') {
  return !parseApiResponse(response).isError && (!successIndicator || Boolean(response?.[successIndicator]))
}

export function toErrorResult(error) {
  const status = Number(error?.code || error?.status || error?.statusCode)
  return {
    success: false,
    error: getErrorMessage(error),
    code: error?.code,
    messageIsPublic: true,
    validationErrors: getValidationErrors(error),
    // Conflict/validation metadata is used by forms. Internal 5xx details stay
    // on the server and cannot cross the Server Action serialization boundary.
    data: status >= 400 && status < 500 ? error?.data : undefined
  }
}
