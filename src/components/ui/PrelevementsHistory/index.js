import {Alert} from '@codegouvfr/react-dsfr/Alert'
import Tag from '@codegouvfr/react-dsfr/Tag'
import {Box, Divider, Typography} from '@mui/material'

import ParameterTrendChart from '@/components/declarations/dossier/prelevements/parameter-trend-chart.js'
import PrelevementsCalendar from '@/components/declarations/prelevements-calendar.js'

const PrelevementsHistory = ({
  dailyParametersAlert,
  calendarAlert,
  historyData,
  isTrendChartIgnoringNulls
}) => (
  <Box className='flex flex-col gap-6'>
    <Typography variant='h6' component='h2'>
      Historique des prélèvements
    </Typography>

    {historyData ? (
      <>
        {(historyData.dailyParameters || historyData.fifteenMinutesParameters) && (
          <Box className='flex flex-col gap-4'>
            <Divider textAlign='left'>Données par pas de temps</Divider>

            <Box className='flex flex-col gap-2'>
              {historyData?.dailyParameters?.length > 0 && (
                <Box className='flex flex-wrap gap-1 items-center'>
                  Journalier : {historyData.dailyParameters.map(param => (
                    <Tag key={param.paramIndex} sx={{m: 1}}>
                      {param.nom_parametre} ({param.unite})
                    </Tag>
                  ))}
                </Box>
              )}

              {dailyParametersAlert && <Alert severity='warning' description={dailyParametersAlert} />}

              {historyData?.fifteenMinutesParameters?.length > 0 && (
                <Box className='flex flex-wrap gap-1 items-center'>
                  Quinze minutes : {historyData.fifteenMinutesParameters.map(param => (
                    <Tag key={param.paramIndex} sx={{m: 1}}>
                      {param.nom_parametre} ({param.unite})
                    </Tag>
                  ))}
                </Box>
              )}
            </Box>
          </Box>
        )}

        <Box className='flex flex-col gap-4'>
          <Box className='flex flex-col gap-4'>
            <Divider textAlign='left'>Calendrier des prélèvements</Divider>
            {calendarAlert && (
              <Alert
                severity='warning'
                className='mb-2'
                description={calendarAlert}
              />
            )}
            <PrelevementsCalendar data={historyData} />
          </Box>

          <Box className='flex flex-col gap-4'>
            <Divider textAlign='left'>Graphique de tendance des paramètres</Divider>
            <ParameterTrendChart data={historyData} connectNulls={isTrendChartIgnoringNulls} />
          </Box>
        </Box>
      </>
    ) : (
      <Typography>Aucune donnée de prélèvement disponible.</Typography>
    )}
  </Box>
)

export default PrelevementsHistory
