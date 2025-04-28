'use client'

import {useMemo} from 'react'

import {fr} from '@codegouvfr/react-dsfr'
import {Paper} from '@mui/material'
import {BarChart} from '@mui/x-charts/BarChart'

import LegendChart from '@/components/prelevements/legend-chart.js'

function getColorForNature(index) {
  const colors = [
    fr.colors.decisions.artwork.major.greenBourgeon.active,
    fr.colors.decisions.artwork.major.blueEcume.active,
    fr.colors.decisions.artwork.major.yellowTournesol.active,
    fr.colors.decisions.artwork.major.blueCumulus.active,
    fr.colors.decisions.artwork.major.yellowMoutarde.active,
    fr.colors.decisions.artwork.major.purpleGlycine.active,
    fr.colors.decisions.artwork.major.greenArchipel.active,
    fr.colors.decisions.artwork.major.pinkMacaron.active
  ]

  return colors[index % colors.length]
}

const CustomTooltip = e => (
  <Paper
    elevation={2}
    style={{
      padding: '.5em 1em'
    }}
  >
    <p className='p-2 border-b mb-2'>
      {e.axisValue}
    </p>
    {e.series
      .filter(s => s.data[e.dataIndex] !== 0)
      .map(s => (
        <div
          key={s.label}
          className='flex justify-between'
        >
          <span className='flex items-center'>
            <div
              className='w-2 h-2 rounded-full mr-3'
              style={{
                backgroundColor: s.color
              }}
            />
            <span className='mr-10'>{s.label}</span>
          </span>
          <span>{s.data[e.dataIndex]}</span>
        </div>
      ))}
  </Paper>
)

const DocumentChart = ({data}) => {
  const {xAxisData, series} = useMemo(() => {
    const groupedByYear = {}

    for (const item of data) {
      groupedByYear[item.annee] ||= {}
      groupedByYear[item.annee][item.nature] ||= 0
      groupedByYear[item.annee][item.nature]++
    }

    const natureTypes = [...new Set(data.map(item => item.nature))]
    const sortedYears = Object.keys(groupedByYear).sort()

    const seriesData = natureTypes.map(nature => ({
      label: nature,
      data: sortedYears.map(year => groupedByYear[year][nature] || 0),
      stack: 'total',
      color: getColorForNature(natureTypes.indexOf(nature))
    }))

    return {
      xAxisData: sortedYears,
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
            label: 'Année'
          }
        ]}
        yAxis={[
          {
            label: 'Nombre de documents'
          }
        ]}
        height={450}
        slots={{
          axisContent: CustomTooltip
        }}
      />
      <LegendChart series={series} />
    </div>
  )
}

export default DocumentChart
