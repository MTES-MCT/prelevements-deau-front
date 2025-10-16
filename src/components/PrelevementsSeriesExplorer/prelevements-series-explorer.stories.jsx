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
    series: {
      control: 'object',
      description: `Array of series metadata from API.

**Type**: \`Array<SeriesSummary>\`

**Schema**:
\`\`\`typescript
{
  _id: string              // Series unique identifier (MongoDB ObjectId)
  parameter: string        // Parameter name (e.g., 'temperature', 'debit')
  unit: string             // Unit of measurement (e.g., '°C', 'm³/h')
  frequency: string        // Sampling frequency (e.g., '1 day', '15 minutes')
  valueType: string        // Type of value ('mean', 'maximum', 'cumulative', etc.)
  minDate: string          // Earliest date with data (YYYY-MM-DD)
  maxDate: string          // Latest date with data (YYYY-MM-DD)
  hasSubDaily: boolean     // Whether series has sub-daily data
  numberOfValues: number   // Total number of values in series
  pointPrelevement?: string // Reference to sampling point
  pointInfo?: {            // Optional sampling point info
    id_point: number
    nom: string
  }
  extras?: object          // Optional additional metadata
}
\`\`\`

**Example**:
\`\`\`javascript
[{
  _id: '507f1f77bcf86cd799439011',
  parameter: 'temperature',
  unit: '°C',
  frequency: '1 day',
  valueType: 'mean',
  minDate: '2024-01-01',
  maxDate: '2024-12-31',
  hasSubDaily: false,
  numberOfValues: 365
}]
\`\`\``
    },
    getSeriesValues: {
      control: false,
      description: `Function to fetch series values from API.

**Signature**: \`async (seriesId: string, {start: string, end: string}) => Promise<{series: Object, values: Array}>\`

**Parameters**:
- \`seriesId\`: Series unique identifier
- \`start\`: Start date (YYYY-MM-DD, inclusive)
- \`end\`: End date (YYYY-MM-DD, inclusive)

**Returns**:
\`\`\`typescript
{
  series: SeriesSummary,  // Series metadata
  values: Array<{         // Array of values
    date: string,         // Date (YYYY-MM-DD)
    value: number | null, // Value (can be null for missing data)
    remark?: string       // Optional remark
  }>
}
\`\`\`

**Example**:
\`\`\`javascript
async function getSeriesValues(seriesId, {start, end}) {
  const response = await fetch(
    \`/api/series/\${seriesId}/values?start=\${start}&end=\${end}\`
  )
  return response.json()
}
\`\`\``
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

  // Iterate using numeric timestamps to ensure the loop condition
  const dayMs = 24 * 60 * 60 * 1000
  for (let t = start.getTime(); t <= end.getTime(); t += dayMs) {
    dates.push(toIsoDate(new Date(t)))
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
  const firstDate = dates[0]
  const lastDate = dates.at(-1)

  // Use a numeric month pointer (timestamp of first day of the month)
  // so the loop condition variable is clearly modified.
  let monthlyTime = new Date(start.getFullYear(), start.getMonth(), 1).getTime()
  const lastMonthTime = new Date(end.getFullYear(), end.getMonth(), 1).getTime()

  while (monthlyTime <= lastMonthTime) {
    const monthlyCursor = new Date(monthlyTime)
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

    // Move to first day of next month
    monthlyTime = new Date(year, monthIndex + 1, 1).getTime()
  }

  const availability = dates.map(date => ({
    date,
    status: statusByDate.get(date),
    label: STATUS_LABELS[statusByDate.get(date)]
  }))

  return {statusByDate, availability}
}

const ALL_DATES = generateDateSequence(START_DATE, END_DATE)
const {statusByDate: STATUS_BY_DATE}
  = createLegendCoverage(ALL_DATES, START_DATE, END_DATE)

// Generator config (not part of API, only for storybook data generation)
const SERIES_CONFIGS = [
  {
    id: 'series-volume',
    parameter: 'Volume prélevé',
    unit: 'm³',
    frequency: 'daily',
    valueType: 'cumulative',
    hasSubDaily: false,
    base: 85,
    amplitude: 25,
    period: 45,
    trend: 0.12,
    min: 10,
    attachCalendar: true
  },
  {
    id: 'series-volume-2',
    parameter: 'Volume prélevé',
    unit: 'm³',
    frequency: 'daily',
    valueType: 'cumulative',
    hasSubDaily: false,
    base: 120,
    amplitude: 30,
    period: 60,
    trend: 0.08,
    min: 15,
    attachCalendar: false
  },
  {
    id: 'series-debit-max',
    parameter: 'Debit instantané',
    unit: 'm³/h',
    frequency: 'sub-daily',
    valueType: 'maximum',
    hasSubDaily: true,
    base: 58,
    amplitude: 14,
    period: 18,
    min: 5,
    timeVariance: 4
  },
  {
    id: 'series-temperature',
    parameter: 'Température',
    unit: '°C',
    frequency: 'daily',
    valueType: 'maximum',
    hasSubDaily: false,
    base: 14,
    amplitude: 8,
    period: 30,
    min: -2,
    trend: 0.02,
    extras: {commentaire: 'Station recalibree en juin 2024'}
  },
  {
    id: 'series-conductivite',
    parameter: 'Conductivité',
    unit: 'µS/cm',
    frequency: 'daily',
    valueType: 'maximum',
    hasSubDaily: false,
    base: 230,
    amplitude: 80,
    period: 60,
    min: 50,
    trend: -0.3
  }
]

/**
 * Builds a single value entry in API format: {date, value, remark?}
 * Note: Sub-daily series would have multiple entries per day in real API
 */
function buildSeriesEntry(date, dayIndex, config) {
  const status = STATUS_BY_DATE.get(date) ?? 'present'
  const seasonalPart = Math.sin((2 * Math.PI * dayIndex) / config.period) * config.amplitude
  const trendPart = config.trend ? config.trend * dayIndex : 0
  const baseValue = config.base + seasonalPart + trendPart
  const clampedValue = Math.max(config.min ?? 0, baseValue)

  // API format: {date, value, remark?}
  if (status === 'noSampling') {
    return {date, value: 0} // Zero = no sampling
  }

  if (status === 'notDeclared') {
    return {date, value: null, remark: 'Non declare'}
  }

  return {date, value: clampedValue}
}

// ==============================================================================
// MOCK DATA GENERATION
// ==============================================================================

// Storage for generated values (simulates backend database)
const SERIES_VALUES_BY_ID = new Map()

// Build series METADATA (simulates GET /api/points-prelevement/{id}/series response)
// This is what you pass to the `series` prop
const SERIES_METADATA = SERIES_CONFIGS.map(config => {
  // Generate values for this series (simulates backend data)
  const values = ALL_DATES.map((date, index) => buildSeriesEntry(date, index, config))
  SERIES_VALUES_BY_ID.set(config.id, values)

  // Count non-null values (API format: {date, value})
  const numberOfValues = values.filter(entry => entry.value !== null && entry.value !== undefined).length

  // Return series metadata (matches API SeriesSummary schema)
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
    ...(config.extras ? {extras: config.extras} : {})
  }
})

/**
 * Mock implementation of getSeriesValues
 * Simulates GET /api/series/{seriesId}/values?start={start}&end={end}
 *
 * In production, this would be:
 * async function getSeriesValues(seriesId, {start, end}) {
 *   const response = await fetch(`/api/series/${seriesId}/values?start=${start}&end=${end}`)
 *   return response.json()
 * }
 */
const mockGetSeriesValues = async (seriesId, {start, end}) => {
  // Simulate API response delay
  await new Promise(resolve => {
    setTimeout(resolve, 100)
  })

  const values = SERIES_VALUES_BY_ID.get(seriesId) ?? []
  const filtered = values.filter(entry => entry.date >= start && entry.date <= end)

  // API response format: {series: {...}, values: [...]}
  return {
    series: SERIES_METADATA.find(s => s._id === seriesId),
    values: filtered
  }
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
        story: 'Scénario unique couvrant janvier 2023 à septembre 2025 avec 6 paramètres (dont un en double : "Volume preleve cumulatif #1" et "#2"), toutes les unités et fréquences requises, deux valueType différents, un commentaire de série et un calendrier illustrant chaque cas de légende chaque mois. Ce scénario teste également l\'indexation automatique des paramètres dupliqués.'
      }
    }
  }
}
