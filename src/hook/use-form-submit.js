import {useCallback, useState} from 'react'

import {ERROR_MESSAGES, getErrorMessage, getValidationErrors, parseApiResponse, isSuccessResponse} from '@/lib/action-errors.js'

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
      setError(ERROR_MESSAGES.invalidResponse)
      onError?.(response)
      return false
    }

    await onSuccess?.(response)
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
      return await handleResponse(response, options)
    } catch (error_) {
      setError(getErrorMessage(error_))
      setValidationErrors(getValidationErrors(error_))
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
