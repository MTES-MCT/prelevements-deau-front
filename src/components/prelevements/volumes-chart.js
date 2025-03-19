'use client'

import {useState} from 'react'

import {fr as frColors} from '@codegouvfr/react-dsfr'
import {CircularProgress} from '@mui/material'
import {
  LineChart,
  ChartsReferenceLine
} from '@mui/x-charts'
import {format, parseISO, subMonths} from 'date-fns'
import {fr} from 'date-fns/locale'

const VolumesChart = ({volumes, isLoading}) => {
  const [showAll, setShowAll] = useState(false)

  const mostRecentDate = new Date(Math.max(...volumes.valeurs.map(item => new Date(item.date).getTime())))
  const twelveMonthsAgoFromRecent = subMonths(mostRecentDate, 12)
  const sortedData = [...volumes.valeurs].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
  const lastTwelveMonthsData = sortedData.filter(item => new Date(item.date) >= twelveMonthsAgoFromRecent)
  const displayData = showAll ? sortedData : lastTwelveMonthsData

  const xLabels = displayData.map(item => item.date)
  const volumeData = displayData.map(item => item.volume)
  const exceededData = displayData.map(item => ({
    date: item.date,
    volume: item.volume > volumes.volumeJournalierMax ? item.volume : null
  }))

  const series = [
    {
      data: displayData.map(item => item.volume),
      color: frColors.colors.decisions.artwork.major.blueFrance.active,
      showMark: true,
      area: false,
      valueFormatter(value) {
        return value ? `${Number.parseFloat(value).toLocaleString('fr-FR')} m³` : 'Non renseigné'
      }
    },
    {
      data: exceededData.map(item => item.volume),
      color: frColors.colors.decisions.artwork.major.redMarianne.active,
      showMark: true,
      area: false,
      line: true,
      // Masque la valeur affichée dans le tooltip, valeur déjà affichée avec la première série.
      valueFormatter: () => null
    }
  ]

  const hasVolumeMax = volumes.volumeJournalierMax
  const nbValeursRenseignees = showAll ? volumes.nbValeursRenseignees : displayData.length
  const nbDepassements = showAll ? volumes.nbDepassements : displayData.filter(v => v.depassement).length

  return (
    <div className='w-full border-[1px] p-3'>
      <div className='flex justify-between p-3 border-b flex-wrap'>
        <p>
          <b>Période du </b>
          <i> {format(parseISO(volumes.dateDebut), 'dd/MM/yyyy')} </i>
          <b> au </b>
          <i> {format(parseISO(volumes.dateFin), 'dd/MM/yyyy')} </i>
          <small><u>{showAll ? '' : ' (12 derniers mois)'}</u></small>
        </p>
        <button type='button' className='fr-btn ml-auto' onClick={() => setShowAll(!showAll)}>
          {showAll ? 'Afficher les 12 derniers mois' : 'Afficher toutes les données'}
        </button>
      </div>
      <div className='h-[400px] w-full'>
        {isLoading ? (
          <CircularProgress />
        ) : (
          <LineChart
            series={series}
            xAxis={[
              {
                data: xLabels,
                scaleType: 'band',
                valueFormatter: date => format(parseISO(date), 'dd/MM/yyyy', {locale: fr}),
                tickLabelStyle: {
                  angle: 45,
                  textAnchor: 'start',
                  fontSize: 12
                }
              }
            ]}
            yAxis={[
              {
                min: 65,
                max: Math.max(...volumeData, volumes.volumeJournalierMax || 0) + 5,
                valueFormatter: volume => Number.parseFloat(volume).toLocaleString('fr-FR')
              }
            ]}
            height={350}
            margin={{
              left: 60,
              right: 20,
              top: 20,
              bottom: 70
            }}
            grid={{
              vertical: true,
              horizontal: true
            }}
            slotProps={{
              legend: {
                direction: 'row',
                position: {vertical: 'top', horizontal: 'right'}
              },
              tooltip: {
                filter: item => item.seriesId === 'series-0'
              }
            }}
          >
            {hasVolumeMax && (
              <ChartsReferenceLine
                y={volumes.volumeJournalierMax}
                label={`Volume max: ${Number.parseFloat(volumes.volumeJournalierMax).toLocaleString('fr-FR')} m³`}
                labelAlign='start'
                lineStyle={{
                  stroke: frColors.colors.decisions.artwork.major.redMarianne.default,
                  strokeWidth: 2,
                  strokeDasharray: '5 5'
                }}
              />
            )}
          </LineChart>
        )}
      </div>
      <div className='flex flex-columns justify-between'>
        <div className='mt-4 text-sm'>
          {hasVolumeMax && (
            <p><b>Volume journalier maximum par mois : </b>{volumes.volumeJournalierMax} m³</p>
          )}
          <p>
            <b>Nombre de dépassements : </b> {nbDepassements} sur {nbValeursRenseignees} valeurs
          </p>
        </div>
      </div>
    </div>
  )
}

export default VolumesChart
