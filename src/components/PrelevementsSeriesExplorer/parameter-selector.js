/**
 * ParameterSelector Component
 *
 * Wrapper around the grouped multiselect widget for choosing parameters.
 */

'use client'

import {Box} from '@mui/material'

import GroupedMultiselect from '@/components/ui/GroupedMultiselect/index.js'

const ParameterSelector = ({
  label,
  hint,
  placeholder,
  value,
  options,
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
    </Box>
  )
}

export default ParameterSelector
