'use client'

import {useState} from 'react'

import {fr} from '@codegouvfr/react-dsfr'
import {Alert} from '@codegouvfr/react-dsfr/Alert'
import {
  Box, Modal, Tab, Tabs, Typography
} from '@mui/material'
import {LineChart} from '@mui/x-charts'
import {parseISO, format} from 'date-fns'
import {fr as locale} from 'date-fns/locale'

import CalendarGrid from '@/components/calendar-grid.js'
import {formatNumber} from '@/utils/number.js'

function determineColors(values, fifteenMinutesValues, dailyParameters) {
  const hasNegativeValue = values.some(v => v < 0)
  if (hasNegativeValue) {
    return {colorA: fr.colors.decisions.background.flat.error.default, colorB: null}
  }

  const volumePreleveParam = dailyParameters?.find(p => p.nom_parametre === 'volume prélevé')
  const volumePreleveIndex = volumePreleveParam ? dailyParameters.indexOf(volumePreleveParam) : -1

  const hasAnyData = values.some(v => Number.isNaN(v)) || (fifteenMinutesValues?.length > 0)

  if (volumePreleveIndex > -1 && !Number.isNaN(values[volumePreleveIndex])) {
    // Bleu si la donnée journalière pour le volume prélevé est présente
    return {colorA: fr.colors.decisions.text.actionHigh.blueFrance.default, colorB: null}
  }

  if (hasAnyData) {
    // Orange s'il y a d'autres données mais pas le volume prélevé journalier
    return {colorA: fr.colors.decisions.background.flat.warning.default, colorB: null}
  }

  // Gris si aucune donnée
  return {colorA: 'grey', colorB: null}
}

export function transformOutJsonToCalendarData(outJson) {
  const daily = outJson.dailyValues || []
  return daily.map(({date, values, fifteenMinutesValues}) => {
    // Reformattage de la date pour dd-MM-yyyy
    const dateKey = format(parseISO(date), 'dd-MM-yyyy')
    const {colorA, colorB} = determineColors(values, fifteenMinutesValues, outJson.dailyParameters)
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
  // États pour la modal et le paramètre sélectionné
  const [open, setOpen] = useState(false)
  const [selectedDayInfo, setSelectedDayInfo] = useState(null)
  const [tabIndex, setTabIndex] = useState(0)

  const fifteenParams = data.fifteenMinutesParameters || []

  // Support for optional fifteenMinutesValues: fallback to empty array if null
  const fifteenValues = selectedDayInfo?.dayStyleEntry?.fifteenMinutesValues || []

  // Handlers
  const handleCellClick = cellInfo => {
    if (cellInfo.mode !== 'month' || !cellInfo.dayStyleEntry) {
      return
    }

    setSelectedDayInfo(cellInfo)
    setTabIndex(0)
    setOpen(true)
  }

  const handleClose = () => setOpen(false)

  if (data.dailyValues && data.dailyValues.length === 0) {
    return (
      <Alert severity='warning' description='Aucune donnée de prélèvement n’a été trouvée.' />
    )
  }

  return (
    <>
      <CalendarGrid
        data={transformOutJsonToCalendarData(data)}
        renderCustomTooltipContent={cellInfo => {
          if (cellInfo.mode !== 'month') {
            const entries = cellInfo.entries ?? []
            const hasEntries = entries.length > 0
            const rangeLabel = `${format(cellInfo.periodStart, 'd MMM yyyy', {locale})} – ${format(cellInfo.periodEnd, 'd MMM yyyy', {locale})}`

            return (
              <>
                <strong>{cellInfo.label}</strong>
                <Typography>{rangeLabel}</Typography>
                <Typography>{hasEntries ? `${new Set(entries.map(entry => format(entry.dateObj, 'dd/MM/yyyy'))).size} jour(s) renseigné(s)` : 'Aucune donnée'}</Typography>
              </>
            )
          }

          const {date, dayStyleEntry} = cellInfo

          if (!dayStyleEntry) {
            return (
              <>
                <strong>{date.toLocaleDateString('fr-FR')}</strong>
                <Typography>
                  <Box component='span' className='fr-icon-warning-fill' /> Aucune donnée
                </Typography>
              </>
            )
          }

          const {values} = dayStyleEntry
          const warnings = values.map(v => v === null || v === undefined || v < 0)

          return (
            <>
              <strong>{date.toLocaleDateString('fr-FR')}</strong>
              {Object.keys(data.dailyParameters).map(paramIndex => (
                <Typography key={paramIndex}>
                  {data.dailyParameters[paramIndex].nom_parametre} : {Number.isNaN(values[paramIndex])
                    ? '—'
                    : formatNumber(values[paramIndex], values[paramIndex] < 1 && values[paramIndex] !== 0 ? {maximumFractionDigits: 2, minimumFractionDigits: 2} : {})} m³
                  {warnings[0] && <Box component='span' className='fr-icon-warning-fill' />}
                </Typography>
              ))}
            </>
          )
        }}
        onCellClick={fifteenValues.length > 0 ? handleCellClick : undefined}
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
                    {param.nom_parametre}: {
                      Number.isNaN(selectedDayInfo.dayStyleEntry.values[idx])
                        ? '—'
                        : formatNumber(selectedDayInfo.dayStyleEntry.values[idx], {maximumFractionDigits: 2})
                    } {param.unite}
                  </Typography>
                ))}
              </Box>

              {fifteenParams.length > 0 ? (
                <Tabs
                  variant='scrollable'
                  value={tabIndex}
                  onChange={(e, v) => setTabIndex(v)}
                >
                  {fifteenParams.map((param, idx) => {
                    const missing = selectedDayInfo.dayStyleEntry.values[idx] === null
                      || fifteenValues.some(slot => slot.values[idx] === null)
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
              ) : (
                <Alert severity='warning' description='Les données de prélèvement à 15 minutes ne sont pas disponibles.' />
              )}
              {fifteenParams.length > 0 ? (
                <Box sx={{height: 300, mt: 2}}>
                  <LineChart
                    series={[{
                      id: fifteenParams[tabIndex].nom_parametre,
                      data: fifteenValues.map(slot =>
                        slot.values[tabIndex]
                      ),
                      color: fr.colors.decisions.text.actionHigh.blueFrance.default,
                      valueFormatter: value =>
                        value === null
                          ? 'Aucune donnée'
                          : `${value} ${fifteenParams[tabIndex].unite}`
                    }]}
                    xAxis={[{
                      scaleType: 'time',
                      data: fifteenValues.map(slot =>
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
              ) : null}
            </>
          )}
        </Box>
      </Modal>
    </>
  )
}

export default PrelevementsCalendar
