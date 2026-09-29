import ParameterTrendChart from './dossier/prelevements/parameter-trend-chart.js'
import PrelevementsCalendar from './prelevements-calendar/index.js'

const parameters = [
  {nom_parametre: 'Volume prélevé', unite: 'm³'},
  {nom_parametre: 'Débit', unite: 'm³/h'}
]

const fifteenMinutesValues = Array.from({length: 96}, (_, index) => ({
  heure: `${String(Math.floor(index / 4)).padStart(2, '0')}:${String(index % 4 * 15).padStart(2, '0')}:00`,
  values: [100_000 + index * 5000, 12.5 + index / 4]
}))

const data = {
  dailyParameters: parameters,
  fifteenMinutesParameters: parameters,
  dailyValues: Array.from({length: 8}, (_, index) => ({
    date: `2026-09-${String(index + 1).padStart(2, '0')}`,
    values: [1_250_000 + index * 250_000, 1200 + index * 500],
    fifteenMinutesValues
  }))
}

export default {
  title: 'Declarations/Graphiques',
  decorators: [
    Story => (
      <div style={{maxWidth: 900, margin: '0 auto', padding: 16}}>
        <Story />
      </div>
    )
  ]
}

export const EvolutionDesParametres = {
  render: () => <ParameterTrendChart data={data} />
}

export const DetailJournalier = {
  render: () => <PrelevementsCalendar data={data} />
}
