'use client'

import {useState} from 'react'

import {fr} from '@codegouvfr/react-dsfr'
import {
  Alert,
  Box, Modal, Tab, Tabs, Typography
} from '@mui/material'
import {LineChart} from '@mui/x-charts'
import {parseISO, format} from 'date-fns'
import {fr as locale} from 'date-fns/locale'

import CalendarGrid from '@/components/calendar-grid.js'
import {formatNumber} from '@/utils/number.js'

function determineColors(values, fifteenMinutesValues) {
  const nParams = values.length
  const dailyComplete = values.map(v => v !== null && v !== undefined)
  const hasDaily = dailyComplete.some(Boolean)
  if (!hasDaily) {
    // Aucune valeur journalière renseignée
    return {colorA: 'grey', colorB: null}
  }

  // Vérifie que chaque paramètre a toutes les valeurs 15min
  const fifteenComplete = values.map((_, i) =>
    Array.isArray(fifteenMinutesValues)
    && fifteenMinutesValues.length > 0
    && fifteenMinutesValues.every(slot =>
      slot.values && slot.values[i] !== null && slot.values[i] !== undefined
    )
  )
  // Un paramètre est complet si le journalier ET les 15min sont complets
  const completeParams = dailyComplete.map((d, i) => d && fifteenComplete[i])
  const nComplete = completeParams.filter(Boolean).length
  if (nComplete === nParams) {
    // Toutes les données sont complètes
    return {colorA: fr.colors.decisions.text.actionHigh.blueFrance.default, colorB: null}
  }

  return {colorA: fr.colors.decisions.background.flat.warning.default}
}

export function transformOutJsonToCalendarData(outJson) {
  const daily = outJson.dailyValues || []
  return daily.map(({date, values, fifteenMinutesValues}) => {
    // Reformattage de la date pour dd-MM-yyyy
    const dateKey = format(parseISO(date), 'dd-MM-yyyy')
    const {colorA, colorB} = determineColors(values, fifteenMinutesValues)
    return {
      date: dateKey,
      values,
      fifteenMinutesValues,
      colorA,
      colorB
    }
  })
}

const PrelevementsCalendar = ({data}) => {
  console.log('🚀 ~ PrelevementsCalendar ~ data:', data)
  // États pour la modal et le paramètre sélectionné
  const [open, setOpen] = useState(false)
  const [selectedDayInfo, setSelectedDayInfo] = useState(null)
  const [tabIndex, setTabIndex] = useState(0)

  // Handlers
  const handleDayClick = dayInfo => {
    setSelectedDayInfo(dayInfo)
    setTabIndex(0)
    setOpen(true)
  }

  const handleClose = () => setOpen(false)

  if (data.dailyValues.length === 0) {
    return (
      <Alert severity='warning'>
        Aucune donnée de prélèvement n’a été trouvée.
      </Alert>
    )
  }

  return (
    <>
      <CalendarGrid
        data={transformOutJsonToCalendarData(data)}
        renderCustomTooltipContent={({date, dayStyleEntry}) => {
          if (!dayStyleEntry) {
            return (
              <>
                <strong>{date.toLocaleDateString('fr-FR')}</strong>
                <Typography>
                  <Box component='span' className='fr-icon-warning-fill' /> Aucun donnée
                </Typography>
              </>
            )
          }

          const {values, fifteenMinutesValues} = dayStyleEntry
          const warnings = values.map((v, i) => {
            const dailyMissing = v === null
            const fifteenMissing = !Array.isArray(fifteenMinutesValues)
              || fifteenMinutesValues.some(slot => slot.values[i] === null)
            return dailyMissing || fifteenMissing
          })

          return (
            <>
              <strong>{date.toLocaleDateString('fr-FR')}</strong>
              {Object.keys(data.dailyParameters).map(paramIndex => (
                <Typography key={paramIndex}>
                  {data.dailyParameters[paramIndex].nom_parametre} : {values[paramIndex] ? formatNumber(values[paramIndex]) : '—'} m³
                  {warnings[0] && <Box component='span' className='fr-icon-warning-fill' />}
                </Typography>
              ))}
            </>
          )
        }}
        onDayClick={handleDayClick}
      />

      <Modal open={open} onClose={handleClose}>
        <Box sx={{
          width: '80%', maxWidth: 600, bgcolor: 'background.paper', p: 2, mx: 'auto', mt: '10%'
        }}
        >
          {selectedDayInfo && (
            <>
              <Typography gutterBottom variant='h6' component='h2'>
                {selectedDayInfo.date.toLocaleDateString('fr-FR', {
                  weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
                })}
              </Typography>

              <Box className='flex gap-2'>
                {data.dailyParameters.map((param, idx) => (
                  <Typography key={param.paramIndex}>
                    {param.nom_parametre}: {selectedDayInfo.dayStyleEntry.values[idx]
                      ? formatNumber(selectedDayInfo.dayStyleEntry.values[idx], {maximumFractionDigits: 2})
                      : '—'} {param.unite}
                  </Typography>
                ))}
              </Box>

              <Tabs
                variant='scrollable'
                value={tabIndex}
                onChange={(e, v) => setTabIndex(v)}
              >
                {data.fifteenMinutesParameters.map((param, idx) => {
                  const missing = selectedDayInfo.dayStyleEntry.values[idx] === null
                     || selectedDayInfo.dayStyleEntry.fifteenMinutesValues.some(slot => slot.values[idx] === null)
                  return (
                    <Tab
                      key={param.paramIndex}
                      label={
                        <Box className='flex items-center gap-2'>
                          {missing && <Box component='span' className='fr-icon-warning-fill' sx={{color: fr.colors.decisions.background.flat.warning.default}} />}
                          {param.nom_parametre}
                        </Box>
                      }
                    />
                  )
                })}
              </Tabs>
              <Box sx={{height: 300, mt: 2}}>
                <LineChart
                  series={[{
                    id: data.fifteenMinutesParameters[tabIndex].nom_parametre,
                    data: selectedDayInfo.dayStyleEntry.fifteenMinutesValues.map(slot =>
                      slot.values[tabIndex]
                    ),
                    valueFormatter: value =>
                      value === null
                        ? 'Aucune donnée'
                        : `${value} ${data.fifteenMinutesParameters[tabIndex].unite}`
                  }]}
                  xAxis={[{
                    scaleType: 'time',
                    data: selectedDayInfo.dayStyleEntry.fifteenMinutesValues.map(slot =>
                      parseISO(`${format(selectedDayInfo.date, 'yyyy-MM-dd')}T${slot.heure}`)
                    ),
                    valueFormatter(value) {
                      const dateObj = value
                      const hours = dateObj.getHours()
                      const minutes = dateObj.getMinutes()
                      // Major tick at midnight: show full date
                      if (hours === 0 && minutes === 0) {
                        return format(dateObj, 'EEEE d MMM', {locale})
                      }

                      // Otherwise show hour and minute
                      return format(dateObj, 'HH:mm', {locale})
                    }
                  }]}
                />
              </Box>
            </>
          )}
        </Box>
      </Modal>
    </>
  )
}

export default PrelevementsCalendar
