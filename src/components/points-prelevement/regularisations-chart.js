'use client'

import {useMemo} from 'react'

import {fr} from '@codegouvfr/react-dsfr'
import {BarChart} from '@mui/x-charts/BarChart'

import LegendChart from '@/components/points-prelevement/legend-chart.js'

function getColorForStatus(index) {
  const colors = [
    fr.colors.decisions.artwork.major.greenBourgeon.active,
    fr.colors.decisions.artwork.major.redMarianne.active
  ]

  return colors[index % colors.length]
}

const RegularisationsCharts = ({data}) => {
  const {xAxisData, series} = useMemo(() => {
    const regimeData = data
    const sortedData = [...regimeData].sort((a, b) => b.nb_exploitations_concernees - a.nb_exploitations_concernees)
    const regimes = sortedData.map(item => item.regime)
    const seriesData = [
      {
        label: 'Exploitations autorisées',
        data: sortedData.map(item => item.nb_exploitations_autorisees),
        stack: 'total',
        color: getColorForStatus(0)
      },
      {
        label: 'Exploitations non autorisées',
        data: sortedData.map(item => item.nb_exploitations_non_autorisees),
        stack: 'total',
        color: getColorForStatus(1)
      }
    ]

    return {
      xAxisData: regimes,
      series: seriesData
    }
  }, [data])

  return (
    <div className='my-4'>
      <BarChart
        series={series}
        slotProps={{
          legend: {
            hidden: true
          }
        }}
        xAxis={[
          {
            data: xAxisData,
            scaleType: 'band',
            label: 'Régime'
          }
        ]}
        yAxis={[
          {
            label: 'Nombre exploitations\n'
          }
        ]}
        height={450}
      />
      <LegendChart series={series} />
    </div>
  )
}

export default RegularisationsCharts
