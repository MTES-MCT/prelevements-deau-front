'use client'

import {fr} from '@codegouvfr/react-dsfr'
import {Select} from '@codegouvfr/react-dsfr/Select'
import InfoOutlined from '@mui/icons-material/InfoOutlined'
import {
  Tooltip
} from '@mui/material'

import GroupedMultiselect from '@/components/ui/GroupedMultiselect/index.js'

const MapFilters = ({
  filters,
  usagesOptions,
  typeMilieuOptions,
  statusOptions,
  communesOptions,
  onFilterChange
}) => (
  <div className='flex justify-between gap-4'>
    <GroupedMultiselect
      placeholder='Filtrer par usages'
      value={filters.usages}
      options={usagesOptions}
      className='w-52'
      onChange={value => onFilterChange({usages: value})}
    />
    <div className='flex'>
      <Select
        label=''
        nativeSelectProps={{
          id: 'filter-typeMilieu-label',
          onChange: e => onFilterChange({typeMilieu: e.target.value}),
          value: filters.typeMilieu
        }}
      >
        <option value=''>Filtrer par milieu</option>
        {typeMilieuOptions.map(option => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </Select>
    </div>
    <div className='flex flex-row-reverse'>
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
              <p className='p-2'><b><u>En activité</u> :</b> Exploitation qui fait actuellement encore l’objet de
                prélèvement.</p>
              <p className='p-2'><b><u>Terminée</u> :</b> Exploitation arrêtée sans que cela soit dû à une raison
                technique particulière.</p>
              <p className='p-2'><b><u>Abandonnée</u> :</b> Il y a une raison technique qui ne permet plus
                l’exploitation du point de prélèvement pour l’usage visé (ex : contamination par les pesticides).
              </p>
              <p className='p-2'><b><u>Non renseigné</u> :</b> Pas d’information sur l’activité de l’exploitation.
              </p>
            </>
          }
        >
          <InfoOutlined />
        </Tooltip>
      </div>
      <Select
        label=''
        nativeSelectProps={{
          id: 'filter-statuts-label',
          onChange: e => onFilterChange({status: e.target.value}),
          value: filters.status
        }}
      >
        <option value=''>Filtrer par statut</option>
        {statusOptions.map(option => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </Select>
    </div>
    <GroupedMultiselect
      placeholder='Filtrer par commune'
      value={filters.communes}
      options={communesOptions}
      disabled={communesOptions.length === 0}
      className='w-56'
      onChange={value => onFilterChange({communes: value})}
    />
  </div>
)

export default MapFilters
