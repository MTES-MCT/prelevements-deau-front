import {Alert} from '@codegouvfr/react-dsfr/Alert'

/**
 * Reusable component for displaying form errors
 * @param {Object} props
 * @param {string} props.error - General error message
 * @param {Array} props.validationErrors - Array of validation errors
 * @param {Function} props.onClose - Optional callback to clear errors
 */
const FormErrors = ({error, validationErrors = [], onClose}) => {
  if (!error && validationErrors.length === 0) {
    return null
  }

  // Display validation errors
  if (validationErrors.length > 0) {
    const description = validationErrors.length === 1
      ? validationErrors[0].message
      : (
        <ul className='list-disc pl-4 mt-2'>
          {validationErrors.map((err, index) => (
            <li key={err.path || index}>{err.message}</li>
          ))}
        </ul>
      )

    return (
      <Alert
        className='my-4'
        closable={Boolean(onClose)}
        description={description}
        severity='error'
        title={validationErrors.length === 1 ? 'Erreur de validation' : 'Erreurs de validation'}
        onClose={onClose}
      />
    )
  }

  // Display general error
  return (
    <Alert
      className='my-4'
      closable={Boolean(onClose)}
      description={error}
      severity='error'
      title='Erreur'
      onClose={onClose}
    />
  )
}

export default FormErrors
