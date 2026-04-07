'use client'

import {useState, useMemo, useEffect} from 'react'

import FilterListIcon from '@mui/icons-material/FilterList'
import {
  Box,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormGroup,
  FormControlLabel,
  Checkbox,
  Button,
  IconButton
} from '@mui/material'
import Badge from '@mui/material/Badge'
import debounce from 'lodash-es/debounce'

const MapFilters = ({filters, usagesOptions, typeMilieuOptions, onFilterChange, onClearFilters}) => {
  const [expanded, setExpanded] = useState(false)
  const [searchTerm, setSearchTerm] = useState(filters.name || '')

  // Création d'une version "debounced" de onFilterChange pour la recherche par nom
  const debouncedFilterChange = useMemo(
    () => debounce(value => onFilterChange({name: value}), 300),
    [onFilterChange]
  )

  useEffect(() => {
    debouncedFilterChange(searchTerm)
    return () => {
      debouncedFilterChange.cancel()
    }
  }, [searchTerm, debouncedFilterChange])

  const filterCount = Object.values(filters).reduce(
    (acc, value) => acc + (Array.isArray(value) ? value.length : (value ? 1 : 0)),
    0
  )

  return (
    <div className='flex flex-col gap-4'>
      <div className='flex items-center gap-2'>
        <TextField
          className='w-full'
          label='Recherche par nom, identifiant ou préleveur'
          value={searchTerm}
          size='small'
          onChange={e => setSearchTerm(e.target.value)}
        />

        <IconButton
          sx={{pointerEvents: 'auto', width: 40, height: 40}}
          aria-label='Afficher les filtres'
          onClick={() => setExpanded(prev => !prev)}
        >
          <FilterListIcon color='primary' />
          <Box sx={{position: 'relative', top: -12, right: -2}}>
            <Badge badgeContent={filterCount} color='primary' overlap='circular' />
          </Box>
        </IconButton>
      </div>
      {expanded && (
        <Box className='flex flex-col gap-2'>
          <FormControl size='small'>
            <InputLabel id='filter-typeMilieu-label'>Type Milieu</InputLabel>
            <Select
              labelId='filter-typeMilieu-label'
              label='Type Milieu'
              value={filters.typeMilieu}
              onChange={e =>
                onFilterChange({typeMilieu: e.target.value})}
            >
              <MenuItem value=''>Tous</MenuItem>
              {typeMilieuOptions.map(option => (
                <MenuItem key={option} value={option}>
                  {option}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormGroup row>
            {usagesOptions.map(option => (
              <FormControlLabel
                key={option}
                control={
                  <Checkbox
                    checked={filters.usages.includes(option)}
                    onChange={e => {
                      let newUsages = filters.usages
                      if (e.target.checked) {
                        newUsages = [...newUsages, option]
                      } else {
                        newUsages = newUsages.filter(u => u !== option)
                      }

                      onFilterChange({usages: newUsages})
                    }}
                  />
                }
                label={option}
              />
            ))}
          </FormGroup>
          <Button variant='outlined' onClick={onClearFilters}>
            Effacer tous les filtres
          </Button>
        </Box>
      )}
    </div>
  )
}

export default MapFilters
