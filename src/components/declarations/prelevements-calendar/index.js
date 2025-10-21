'use client'

import {useState, useMemo, useCallback} from 'react'

import {fr} from '@codegouvfr/react-dsfr'
import {Alert} from '@codegouvfr/react-dsfr/Alert'
import BloodtypeOutlinedIcon from '@mui/icons-material/BloodtypeOutlined'
import DeviceThermostatOutlinedIcon from '@mui/icons-material/DeviceThermostatOutlined'
import HeightOutlinedIcon from '@mui/icons-material/HeightOutlined'
import LocalDrinkOutlinedIcon from '@mui/icons-material/LocalDrinkOutlined'
import OfflineBoltOutlinedIcon from '@mui/icons-material/OfflineBoltOutlined'
import OilBarrelOutlinedIcon from '@mui/icons-material/OilBarrelOutlined'
import OpacityOutlinedIcon from '@mui/icons-material/OpacityOutlined'
import ScienceOutlinedIcon from '@mui/icons-material/ScienceOutlined'
import WaterOutlinedIcon from '@mui/icons-material/WaterOutlined'
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

import {buildCalendars, normalizeTimestamps} from './util.js'

import CalendarGrid from '@/components/ui/CalendarGrid/index.js'
import PeriodTooltip from '@/components/ui/PeriodTooltip/index.js'
import {formatNumber} from '@/utils/number.js'
import {normalizeString} from '@/utils/string.js'

// Check if a value is missing (null or undefined)
const isMissingValue = value => value === null || value === undefined

// Legend labels
const PALETTE = {
  error: fr.colors.decisions.background.flat.error.default,
  blue: fr.colors.decisions.text.actionHigh.blueFrance.default,
  warning: fr.colors.decisions.background.flat.warning.default,
  grey: fr.colors.decisions.text.disabled.grey.default
}

// Map parameter names to Material-UI icons
const getParameterIcon = parameterName => {
  const normalized = normalizeString(parameterName)

  // Volume
  if (normalized.includes('volume')) {
    return OpacityOutlinedIcon
  }

  // Debit (flow rate)
  if (normalized.includes('debit')) {
    if (normalized.includes('reserve')) {
      return WaterOutlinedIcon
    }

    return OilBarrelOutlinedIcon
  }

  // Level / Height
  if (normalized.includes('niveau') || normalized.includes('piezometrique')) {
    return HeightOutlinedIcon
  }

  // Temperature
  if (normalized.includes('temperature')) {
    return DeviceThermostatOutlinedIcon
  }

  // Electrical conductivity
  if (normalized.includes('conductivite')) {
    return OfflineBoltOutlinedIcon
  }

  // Chemical compounds (chlorides, nitrates, sulfates)
  if (normalized.includes('chlorure') || normalized.includes('nitrate') || normalized.includes('sulfate')) {
    return ScienceOutlinedIcon
  }

  // PH level
  if (normalized.includes('ph')) {
    return BloodtypeOutlinedIcon
  }

  // Turbidity / Clarity
  if (normalized.includes('turbidite')) {
    return LocalDrinkOutlinedIcon
  }

  // Default: water icon
  return OpacityOutlinedIcon
}

// ---------------------- Tooltip hover component ---------------------- //
const DayHover = ({value, dailyParameters, children}) => {
  if (!value) {
    return children
  }

  const dateObj = parseISO(value.date)
  const periodLabel = dateObj.toLocaleDateString('fr-FR')

  // Build parameters array for PeriodTooltip
  const parameters = dailyParameters.map((param, idx) => {
    const formattedValue = Number.isNaN(value.values[idx])
      ? '—'
      : formatNumber(
        value.values[idx],
        value.values[idx] < 1 && value.values[idx] !== 0
          ? {maximumFractionDigits: 2, minimumFractionDigits: 2}
          : {}
      )

    return {
      icon: getParameterIcon(param.nom_parametre),
      content: `${param.nom_parametre}: ${formattedValue} ${param.unite}`
    }
  })

  // Build alerts array for PeriodTooltip
  const alerts = []
  const hasMissingValues = value.values?.some(isMissingValue)
  const hasNegativeValues = value.values?.some(v => v < 0)

  if (hasMissingValues) {
    alerts.push({
      alertLabel: 'Données manquantes',
      alertType: 'missing'
    })
  }

  if (hasNegativeValues) {
    alerts.push({
      alertLabel: 'Valeurs négatives détectées',
      alertType: 'warning'
    })
  }

  return (
    <PeriodTooltip
      periodLabel={periodLabel}
      parameters={parameters}
      alerts={alerts}
    >
      {children}
    </PeriodTooltip>
  )
}

const PrelevementsCalendar = ({data}) => {
  const [open, setOpen] = useState(false)
  const [selectedDay, setSelectedDay] = useState(null)
  const [tabIndex, setTabIndex] = useState(0)

  const fifteenParams = data.fifteenMinutesParameters || []

  const calendars = useMemo(() => buildCalendars(data, PALETTE), [data])

  const DayHoverWrapper = useCallback(
    props => <DayHover {...props} dailyParameters={data.dailyParameters} />,
    [data.dailyParameters]
  )

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
    return <Alert severity='warning' description="Aucune donnée de prélèvement n'a été trouvée." />
  }

  const fifteenValues = selectedDay?.fifteenMinutesValues || []

  return (
    <>
      <CalendarGrid
        calendars={calendars}
        hoverComponent={DayHoverWrapper}
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
                    const hasMissingValues = isMissingValue(selectedDay.values[idx]) || fifteenValues.some(slot => isMissingValue(slot.values[idx]))
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
                      data: normalizeTimestamps(fifteenValues, selectedDay.date, parseISO),
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
