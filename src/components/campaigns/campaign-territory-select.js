'use client'

import {useId} from 'react'

import Autocomplete from '@mui/material/Autocomplete'

import {ZONE_ICONS} from '../zones/zone-icons.js'

const TERRITORY_TYPES = {SAGE: 'Bassins (SAGE)', DEPARTEMENT: 'Départements', REGION: 'Régions'}
const TYPE_ORDER = ['SAGE', 'DEPARTEMENT', 'REGION']
// Same zone-type badges as the zones list and the export territory selector.
const TYPE_PRESENTATIONS = {
  REGION: {
    label: 'Région', color: '#000091', backgroundColor: '#eeeeff', className: 'border-[#000091] bg-[#eeeeff] text-[#000091]', icon: ZONE_ICONS.mapPin2
  },
  DEPARTEMENT: {
    label: 'Département', color: '#18753c', backgroundColor: '#e6f4ea', className: 'border-[#18753c] bg-[#e6f4ea] text-[#18753c]', icon: ZONE_ICONS.mapPin
  },
  SAGE: {
    label: 'SAGE', color: '#8d533e', backgroundColor: '#fff4f0', className: 'border-[#8d533e] bg-[#fff4f0] text-[#8d533e]', icon: ZONE_ICONS.water
  }
}
const DEFAULT_PRESENTATION = {
  label: 'Territoire', color: 'var(--text-default-grey)', backgroundColor: 'var(--background-alt-grey)', className: 'border-gray-300 bg-gray-100 text-gray-700', icon: ZONE_ICONS.mapPin2
}
const normalize = value => String(value || '').normalize('NFD').replaceAll(/[\u0300-\u036F]/g, '').toLocaleLowerCase('fr').trim()

const TerritoryTypeBadge = ({type, id}) => {
  const presentation = TYPE_PRESENTATIONS[type] || DEFAULT_PRESENTATION
  return (
    <span id={id} className={`inline-flex shrink-0 items-center gap-1 border px-1.5 py-0.5 text-xs font-medium ${presentation.className}`}>
      <span className={`${presentation.icon} [&::after]:![--icon-size:0.72rem] [&::before]:![--icon-size:0.72rem]`} aria-hidden='true' />
      {presentation.label}
    </span>
  )
}

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
  const selected = options.find(territory => territory.id === value) || null
  const presentation = selected ? (TYPE_PRESENTATIONS[selected.type] || DEFAULT_PRESENTATION) : null
  return (
    <div className='fr-input-group fr-mb-2w'>
      <div className='mb-1 flex flex-wrap items-center justify-between gap-2'>
        <label className='fr-label' htmlFor={id}>Territoire concerné *</label>
        {selected && <TerritoryTypeBadge id={`${id}-type`} type={selected.type} />}
      </div>
      <p id={`${id}-hint`} className='fr-hint-text fr-mb-1w'>Territoires avec des points et des préleveurs actifs rattachés à un collecteur.</p>
      <Autocomplete
        id={id}
        options={options}
        value={selected}
        getOptionLabel={campaignTerritoryLabel}
        isOptionEqualToValue={(option, selected) => option.id === selected.id}
        groupBy={territory => TERRITORY_TYPES[territory.type] || 'Territoires'}
        filterOptions={filterCampaignTerritories}
        noOptionsText='Aucun territoire trouvé'
        openText='Afficher les territoires'
        closeText='Fermer la liste'
        clearText='Effacer le territoire'
        renderOption={({key, ...optionProps}, territory) => (
          <li key={key} {...optionProps}>
            <span className='flex min-w-0 flex-1 flex-wrap items-center justify-between gap-2'>
              <span className='min-w-0 break-words'>{campaignTerritoryLabel(territory)}</span>
              <TerritoryTypeBadge type={territory.type} />
            </span>
          </li>
        )}
        renderInput={params => (
          <div ref={params.slotProps.input.ref} className='relative'>
            <input
              {...params.slotProps.htmlInput}
              required
              aria-describedby={[`${id}-hint`, selected && `${id}-type`].filter(Boolean).join(' ')}
              className='fr-input pr-20'
              style={presentation ? {color: presentation.color, backgroundColor: presentation.backgroundColor} : undefined}
              placeholder='Rechercher un bassin, un département ou une région'
            />
            {params.slotProps.input.endAdornment}
          </div>
        )}
        onChange={(_event, territory) => onChange(territory?.id || '')}
      />
    </div>
  )
}

export default CampaignTerritorySelect
