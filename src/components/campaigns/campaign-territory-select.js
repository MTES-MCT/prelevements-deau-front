'use client'

import {useId} from 'react'

import Autocomplete from '@mui/material/Autocomplete'

const TERRITORY_TYPES = {SAGE: 'Bassins (SAGE)', DEPARTEMENT: 'Départements', REGION: 'Régions'}
const TYPE_ORDER = ['SAGE', 'DEPARTEMENT', 'REGION']
const normalize = value => String(value || '').normalize('NFD').replaceAll(/[\u0300-\u036F]/g, '').toLocaleLowerCase('fr').trim()

export const campaignTerritoryLabel = territory => territory.type === 'DEPARTEMENT' && territory.code ? `${territory.name} (${territory.code})` : territory.name

export function filterCampaignTerritories(territories, {inputValue}) {
  const words = normalize(inputValue).split(/\s+/).filter(Boolean)
  return territories.filter(territory => {
    const searchable = normalize(`${territory.name} ${territory.code || ''} ${TERRITORY_TYPES[territory.type] || ''}`)
    return words.every(word => searchable.includes(word))
  })
}

const CampaignTerritorySelect = ({territories, value, onChange}) => {
  const id = useId()
  const options = [...territories].sort((a, b) => TYPE_ORDER.indexOf(a.type) - TYPE_ORDER.indexOf(b.type) || a.name.localeCompare(b.name, 'fr'))
  return (
    <div className='fr-input-group fr-mb-2w'>
      <label className='fr-label' htmlFor={id}>Territoire concerné *</label>
      <Autocomplete
        id={id}
        options={options}
        value={options.find(territory => territory.id === value) || null}
        getOptionLabel={campaignTerritoryLabel}
        isOptionEqualToValue={(option, selected) => option.id === selected.id}
        groupBy={territory => TERRITORY_TYPES[territory.type] || 'Territoires'}
        filterOptions={filterCampaignTerritories}
        noOptionsText='Aucun territoire trouvé'
        openText='Afficher les territoires'
        closeText='Fermer la liste'
        clearText='Effacer le territoire'
        renderInput={params => (
          <div ref={params.InputProps.ref} className='relative'>
            <input {...params.inputProps} required className='fr-input pr-20' placeholder='Rechercher un bassin, un département ou une région' />
            {params.InputProps.endAdornment}
          </div>
        )}
        onChange={(_event, territory) => onChange(territory?.id || '')}
      />
    </div>
  )
}

export default CampaignTerritorySelect
