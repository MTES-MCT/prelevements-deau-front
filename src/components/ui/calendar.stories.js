import Calendar from './calendar.js'

const meta = {
  title: 'UI/Calendar',
  component: Calendar,
  tags: ['autodocs'],
  args: {}
}

export default meta

const blue = '#000091'
const orange = '#ff9940'
const lightBlue = '#6e9bff'

export const YearExample = {
  args: {
    title: '2024',
    compactMode: true,
    cells: [
      {key: 'jan', label: 'Jan', color: blue},
      {key: 'fev', label: 'Fév', color: blue},
      {key: 'mar', label: 'Mars', color: blue},
      {key: 'avr', label: 'Avr', color: orange},
      {key: 'mai', label: 'Mai', color: orange},
      {key: 'jun', label: 'Juin', color: blue},
      {key: 'juil', label: 'Juil', color: blue},
      {key: 'aout', label: 'Août', color: blue},
      {key: 'sept', label: 'Sept', color: blue},
      {key: 'oct', label: 'Oct', color: blue},
      {key: 'nov', label: 'Nov', color: blue},
      {key: 'dec', label: 'Dec', color: blue}
    ]
  }
}

const julyDays = Array.from({length: 31}).map((_, index) => {
  const day = index + 1
  const key = `2024-07-${String(day).padStart(2, '0')}`
  let color = blue

  if (day === 9 || day === 10) {
    color = lightBlue
  }

  return {
    key,
    label: `${day}`,
    color,
    isInteractive: day === 9 || day === 10
  }
})

const julyPlaceholders = Array.from({length: 1}).map((_, index) => ({
  key: `placeholder-${index}`,
  isPlaceholder: true
}))

export const MonthExample = {
  args: {
    title: 'Juillet',
    compactMode: false,
    cells: [...julyPlaceholders, ...julyDays]
  }
}

export const MultiYearExample = {
  args: {
    title: '2018 - 2024',
    compactMode: true,
    cells: [
      {key: '2018', label: '2018', color: blue},
      {key: '2019', label: '2019', color: blue},
      {key: '2020', label: '2020', color: blue},
      {key: '2021', label: '2021', color: blue},
      {key: '2022', label: '2022', color: blue},
      {key: '2023', label: '2023', color: orange},
      {key: '2024', label: '2024', color: orange}
    ]
  }
}

export const InteractiveExample = {
  args: {
    title: 'Interactions',
    compactMode: true,
    cells: [
      {
        key: 'A', label: 'A', color: blue, isInteractive: true, ariaLabel: 'Cellule A'
      },
      {
        key: 'B', label: 'B', color: orange, isInteractive: true, ariaLabel: 'Cellule B'
      },
      {
        key: 'C', label: 'C', color: blue, isInteractive: true, ariaLabel: 'Cellule C'
      },
      {
        key: 'D', label: 'D', color: orange, isInteractive: true, ariaLabel: 'Cellule D'
      }
    ],
    renderTooltipContent: cell => `Survol: ${cell.ariaLabel}`,
    onCellClick: cell => console.log(`Clique sur ${cell.ariaLabel}`)
  }
}
