'use client'

import {Alert} from '@codegouvfr/react-dsfr/Alert'
import {Button} from '@codegouvfr/react-dsfr/Button'
import Tag from '@codegouvfr/react-dsfr/Tag'
import {Box} from '@mui/material'

import PrelevementsSeriesExplorer from '@/components/PrelevementsSeriesExplorer/index.js'
import DividerSection from '@/components/ui/DividerSection/index.js'
import {getSeriesValuesAction} from '@/server/actions/index.js'
import {formatFrequencyLabel, sortFrequencies} from '@/utils/frequency.js'

// Wrapper to extract .data from Server Action result
async function fetchSeriesValues(seriesId, options) {
  const result = await getSeriesValuesAction(seriesId, options)
  if (!result.success) {
    return {values: []}
  }

  return result.data
}

const DeclarationFileDetails = ({
  pointId,
  series = [],
  getSeriesValues = fetchSeriesValues
}) => {
  const hasPointLink = pointId !== null && pointId !== undefined && pointId !== ''

  return (
    <Box className='flex flex-col gap-6'>
      {hasPointLink && (
        <div className='flex justify-end p-3'>
          <Button
            priority='secondary'
            size='small'
            iconId='fr-icon-external-link-line'
            linkProps={{
              href: `/points-prelevement/${pointId}`
            }}
          >
            Consulter la fiche
          </Button>
        </div>
      )}

      {series.length > 0 && (
        <DividerSection title='Calendrier des prélèvements'>
          <PrelevementsSeriesExplorer
            series={series}
            showPeriodSelector={false}
            timeSeriesChartProps={{
              enableThresholds: false,
              enableDecimation: false
            }}
            getSeriesValues={getSeriesValues}
          />
        </DividerSection>
      )}
    </Box>
  )
}

export default DeclarationFileDetails
