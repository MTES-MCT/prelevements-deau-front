'use client'

import {useState, useMemo, useEffect} from 'react'

import {fr} from '@codegouvfr/react-dsfr'
import FilterListIcon from '@mui/icons-material/FilterList'
import InfoOutlined from '@mui/icons-material/InfoOutlined'
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
  IconButton,
  Tooltip
} from '@mui/material'
import Badge from '@mui/material/Badge'
import debounce from 'lodash-es/debounce'

const MapFilters = ({filters, usagesOptions, typeMilieuOptions, statusOptions, onFilterChange, onClearFilters}) => {
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
          <div className='flex w-full'>
            <FormControl size='small' className='w-full'>
              <InputLabel id='filter-typeMilieu-label'>Statut</InputLabel>
              <Select
                labelId='filter-typeMilieu-label'
                label='Statuts'
                value={filters.status}
                onChange={e =>
                  onFilterChange({status: e.target.value})}
              >
                <MenuItem value=''>Tous</MenuItem>
                {statusOptions.map(option => (
                  <MenuItem key={option} value={option}>
                    {option}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <div className='flex flex-col justify-center p-2'>
              <Tooltip
                placement='right-start'
                slotProps={{
                  tooltip: {
                    sx: {
                      maxWidth: '500px',
                      padding: '1em',
                      backgroundColor: fr.colors.decisions.background.default.grey.default,
                      color: fr.colors.decisions.text.default.grey.default,
                      border: `1px solid ${fr.colors.decisions.border.default.grey.default}`
                    }
                  }
                }}
                title={
                  <>
                    <p className='p-2'><b><u>En activité</u> :</b> Exploitation qui fait actuellement encore l’objet de prélèvement.</p>
                    <p className='p-2'><b><u>Terminée</u> :</b> Exploitation arrêtée sans que cela soit dû à une raison technique particulière.</p>
                    <p className='p-2'><b><u>Abandonnée</u> :</b> Il y a une raison technique qui ne permet plus l’exploitation du point de prélèvement pour l’usage visé (ex : contamination par les pesticides).</p>
                    <p className='p-2'><b><u>Non renseigné</u> :</b> Pas d’information sur l’activité de l’exploitation.</p>
                  </>
                }
              >
                <InfoOutlined />
              </Tooltip>
            </div>
          </div>
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
