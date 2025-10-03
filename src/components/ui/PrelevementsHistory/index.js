import {Alert} from '@codegouvfr/react-dsfr/Alert'
import Tag from '@codegouvfr/react-dsfr/Tag'
import {Box, Typography} from '@mui/material'

import ParameterTrendChart from '@/components/declarations/dossier/prelevements/parameter-trend-chart.js'
import PrelevementsCalendar from '@/components/declarations/prelevements-calendar/index.js'
import DividerSection from '@/components/ui/DividerSection/index.js'

const PrelevementsHistory = ({
  dailyItems,
  intervalItems,
  dailyAlert,
  dateAlert,
  calendarData,
  chartData,
  connectNulls
}) => (
  <Box className='flex flex-col gap-6'>
    <Typography variant='h6' component='h2'>
      Historique des prélèvements
    </Typography>

    <DividerSection title='Données par pas de temps'>
      {dailyItems && (
        <Box className='flex flex-wrap gap-1 items-center'>
          Journalier : {dailyItems.map(param => (
            <Tag key={param.paramIndex} sx={{m: 1}}>
              {param.nom_parametre} ({param.unite})
            </Tag>
          ))}
        </Box>
      )}

      {dailyAlert && <Alert severity='warning' description={dailyAlert} />}

      {intervalItems?.length > 0 && (
        <Box className='flex flex-wrap gap-1 items-center'>
          Quinze minutes : {intervalItems.map(param => (
            <Tag key={param.paramIndex} sx={{m: 1}}>
              {param.nom_parametre} ({param.unite})
            </Tag>
          ))}
        </Box>
      )}
    </DividerSection>

    {calendarData && (
      <DividerSection title='Calendrier des prélèvements'>
        {dateAlert && (
          <Alert
            severity='warning'
            className='mb-2'
            description={dateAlert}
          />
        )}
        <PrelevementsCalendar data={calendarData} />
      </DividerSection>
    )}

    {chartData && (
      <DividerSection title='Graphique de tendance des paramètres'>
        <ParameterTrendChart data={chartData} connectNulls={connectNulls} />
      </DividerSection>
    )}
  </Box>
)

export default PrelevementsHistory
