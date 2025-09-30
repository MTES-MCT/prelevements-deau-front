'use client'

import {useState, useMemo, useCallback} from 'react'

import {fr} from '@codegouvfr/react-dsfr'
import {Alert} from '@codegouvfr/react-dsfr/Alert'
import {
  Box,
  Modal,
  Tab,
  Tabs,
  Typography
} from '@mui/material'
import {LineChart} from '@mui/x-charts'
import {parseISO, format} from 'date-fns'
import {fr as locale} from 'date-fns/locale'

import {buildCalendars} from './util.js'

import CalendarGrid from '@/components/ui/CalendarGrid/index.js'
import {formatNumber} from '@/utils/number.js'

// Legend labels
const PALETTE = {
  error: fr.colors.decisions.background.flat.error.default,
  blue: fr.colors.decisions.text.actionHigh.blueFrance.default,
  warning: fr.colors.decisions.background.flat.warning.default,
  grey: fr.colors.decisions.text.disabled.grey.default
}

// ---------------------- Tooltip hover component ---------------------- //
const DayHover = ({value, dailyParameters}) => {
  if (!value) {
    return (
      <div className='flex flex-col gap-1'>
        <strong>Aucune donnée</strong>
      </div>
    )
  }

  const dateObj = parseISO(value.date)
  const warnings = value.values?.some(v => v === null || v === undefined || v < 0)
  return (
    <div className='flex flex-col gap-1'>
      <strong>{dateObj.toLocaleDateString('fr-FR')}</strong>
      {dailyParameters.map((param, idx) => (
        <span key={param.paramIndex || idx}>
          {param.nom_parametre}: {Number.isNaN(value.values[idx]) ? '—' : formatNumber(value.values[idx], value.values[idx] < 1 && value.values[idx] !== 0 ? {maximumFractionDigits: 2, minimumFractionDigits: 2} : {})} {param.unite}
          {warnings && <Box component='span' className='fr-icon-warning-fill ml-1' />}
        </span>
      ))}
    </div>
  )
}

const PrelevementsCalendar = ({data}) => {
  const [open, setOpen] = useState(false)
  const [selectedDay, setSelectedDay] = useState(null)
  const [tabIndex, setTabIndex] = useState(0)

  const fifteenParams = data.fifteenMinutesParameters || []

  const calendars = useMemo(() => buildCalendars(data, PALETTE), [data])

  const handleClick = useCallback(value => {
    if (!value?.fifteenMinutesValues || value.fifteenMinutesValues.length === 0) {
      return
    }

    setSelectedDay(value)
    setTabIndex(0)
    setOpen(true)
  }, [])

  const handleClose = () => setOpen(false)

  if (data.dailyValues && data.dailyValues.length === 0) {
    return <Alert severity='warning' description='Aucune donnée de prélèvement n’a été trouvée.' />
  }

  const fifteenValues = selectedDay?.fifteenMinutesValues || []

  return (
    <>
      <CalendarGrid
        calendars={calendars}
        hoverComponent={props => <DayHover {...props} dailyParameters={data.dailyParameters} />}
        onClick={handleClick}
      />

      <Modal open={open} onClose={handleClose}>
        <Box sx={{
          width: '80%',
          maxWidth: 600,
          bgcolor: 'background.paper',
          p: 2,
          mx: 'auto',
          mt: '10%'
        }}
        >
          {selectedDay && (
            <>
              <Typography gutterBottom variant='h6' component='h2'>
                {parseISO(selectedDay.date).toLocaleDateString('fr-FR', {
                  weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
                })}
              </Typography>
              <Box className='flex flex-wrap gap-3 mb-2'>
                {data.dailyParameters.map((param, idx) => (
                  <Typography key={param.paramIndex || idx}>
                    {param.nom_parametre}: {Number.isNaN(selectedDay.values[idx]) ? '—' : formatNumber(selectedDay.values[idx], {maximumFractionDigits: 2})} {param.unite}
                  </Typography>
                ))}
              </Box>
              {fifteenParams.length > 0 ? (
                <Tabs variant='scrollable' value={tabIndex} onChange={(e, v) => setTabIndex(v)}>
                  {fifteenParams.map((param, idx) => {
                    const hasMissingValues = selectedDay.values[idx] === null || fifteenValues.some(slot => slot.values[idx] === null)
                    return (
                      <Tab
                        key={param.paramIndex || idx}
                        label={
                          <Box className='flex items-center gap-2'>
                            {hasMissingValues && (
                              <Box
                                component='span'
                                className='fr-icon-warning-fill'
                                sx={{color: fr.colors.decisions.background.flat.warning.default}}
                              />
                            )}
                            {param.nom_parametre}
                          </Box>
                        }
                      />
                    )
                  })}
                </Tabs>
              ) : (
                <Alert severity='warning' description='Les données de prélèvement à 15 minutes ne sont pas disponibles.' />
              )}
              {fifteenParams.length > 0 ? (
                <Box sx={{height: 300, mt: 2}}>
                  <LineChart
                    series={[{
                      id: fifteenParams[tabIndex].nom_parametre,
                      data: fifteenValues.map(slot => slot.values[tabIndex]),
                      color: fr.colors.decisions.text.actionHigh.blueFrance.default,
                      valueFormatter: value => (value === null ? 'Aucune donnée' : `${value} ${fifteenParams[tabIndex].unite}`)
                    }]}
                    xAxis={[{
                      scaleType: 'time',
                      data: fifteenValues.map(slot => parseISO(`${selectedDay.date}T${slot.heure}`)),
                      valueFormatter(value) {
                        const dateObj = value
                        const hours = dateObj.getHours()
                        const minutes = dateObj.getMinutes()
                        if (hours === 0 && minutes === 0) {
                          return format(dateObj, 'EEEE d MMM', {locale})
                        }

                        return format(dateObj, 'HH:mm', {locale})
                      }
                    }]}
                  />
                </Box>
              ) : null}
            </>
          )}
        </Box>
      </Modal>
    </>
  )
}

export default PrelevementsCalendar
