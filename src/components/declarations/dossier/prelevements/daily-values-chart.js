'use client'

import {Box, Divider} from '@mui/material'
import {LineChart} from '@mui/x-charts'
import {format, parseISO} from 'date-fns'
import {fr} from 'date-fns/locale'

import {formatNumber} from '@/utils/number.js'

const DailyValuesChart = ({data}) => {
  const {dailyValues = [], dailyParameters = []} = data || {}
  if (dailyValues.length === 0 || dailyParameters.length === 0) {
    return null
  }

  const xData = dailyValues.map(entry => parseISO(entry.date))

  const series = dailyParameters.map((param, idx) => ({
    id: param.nom_parametre,
    label: `${param.nom_parametre} (${param.unite})`,
    data: dailyValues.map(entry => entry.values[idx]),
    showMark: false,
    curve: 'linear',
    valueFormatter: value =>
      value === null
        ? 'Aucune donnée'
        : `${formatNumber(value)} ${param.unite}`
  }))

  return (
    <Box className='flex flex-col gap-4 mt-4'>
      <Divider textAlign='left'>Graphique des données journalières</Divider>
      <LineChart
        series={series}
        xAxis={[{
          scaleType: 'time',
          data: xData,
          valueFormatter: value => format(value, 'd MMM', {locale: fr})
        }]}
        height={300}
        margin={{
          left: 60,
          right: 30,
          top: 20,
          bottom: 60
        }}
        slotProps={{
          legend: {
            direction: 'row',
            position: {vertical: 'top', horizontal: 'right'}
          }
        }}
      />
    </Box>
  )
}

export default DailyValuesChart
