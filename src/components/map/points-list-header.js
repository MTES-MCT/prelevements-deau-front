import {Button} from '@codegouvfr/react-dsfr/Button'
import {Typography} from '@mui/material'

import MapFilters from '@/components/map/map-filters.js'

const PointsListHeader = ({filters, resultsCount, typeMilieuOptions, usagesOptions, statusOptions, onFilter, exportList}) => (
  <div className='flex flex-col gap-2'>
    <Typography variant='h6'>Liste des points de prélèvement</Typography>
    <div className='inline-flex justify-end w-full'>
      <Button
        priority='secondary'
        iconId='fr-icon-add-line'
        size='small'
        linkProps={{
          href: '/prelevements/new'
        }}
      >
        Création d’un point
      </Button>
    </div>
    {/* Barre de filtres */}
    <MapFilters
      filters={filters}
      typeMilieuOptions={typeMilieuOptions}
      usagesOptions={usagesOptions}
      statusOptions={statusOptions}
      onFilterChange={onFilter}
      onClearFilters={() =>
        onFilter({
          name: '',
          typeMilieu: '',
          status: '',
          usages: []
        })}
    />
    {resultsCount !== null && (
      <Typography variant='body2' component='div'>
        {resultsCount === 0 && 'Aucun point ne correspond à vos critères de recherche'}
        {resultsCount > 0 && (
          <div className='flex justify-between items-center pt-2'>
            <span><strong>{resultsCount}</strong> point{resultsCount > 1 ? 's' : ''} de prélèvement</span>
            <Button
              size='small'
              iconId='fr-icon-download-line'
              title='Télécharger la liste au format csv'
              onClick={exportList}
            />
          </div>
        )}
      </Typography>
    )}
  </div>
)

export default PointsListHeader
