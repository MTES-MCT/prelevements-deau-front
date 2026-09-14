'use client'

import {BarChart} from '@mui/x-charts/BarChart'

const DATE_FORMATTER = new Intl.DateTimeFormat('fr-FR', {
  day: 'numeric',
  month: 'short',
  timeZone: 'UTC'
})
const NUMBER_FORMATTER = new Intl.NumberFormat('fr-FR')

export default function AdminDashboardActivityChart({items, granularity, series}) {
  return (
    <BarChart
      grid={{horizontal: true}}
      height={320}
      margin={{bottom: 8, left: 8, right: 40, top: 16}}
      series={series}
      xAxis={[{
        data: items.map(item => item.date),
        height: 'auto',
        scaleType: 'band',
        tickLabelMinGap: 12,
        valueFormatter: value => {
          const date = DATE_FORMATTER.format(new Date(`${value}T00:00:00.000Z`))
          return granularity === 'week' ? `Sem. ${date}` : date
        }
      }]}
      yAxis={[{
        min: 0,
        tickMinStep: 1,
        valueFormatter: value => NUMBER_FORMATTER.format(value),
        width: 'auto'
      }]}
    />
  )
}
