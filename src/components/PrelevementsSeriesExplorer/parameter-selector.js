/**
 * ParameterSelector Component
 *
 * Handles parameter selection with validation
 */

'use client'

import {Alert} from '@codegouvfr/react-dsfr/Alert'
import {Box} from '@mui/material'

import GroupedMultiselect from '@/components/ui/GroupedMultiselect/index.js'

const ParameterSelector = ({
  label,
  hint,
  placeholder,
  value,
  options,
  validationError,
  validationErrorTitle,
  onChange
}) => {
  if (options.length === 0) {
    return null
  }

  return (
    <Box sx={{position: 'relative', zIndex: 1}}>
      <GroupedMultiselect
        label={label}
        hint={hint}
        placeholder={placeholder}
        value={value}
        options={options}
        onChange={onChange}
      />
      {validationError && (
        <Alert
          severity='error'
          title={validationErrorTitle}
          description={validationError}
          className='mt-2'
        />
      )}
    </Box>
  )
}

export default ParameterSelector
