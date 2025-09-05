import {Alert} from '@codegouvfr/react-dsfr/Alert'
import Tag from '@codegouvfr/react-dsfr/Tag'
import {Box, Divider, Typography} from '@mui/material'

import ParameterTrendChart from '@/components/declarations/dossier/prelevements/parameter-trend-chart.js'
import PrelevementsCalendar from '@/components/declarations/prelevements-calendar.js'

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

    <Box className='flex flex-col gap-4'>
      <Divider textAlign='left'>Données par pas de temps</Divider>

      <Box className='flex flex-col gap-2'>
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
      </Box>
    </Box>

    {calendarData && (
      <Box className='flex flex-col gap-4'>
        <Divider textAlign='left'>Calendrier des prélèvements</Divider>
        {dateAlert && (
          <Alert
            severity='warning'
            className='mb-2'
            description={dateAlert}
          />
        )}
        <PrelevementsCalendar data={calendarData} />
      </Box>
    )}

    {chartData && (
      <Box className='flex flex-col gap-4'>
        <Divider textAlign='left'>Graphique de tendance des paramètres</Divider>
        <ParameterTrendChart data={chartData} connectNulls={connectNulls} />
      </Box>
    )}
  </Box>
)

export default PrelevementsHistory
