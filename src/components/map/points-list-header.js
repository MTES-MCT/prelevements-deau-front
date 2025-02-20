import {Typography} from '@mui/material'

import MapFilters from '@/components/map/map-filters.js'

const PointsListHeader = ({filters, resultsCount, typeMilieuOptions, usagesOptions, onFilter}) => (
  <div className='flex flex-col gap-2'>
    <Typography variant='h6'>Liste des points de prélèvement</Typography>
    {/* Barre de filtres */}
    <MapFilters
      filters={filters}
      typeMilieuOptions={typeMilieuOptions}
      usagesOptions={usagesOptions}
      onFilterChange={onFilter}
      onClearFilters={() =>
        onFilter({name: '', typeMilieu: '', usages: []})}
    />
    {resultsCount !== null && (
      <Typography variant='body2'>
        {resultsCount === 0 && 'Aucun point ne correspond à vos critères de recherche'}
        {resultsCount > 0 && (
          <>
            <strong>{resultsCount}</strong> point{resultsCount > 1 ? 's' : ''} de prélèvement
          </>
        )}
      </Typography>
    )}
  </div>
)

export default PointsListHeader
