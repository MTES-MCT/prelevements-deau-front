import {getErrorMessage, getValidationErrors} from '@/lib/action-errors.js'

export async function readApiResponse(response, {blob = false} = {}) {
  if (response.ok && blob) return response.blob()

  const text = await response.text()
  let data = null
  let invalidJSON = false
  if (text) {
    try {data = JSON.parse(text)} catch {invalidJSON = true}
  }

  if (!response.ok || invalidJSON) {
    const details = {
      code: response.ok ? 'INVALID_RESPONSE' : response.status,
      message: data?.message,
      messageIsPublic: data?.messageIsPublic === true,
      validationErrors: data?.validationErrors
    }
    const error = new Error(getErrorMessage(details))
    error.code = details.code
    error.messageIsPublic = true
    error.validationErrors = getValidationErrors(details)
    error.data = response.status >= 400 && response.status < 500 ? data : undefined
    throw error
  }

  return data
}
