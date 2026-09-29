'use client'

import GroupedMultiselect from '@/components/ui/GroupedMultiselect/index.js'
import {CAMPAIGN_CROP_OPTIONS, normalizeCampaignCrops} from '@/lib/campaign-crops.js'

export default function CampaignCropsSelect({id, value, onChange, readOnly, disabled, error}) {
  const selected = normalizeCampaignCrops(value)
  const knownLabels = new Set(CAMPAIGN_CROP_OPTIONS.map(option => option.label))
  const options = [
    ...selected.filter(label => !knownLabels.has(label)).map(label => ({label})),
    ...CAMPAIGN_CROP_OPTIONS
  ].map(({label, parent}) => ({
    value: label,
    label,
    title: parent ? `${label} — ${parent}` : label,
    content: <span data-crop-level={parent ? 'child' : 'parent'} className={`block min-w-0 whitespace-normal text-sm ${parent ? 'ml-4 border-l border-gray-300 pl-3' : 'font-semibold'}`}>{label}</span>
  }))

  if (readOnly) return <div><p className='fr-label text-sm'>Cultures irriguées</p><p id={id} className='mb-0 mt-2 whitespace-pre-wrap text-sm'>{selected.join(', ') || 'Non renseignées'}</p></div>

  return <GroupedMultiselect
    searchable
    popupZIndex={20}
    id={id}
    label='Cultures irriguées'
    hint='Plusieurs choix possibles, parmi les catégories et les cultures.'
    placeholder='Sélectionner les cultures'
    options={options}
    value={selected}
    disabled={disabled}
    state={error ? 'error' : 'default'}
    stateRelatedMessage={error}
    onChange={next => onChange(next.includes('Aucune') && !selected.includes('Aucune') ? ['Aucune'] : next.filter(label => label !== 'Aucune'))}
  />
}
