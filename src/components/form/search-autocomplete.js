import {cx} from '@codegouvfr/react-dsfr/fr/cx'
import Autocomplete from '@mui/material/Autocomplete'

import {filterSearchAutocompleteOptions} from '@/lib/search-options.js'

const SearchAutocomplete = props => {
  const {
    className,
    filterOptions = filterSearchAutocompleteOptions,
    id,
    placeholder,
    type,
    ...autocompleteProps
  } = props

  return (
    <Autocomplete
      {...autocompleteProps}
      className={className}
      filterOptions={filterOptions}
      id={id}
      renderInput={params => (
        // Fix overlay position
        <div ref={params.slotProps.input.ref} style={{position: 'relative', width: 'calc(100% + 35px)', left: '-20px'}}>
          <input
            {...params.slotProps.htmlInput}
            className={cx(params.slotProps.htmlInput.className, className)}
            placeholder={placeholder}
            type={type}
            style={{margin: '-8px 0', padding: '8px 15px'}}
          />
        </div>
      )}
    />
  )
}

export default SearchAutocomplete
