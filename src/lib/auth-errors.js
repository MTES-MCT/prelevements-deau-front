/**
 * Map HTTP status codes to error reasons for user-friendly messages
 * @param {number} status - HTTP status code
 * @param {object} data - Response data from backend
 * @returns {string} Error reason code
 */
export function getErrorReason(status, data) {
  switch (status) {
    case 400: {
      return 'missing_params'
    }

    case 401: {
      return data?.message?.includes('expiré') ? 'expired' : 'invalid_token'
    }

    case 403: {
      return 'invalid_territoire'
    }

    case 404: {
      return 'territoire_not_found'
    }

    default: {
      return 'server_error'
    }
  }
}
