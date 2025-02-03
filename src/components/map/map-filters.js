'use client'

import {useState} from 'react'

import {fr} from '@codegouvfr/react-dsfr'
import {useIsDark} from '@codegouvfr/react-dsfr/useIsDark'
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

const MapFilters = ({filters, usagesOptions, typeMilieuOptions, onFilterChange, onClearFilters}) => {
  const [expanded, setExpanded] = useState(false)
  const {isDark} = useIsDark()

  const filterCount = Object.values(filters).reduce(
    (acc, value) => acc + (Array.isArray(value) ? value.length : (value ? 1 : 0)),
    0
  )

  const backgroundColor = fr.colors.getHex({isDark}).decisions.artwork.background.grey.default

  return (
    <Box
      sx={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 1000,
        pointerEvents: expanded ? 'auto' : 'none'
      }}
    >
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'flex-end',
          p: 1,
          backgroundColor: expanded ? backgroundColor : 'transparent'
        }}
      >
        <IconButton
          sx={{pointerEvents: 'auto'}}
          aria-label='Afficher les filtres'
          onClick={() => setExpanded(prev => !prev)}
        >
          <FilterListIcon color='primary' />
          <Box sx={{position: 'relative', top: -12, right: -2}}>
            <Badge badgeContent={filterCount} color='primary' overlap='circular' />
          </Box>
        </IconButton>
      </Box>
      {expanded && (
        <Box
          sx={{
            backgroundColor,
            p: 2
          }}
        >
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              gap: 2
            }}
          >
            <TextField
              label='Recherche par nom'
              value={filters.name}
              size='small'
              onChange={e =>
                onFilterChange({...filters, name: e.target.value})}
            />
            <FormControl size='small'>
              <InputLabel id='filter-typeMilieu-label'>Type Milieu</InputLabel>
              <Select
                labelId='filter-typeMilieu-label'
                label='Type Milieu'
                value={filters.typeMilieu}
                onChange={e =>
                  onFilterChange({...filters, typeMilieu: e.target.value})}
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

                        onFilterChange({...filters, usages: newUsages})
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
        </Box>
      )}
    </Box>
  )
}

export default MapFilters
