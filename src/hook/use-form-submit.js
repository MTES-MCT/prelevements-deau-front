import {useCallback, useState} from 'react'

/**
 * Parse API response and extract error information
 * @param {Object} response - API response object
 * @returns {Object} Parsed error info with { isError, errorMessage, validationErrors }
 */
const parseApiResponse = response => {
  // Check for HTTP error codes
  const statusCode = response.code || response.status

  if (statusCode >= 500) {
    return {
      isError: true,
      errorMessage: 'Une erreur serveur est survenue. Veuillez réessayer ultérieurement.',
      validationErrors: []
    }
  }

  if (statusCode === 401) {
    return {
      isError: true,
      errorMessage: 'Votre session a expiré. Veuillez vous reconnecter.',
      validationErrors: []
    }
  }

  if (statusCode === 403) {
    return {
      isError: true,
      errorMessage: 'Vous n\'avez pas les droits nécessaires pour effectuer cette action.',
      validationErrors: []
    }
  }

  if (statusCode === 404) {
    return {
      isError: true,
      errorMessage: 'La ressource demandée n\'existe pas ou a été supprimée.',
      validationErrors: []
    }
  }

  if (statusCode === 409) {
    return {
      isError: true,
      errorMessage: response.message || 'Un conflit est survenu. La ressource existe peut-être déjà.',
      validationErrors: []
    }
  }

  if (statusCode === 400) {
    return {
      isError: true,
      errorMessage: response.validationErrors ? null : (response.message || 'Données invalides.'),
      validationErrors: response.validationErrors || []
    }
  }

  // Generic error for other 4xx codes
  if (statusCode >= 400) {
    return {
      isError: true,
      errorMessage: response.message || 'Une erreur est survenue.',
      validationErrors: []
    }
  }

  // No error
  return {
    isError: false,
    errorMessage: null,
    validationErrors: []
  }
}

/**
 * Check if response indicates success
 * @param {Object} response - API response object
 * @param {string} successIndicator - Property name that indicates success (e.g., '_id')
 * @returns {boolean}
 */
const isSuccessResponse = (response, successIndicator = '_id') => {
  const {isError} = parseApiResponse(response)
  if (isError) {
    return false
  }

  // If a success indicator is specified, check for it
  if (successIndicator && !response[successIndicator]) {
    return false
  }

  return true
}

/**
 * Hook for handling form submissions with consistent error handling
 * @returns {Object} Form submit utilities
 */
const useFormSubmit = () => {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState(null)
  const [validationErrors, setValidationErrors] = useState([])

  /**
   * Reset all error states
   */
  const resetErrors = useCallback(() => {
    setError(null)
    setValidationErrors([])
  }, [])

  /**
   * Handle API response and update error states
   * @param {Object} response - API response
   * @param {Object} options - Options
   * @param {string} options.successIndicator - Property indicating success (default: '_id')
   * @param {Function} options.onSuccess - Callback on success
   * @param {Function} options.onError - Callback on error
   * @returns {boolean} True if successful, false otherwise
   */
  const handleResponse = useCallback(async (response, options = {}) => {
    const {
      successIndicator = '_id',
      onSuccess,
      onError
    } = options

    const {isError, errorMessage, validationErrors: valErrors} = parseApiResponse(response)

    if (isError) {
      setError(errorMessage)
      setValidationErrors(valErrors)
      onError?.(response)
      return false
    }

    // Check success indicator
    if (successIndicator && !response[successIndicator]) {
      setError('Réponse inattendue du serveur.')
      onError?.(response)
      return false
    }

    onSuccess?.(response)
    return true
  }, [])

  /**
   * Wrap an async submit function with loading state and error handling
   * @param {Function} submitFn - Async function that returns API response
   * @param {Object} options - Options for handleResponse
   * @returns {Function} Wrapped submit function
   */
  const withSubmit = useCallback((submitFn, options = {}) => async (...args) => {
    resetErrors()
    setIsSubmitting(true)

    try {
      const response = await submitFn(...args)
      return handleResponse(response, options)
    } catch (error_) {
      setError(error_.message || 'Une erreur inattendue est survenue.')
      options.onError?.(error_)
      return false
    } finally {
      setIsSubmitting(false)
    }
  }, [resetErrors, handleResponse])

  /**
   * Get field-specific error message
   * @param {string} field - Field name to check
   * @returns {string|undefined} Error message if exists
   */
  const getFieldError = useCallback(field => {
    const fieldError = validationErrors.find(e => e.path?.includes(field))
    return fieldError?.message
  }, [validationErrors])

  return {
    isSubmitting,
    error,
    validationErrors,
    setError,
    setValidationErrors,
    resetErrors,
    handleResponse,
    withSubmit,
    getFieldError,
    // Re-export utilities for direct use
    parseApiResponse,
    isSuccessResponse
  }
}

export default useFormSubmit
export {parseApiResponse, isSuccessResponse}
