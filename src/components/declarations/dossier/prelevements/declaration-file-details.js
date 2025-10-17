'use client'

import {Alert} from '@codegouvfr/react-dsfr/Alert'
import {Button} from '@codegouvfr/react-dsfr/Button'
import Tag from '@codegouvfr/react-dsfr/Tag'
import {Box} from '@mui/material'

import {getSeriesValues} from '@/app/api/series.js'
import PrelevementsSeriesExplorer from '@/components/PrelevementsSeriesExplorer/index.js'
import {getGlobalDateBounds} from '@/components/PrelevementsSeriesExplorer/util.js'
import DividerSection from '@/components/ui/DividerSection/index.js'

const DeclarationFileDetails = ({
  pointId,
  moisDeclaration,
  series = []
}) => {
  const hasPointLink = pointId !== null && pointId !== undefined && pointId !== ''
  const dailySeries = series.filter(s => s.frequency === '1 day')
  const fifteenMinSeries = series.filter(s => s.frequency === '15 minutes')
  // Vérifie si les dates de prélèvement (minDate / maxDate) se situent dans le mois déclaré
  const isInDeclarationMonth = date => {
    const declarationDate = new Date(moisDeclaration)
    const d = new Date(date)
    return d.getMonth() === declarationDate.getMonth()
           && d.getFullYear() === declarationDate.getFullYear()
  }

  const {minDate, maxDate} = getGlobalDateBounds(series)

  const hasDatesOutsideDeclMonth = (() => {
    if (!minDate || !maxDate || !moisDeclaration) {
      return false
    }

    return !isInDeclarationMonth(minDate) || !isInDeclarationMonth(maxDate)
  })()

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

      <DividerSection title='Paramètres par pas de temps'>
        <Box className='flex flex-col gap-2'>
          {dailySeries.length > 0 ? (
            <Box className='flex flex-wrap gap-1 items-center'>
              Journalier : {dailySeries.map(serie => (
                <Tag key={serie._id} sx={{m: 1}}>
                  {serie.parameter} ({serie.unit})
                </Tag>
              ))}
            </Box>
          ) : (
            <Alert severity='warning' description='Aucun paramètre journalier renseigné.' />
          )}

          {fifteenMinSeries.length > 0 && (
            <Box className='flex flex-wrap gap-1 items-center'>
              Quinze minutes : {fifteenMinSeries.map(serie => (
                <Tag key={serie._id} sx={{m: 1}}>
                  {serie.parameter} ({serie.unit})
                </Tag>
              ))}
            </Box>
          )}
        </Box>
      </DividerSection>

      {series.length > 0 && (
        <DividerSection title='Calendrier des prélèvements'>
          {hasDatesOutsideDeclMonth && (
            <Alert
              severity='warning'
              className='mb-2'
              description={
                <>
                  Certaines dates de prélèvement ne sont pas situées dans le mois déclaré : {new Intl.DateTimeFormat('fr-FR', {month: 'long', year: 'numeric'}).format(new Date(moisDeclaration))}
                </>
              }
            />
          )}

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
