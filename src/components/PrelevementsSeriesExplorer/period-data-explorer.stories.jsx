import PrelevementsSeriesExplorer from './index.js'

const meta = {
  title: 'Components/PrelevementsSeriesExplorer',
  component: PrelevementsSeriesExplorer,
  tags: ['autodocs'],
  decorators: [
    Story => (
      <div style={{minHeight: 1000, padding: '2rem'}}>
        <Story />
      </div>
    )
  ],
  argTypes: {
    data: {
      control: 'object',
      description: `Time series data with daily and/or 15-minute granularity.

**Type**: \`Object\`

**Schema**:
\`\`\`typescript
{
  dailyValues?: Array<{
    date: string          // ISO date string (YYYY-MM-DD)
    values: Array<number|null>
  }>
  dailyParameters?: Array<{
    nom_parametre: string  // Parameter name
    unite: string          // Unit (e.g., 'm³/h', '°C')
    color?: string         // Hex color for visualization
  }>
  fifteenMinutesValues?: Array<{
    date: string          // ISO datetime string
    values: Array<number|null>
  }>
  fifteenMinutesParameters?: Array<{
    nom_parametre: string
    unite: string
    color?: string
  }>
}
\`\`\`

**Note**: Component prefers dailyValues when both are provided.`
    },
    defaultPeriods: {
      control: 'object',
      description: `Initial selected periods.

**Type**: \`Array<Period>\`

**Examples**:
\`\`\`javascript
// Year selection
[{ type: 'year', value: 2024 }]

// Month selection (0 = January)
[
  { type: 'month', year: 2024, month: 0 },
  { type: 'month', year: 2024, month: 1 }
]
\`\`\``
    },
    selectablePeriods: {
      control: 'object',
      description: `Available periods for selection in the date picker.

**Type**: \`Object\`

**Schema**:
\`\`\`typescript
{
  years?: number[]
  months?: {
    start: Date
    end: Date
  }
}
\`\`\``
    },
    defaultInitialViewType: {
      control: {type: 'select'},
      options: ['years', 'months'],
      description: `Initial view mode of the period selector.

**Type**: \`'years' | 'months'\`

Defaults to 'years'.`
    },
    onPeriodChange: {
      action: 'period changed',
      description: 'Callback when period selection changes. Receives array of selected periods.'
    },
    onParameterChange: {
      action: 'parameters changed',
      description: 'Callback when parameter selection changes. Receives array of parameter names.'
    },
    translations: {
      control: 'object',
      description: `Custom UI text translations.

**Type**: \`Object\`

**Default values**:
\`\`\`javascript
{
  periodLabel: 'Période d'observation',
  parameterLabel: 'Paramètres à afficher',
  parameterHint: 'Sélectionnez jusqu'à 2 unités différentes',
  parameterPlaceholder: 'Choisir des paramètres...',
  noDataMessage: 'Aucune donnée disponible pour la période sélectionnée',
  validationError: 'Erreur de validation',
  rangeLabel: 'Affiner la plage temporelle'
}
\`\`\``
    },
    showCalendar: {
      control: 'boolean',
      description: 'Show/hide calendar grid display',
      table: {defaultValue: {summary: 'true'}}
    },
    showChart: {
      control: 'boolean',
      description: 'Show/hide time series chart',
      table: {defaultValue: {summary: 'true'}}
    },
    showRangeSlider: {
      control: 'boolean',
      description: 'Show/hide range refinement slider',
      table: {defaultValue: {summary: 'true'}}
    },
    locale: {
      control: 'text',
      description: 'Locale for date/number formatting (e.g., "fr-FR", "en-US")',
      table: {defaultValue: {summary: '"fr-FR"'}}
    }
  }
}

export default meta

const SUB_DAILY_TIMES = ['00:00:00', '06:00:00', '12:00:00', '18:00:00']
const START_DATE = new Date('2023-01-01')
const END_DATE = new Date('2025-09-30')
const STATUS_LABELS = {
  noSampling: 'Pas de prélèvement prévu',
  notDeclared: 'Donnée non déclarée',
  present: 'Données présentes'
}

const toIsoDate = date => date.toISOString().split('T')[0]

function generateDateSequence(start, end) {
  const dates = []
  const cursor = new Date(start.getTime())

  while (cursor <= end) {
    dates.push(toIsoDate(cursor))
    cursor.setDate(cursor.getDate() + 1)
  }

  return dates
}

function formatDay(year, monthIndex, day) {
  const month = String(monthIndex + 1).padStart(2, '0')
  const dayString = String(day).padStart(2, '0')
  return `${year}-${month}-${dayString}`
}

function createLegendCoverage(dates, start, end) {
  const statusByDate = new Map(dates.map(date => [date, 'present']))
  const monthlyCursor = new Date(start.getFullYear(), start.getMonth(), 1)
  const lastMonth = new Date(end.getFullYear(), end.getMonth(), 1)
  const firstDate = dates[0]
  const lastDate = dates.at(-1)

  while (monthlyCursor <= lastMonth) {
    const year = monthlyCursor.getFullYear()
    const monthIndex = monthlyCursor.getMonth()
    const daysInMonth = new Date(year, monthIndex + 1, 0).getDate()

    const noSamplingDate = formatDay(year, monthIndex, Math.min(20, daysInMonth))
    const notDeclaredDate = formatDay(year, monthIndex, daysInMonth)

    if (noSamplingDate >= firstDate && noSamplingDate <= lastDate) {
      statusByDate.set(noSamplingDate, 'noSampling')
    }

    if (notDeclaredDate >= firstDate && notDeclaredDate <= lastDate) {
      statusByDate.set(notDeclaredDate, 'notDeclared')
    }

    monthlyCursor.setMonth(monthIndex + 1)
  }

  const availability = dates.map(date => ({
    date,
    status: statusByDate.get(date),
    label: STATUS_LABELS[statusByDate.get(date)]
  }))

  return {statusByDate, availability}
}

const ALL_DATES = generateDateSequence(START_DATE, END_DATE)
const {statusByDate: STATUS_BY_DATE, availability: CALENDAR_AVAILABILITY}
  = createLegendCoverage(ALL_DATES, START_DATE, END_DATE)

const SERIES_CONFIGS = [
  {
    id: 'series-volume-cumulatif',
    parameter: 'Volume preleve cumulatif',
    unit: 'm³',
    frequency: 'daily',
    valueType: 'cumulative',
    hasSubDaily: false,
    base: 85,
    amplitude: 25,
    period: 45,
    trend: 0.12,
    min: 10,
    color: '#1d4ed8',
    attachCalendar: true
  },
  {
    id: 'series-debit-max',
    parameter: 'Debit instantane maximal',
    unit: 'm³/h',
    frequency: 'sub-daily',
    valueType: 'maximum',
    hasSubDaily: true,
    base: 58,
    amplitude: 14,
    period: 18,
    min: 5,
    timeVariance: 4,
    color: '#f97316'
  },
  {
    id: 'series-debit-moyen',
    parameter: 'Debit instantane moyen',
    unit: 'm³/h',
    frequency: 'sub-daily',
    valueType: 'cumulative',
    hasSubDaily: true,
    base: 42,
    amplitude: 10,
    period: 22,
    min: 4,
    timeVariance: 3,
    color: '#0ea5e9'
  },
  {
    id: 'series-temperature',
    parameter: 'Temperature de leau',
    unit: '°C',
    frequency: 'daily',
    valueType: 'maximum',
    hasSubDaily: false,
    base: 14,
    amplitude: 8,
    period: 30,
    min: -2,
    trend: 0.02,
    color: '#ef4444',
    extras: {commentaire: 'Station recalibree en juin 2024'}
  },
  {
    id: 'series-conductivite',
    parameter: 'Conductivite electrique',
    unit: 'µS/cm',
    frequency: 'daily',
    valueType: 'maximum',
    hasSubDaily: false,
    base: 320,
    amplitude: 45,
    period: 40,
    min: 120,
    trend: 0.05,
    color: '#6366f1'
  }
]

function buildSeriesEntry(date, dayIndex, config) {
  const status = STATUS_BY_DATE.get(date) ?? 'present'
  const seasonalPart = Math.sin((2 * Math.PI * dayIndex) / config.period) * config.amplitude
  const trendPart = config.trend ? config.trend * dayIndex : 0
  const baseValue = config.base + seasonalPart + trendPart
  const clampedValue = Math.max(config.min ?? 0, baseValue)

  if (config.frequency === 'sub-daily' && config.hasSubDaily) {
    const values = SUB_DAILY_TIMES.map((time, slotIndex) => {
      if (status === 'noSampling' || status === 'notDeclared') {
        return {
          time,
          value: null,
          remark: slotIndex === 0 && status === 'notDeclared' ? 'Non declare' : null
        }
      }

      const slotPhase = Math.sin(((slotIndex + 1) / SUB_DAILY_TIMES.length) * Math.PI)
      const timeVariance = config.timeVariance ?? 3
      const slotValue = Math.max(
        config.min ?? 0,
        clampedValue + (slotPhase * timeVariance) - slotIndex
      )

      return {
        time,
        value: Number(slotValue.toFixed(2)),
        remark: null
      }
    })

    return {date, values}
  }

  if (status === 'noSampling') {
    return {date, value: null}
  }

  if (status === 'notDeclared') {
    return {date, value: null, remark: 'Non declare'}
  }

  return {date, value: Number(clampedValue.toFixed(2))}
}

const SERIES_VALUES_BY_ID = new Map()

const SERIES_METADATA = SERIES_CONFIGS.map(config => {
  const values = ALL_DATES.map((date, index) => buildSeriesEntry(date, index, config))
  SERIES_VALUES_BY_ID.set(config.id, values)

  const numberOfValues = values.reduce((count, entry) => {
    if (Array.isArray(entry.values)) {
      return count + entry.values.filter(point => point.value !== null && point.value !== undefined).length
    }

    return count + (entry.value !== null && entry.value !== undefined ? 1 : 0)
  }, 0)

  return {
    _id: config.id,
    parameter: config.parameter,
    unit: config.unit,
    frequency: config.frequency,
    valueType: config.valueType,
    minDate: ALL_DATES[0],
    maxDate: ALL_DATES.at(-1),
    hasSubDaily: config.hasSubDaily,
    numberOfValues,
    color: config.color,
    ...(config.attachCalendar ? {calendarAvailability: CALENDAR_AVAILABILITY} : {}),
    ...(config.extras ? {extras: config.extras} : {})
  }
})

const mockGetSeriesValues = async (seriesId, {start, end}) => {
  const values = SERIES_VALUES_BY_ID.get(seriesId) ?? []

  const filtered = values.filter(entry => entry.date >= start && entry.date <= end)

  return {values: filtered}
}

export const ScenarioComplet = {
  args: {
    series: SERIES_METADATA,
    getSeriesValues: mockGetSeriesValues,
    defaultPeriods: [
      {type: 'year', value: 2023},
      {type: 'year', value: 2024},
      {type: 'month', year: 2025, month: 8}
    ],
    selectablePeriods: {
      years: [2023, 2024, 2025],
      months: {
        start: new Date(2023, 0, 1),
        end: new Date(2025, 8, 30)
      }
    },
    defaultInitialViewType: 'years'
  },
  parameters: {
    docs: {
      description: {
        story: 'Scénario unique couvrant janvier 2023 à septembre 2025 avec 5 paramètres, toutes les unités et fréquences requises, deux valueType différents, un commentaire de série et un calendrier illustrant chaque cas de légende chaque mois.'
      }
    }
  }
}

