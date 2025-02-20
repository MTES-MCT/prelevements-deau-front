import {Typography} from '@mui/material'

import MapFilters from '@/components/map/map-filters.js'

const PointsListHeader = ({filters, typeMilieuOptions, usagesOptions, onFilter}) => (
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
  </div>
)

export default PointsListHeader
