import {fr} from '@codegouvfr/react-dsfr'

import CalendarGrid from './index.js'

import PeriodTooltip from '@/components/ui/PeriodTooltip/index.js'

const blue = fr.colors.decisions.artwork.major.blueFrance.default
const lightBlue = fr.colors.decisions.background.actionHigh.info.hover

// Build a full year: one calendar ("month" mode) per month with a single colored day
const buildYearCalendars = (year, color1, color2) => {
  const calendars = []
  for (let m = 1; m <= 12; m++) {
    const month = String(m).padStart(2, '0')
    // Alternate colors for readability
    const color = m % 2 === 0 ? color2 : color1
    calendars.push([
      {
        date: `${year}-${month}-01`,
        color,
        label: `Mois ${month}`
      }
    ])
  }

  return calendars
}

const meta = {
  title: 'Components/CalendarGrid',
  component: CalendarGrid,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: 'Grille de plusieurs calendriers indépendants. Exemple par défaut : une année complète avec un calendrier (mode mois) par mois.'
      }
    }
  },
  args: {
    calendars: buildYearCalendars(2025, blue, lightBlue)
  }
}

export default meta

// Hover component example using PeriodTooltip
const Hover = ({value, children}) => (
  <PeriodTooltip
    periodLabel={value.date}
    parameters={[{content: value.label || (value.volume ? `Volume: ${value.volume}` : 'Données présentes')}]}
  >
    {children}
  </PeriodTooltip>
)

// Default story: full year (current year) – explicit story export for clarity
export const AnneeComplete = {}

export const Vide = {
  parameters: {
    docs: {description: {story: 'Affiche un <Alert /> informatif lorsque calendars est vide.'}}
  },
  args: {calendars: []}
}

export const PlusieursCalendriersMemeMode = {
  parameters: {
    docs: {description: {story: 'Quatre calendriers en mode year disposés dans la grille auto-fill.'}}
  },
  args: {
    calendars: [
      [
        {date: '2026-01', color: blue, label: 'Jan'},
        {date: '2026-04', color: lightBlue, label: 'Avril'},
        {date: '2026-07', color: blue, label: 'Juil'}
      ],
      [
        {date: '2025-02', color: blue},
        {date: '2025-05', color: lightBlue},
        {date: '2025-08', color: blue}
      ],
      [
        {date: '2024-03', color: lightBlue},
        {date: '2024-06', color: blue},
        {date: '2024-09', color: blue},
        {date: '2024-12', color: lightBlue}
      ],
      [
        {date: '2023-01', color: blue},
        {date: '2023-05', color: lightBlue},
        {date: '2023-11', color: blue}
      ]
    ],
    hoverComponent: Hover
  }
}

export const CustomLegend = {
  parameters: {
    docs: {description: {story: 'Utilisation de legendLabels personnalisé.'}}
  },
  args: {
    calendars: [
      [
        {date: '2025-07-01', color: blue, volume: 10},
        {date: '2025-07-02', color: lightBlue, volume: 12}
      ]
    ],
    legendLabels: [
      {color: blue, label: 'OK'},
      {color: lightBlue, label: 'Alerte'}
    ],
    hoverComponent: Hover
  }
}

export const Interaction = {
  parameters: {
    docs: {description: {story: 'Calendriers interactifs avec onClick (voir actions dans la console Storybook).'}}
  },
  args: {
    calendars: [
      [
        {date: '2026-07-01', color: blue, label: 'Jour 1'},
        {date: '2026-07-05', color: lightBlue, label: 'Jour 5'}
      ],
      [
        {date: '2026-01', color: blue, label: 'Janvier'},
        {date: '2026-02', color: lightBlue, label: 'Février'}
      ]
    ],
    hoverComponent: Hover,
    onClick(value) {
      console.log('Click depuis CalendarGrid', value)
    }
  }
}

export const ErreurDonnees = {
  parameters: {
    docs: {description: {story: 'Exemple de données mal formées (éléments sans date). Montre le comportement attendu du composant.'}}
  },
  args: {
    // Un sous-tableau correct, un sous-tableau avec un objet sans date
    calendars: [
      [
        {date: '2025-01-01', color: blue, label: 'OK'}
      ],
      [
        {foo: 'manque date'},
        {date: ''},
        {date: 'not-a-date'}
      ]
    ]
  }
}
