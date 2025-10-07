import Badge from '@codegouvfr/react-dsfr/Badge'
import {Box, Typography} from '@mui/material'

import Datepicker from '@/components/ui/Datepicker/index.js'

const PeriodSelectorHeader = ({
  periodLabel,
  viewTypeLabel,
  defaultInitialViewType,
  currentViewType,
  defaultSelectedPeriods,
  selectablePeriods,
  onSelectionChange,
  children
}) => (
  <Box className='width-full flex flex-col gap-6'>
    <Box className='flex items-end justify-between flex-wrap gap-2'>
      <Box className='flex items-center gap-2'>
        <Typography variant='h6'>{periodLabel}</Typography>
        {viewTypeLabel && <Badge noIcon severity='info'>Vue {viewTypeLabel}</Badge>}
      </Box>

      <Datepicker
        buttonLabel='Modifier la période d’observation'
        defaultInitialViewType={defaultInitialViewType}
        currentViewType={currentViewType}
        defaultSelectedPeriods={defaultSelectedPeriods}
        selectablePeriods={selectablePeriods}
        maxSelectablePeriods={6}
        onSelectionChange={onSelectionChange}
      />
    </Box>

    {children}
  </Box>
)

export default PeriodSelectorHeader
