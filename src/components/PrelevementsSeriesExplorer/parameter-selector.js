/**
 * ParameterSelector Component
 *
 * Wrapper around the grouped multiselect widget for choosing parameters.
 */

'use client'

import {Box, Typography} from '@mui/material'

import GroupedMultiselect from '@/components/ui/GroupedMultiselect/index.js'

const ParameterSelector = ({
  label,
  hint,
  placeholder,
  value,
  options,
  onChange,
  onOpen,
  loading = false,
  error
}) => {
  if (options.length === 0) {
    return null
  }

  return (
    <Box sx={{position: 'relative', zIndex: 1}}>
      <GroupedMultiselect
        searchable={options.some(group => group.label === 'Index')}
        label={label}
        hint={hint}
        placeholder={placeholder}
        value={value}
        options={options}
        onChange={onChange}
        onOpen={onOpen}
        popupHeader={loading
          ? <Typography role='status' variant='body2' color='text.secondary'>Chargement des index…</Typography>
          : error ? <div role='alert' className='fr-text--sm'>
            {error}{' '}
            <button type='button' className='fr-btn fr-btn--tertiary-no-outline fr-btn--sm' onClick={onOpen}>Réessayer</button>
          </div> : null}
      />
    </Box>
  )
}

export default ParameterSelector
