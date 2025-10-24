import {fr} from '@codegouvfr/react-dsfr'

import Calendar from './index.js'

import PeriodTooltip from '@/components/ui/PeriodTooltip/index.js'
import {CALENDAR_STATUS_COLORS} from '@/lib/calendar-colors.js'

const meta = {
  title: 'Components/Calendar',
  component: Calendar,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: 'Calendar component with automatic mode detection (month / year / years) based on date formats in the values prop. API: values[{date, color, ...}], onClick(value), hoverComponent. The hoverComponent should wrap children with a tooltip component (e.g., PeriodTooltip).'
      }
    }
  },
  args: {}
}

export default meta

// Using CALENDAR_STATUS_COLORS for consistency with legend
const blue = CALENDAR_STATUS_COLORS.present
const orange = fr.colors.decisions.background.actionHigh.warning.hover
const lightBlue = CALENDAR_STATUS_COLORS.noSampling

// ===== Story: Year (format YYYY-MM) =====
export const Annee2024 = {
  parameters: {
    docs: {
      description: {
        story: '"year" mode triggered with YYYY-MM dates belonging to the same year (2024). Missing months are greyed out.'
      }
    }
  },
  args: {
    values: [
      {date: '2024-01', color: blue, volume: 120},
      {date: '2024-02', color: blue, volume: 140},
      {date: '2024-03', color: blue, volume: 110},
      {
        date: '2024-04',
        color: orange,
        volume: 95,
        anomalie: true
      },
      {
        date: '2024-05',
        color: orange,
        volume: 90,
        anomalie: true
      },
      {date: '2024-06', color: blue, volume: 160},
      {date: '2024-07', color: blue, volume: 150},
      {date: '2024-08', color: blue, volume: 170},
      {date: '2024-10', color: blue, volume: 180},
      {date: '2024-11', color: blue, volume: 190},
      {date: '2024-12', color: blue, volume: 200}
    ],
    hoverComponent: ({value, children}) => (
      <PeriodTooltip
        periodLabel={value.date}
        parameters={[{content: `Volume: ${value.volume} m³`}]}
        alerts={value.anomalie ? [{alertLabel: 'Anomalie détectée', alertType: 'warning'}] : []}
      >
        {children}
      </PeriodTooltip>
    )
  }
}

// ===== Story: Month (format YYYY-MM-DD) =====
export const MoisJuillet = {
  parameters: {
    docs: {
      description: {
        story: '"month" mode with full dates for July 2025. Days not present in values are automatically greyed out.'
      }
    }
  },
  args: {
    values: [
      {date: '2025-07-01', color: blue, statut: 'ok'},
      {date: '2025-07-02', color: blue, statut: 'ok'},
      {date: '2025-07-03', color: blue, statut: 'ok'},
      {date: '2025-07-04', color: blue, statut: 'ok'},
      {date: '2025-07-05', color: blue, statut: 'ok'},
      {date: '2025-07-06', color: blue, statut: 'ok'},
      {date: '2025-07-08', color: blue, statut: 'ok'},
      {date: '2025-07-09', color: lightBlue, statut: 'light'},
      {date: '2025-07-10', color: lightBlue, statut: 'light'},
      {date: '2025-07-12', color: lightBlue, statut: 'light'},
      {date: '2025-07-15', color: orange, statut: 'alert'},
      {date: '2025-07-16', color: orange, statut: 'alert'},
      {date: '2025-07-17', color: orange, statut: 'alert'},
      {date: '2025-07-18', color: orange, statut: 'alert'},
      {date: '2025-07-19', color: blue, statut: 'ok'},
      {date: '2025-07-20', color: blue, statut: 'ok'},
      {date: '2025-07-22', color: blue, statut: 'ok'},
      {date: '2025-07-23', color: blue, statut: 'ok'},
      {date: '2025-07-24', color: blue, statut: 'ok'},
      {date: '2025-07-25', color: lightBlue, statut: 'light'},
      {date: '2025-07-26', color: blue, statut: 'ok'},
      {date: '2025-07-27', color: blue, statut: 'ok'},
      {date: '2025-07-28', color: blue, statut: 'ok'},
      {date: '2025-07-29', color: blue, statut: 'ok'},
      {date: '2025-07-30', color: blue, statut: 'ok'},
      {date: '2025-07-31', color: blue, statut: 'ok'}
    ],
    hoverComponent: ({value, children}) => (
      <PeriodTooltip
        periodLabel={value.date}
        parameters={[{content: `Statut: ${value.statut}`}]}
        alerts={value.statut === 'alert' ? [{alertLabel: 'État d\'alerte', alertType: 'warning'}] : []}
      >
        {children}
      </PeriodTooltip>
    )
  }
}

// ===== Story: Years (interval) =====
export const PlusieursAnnees = {
  parameters: {
    docs: {
      description: {
        story: '"years" mode with interval 2018–2024. Years missing from values would be greyed out (here all have a value).'
      }
    }
  },
  args: {
    values: [
      {date: '2018', color: blue},
      {date: '2019', color: blue},
      {date: '2020', color: blue},
      {date: '2021', color: blue},
      {date: '2022', color: blue},
      {date: '2023', color: orange},
      {date: '2024', color: orange}
    ]
  }
}

// ===== Story: Interactive (year mode) =====
export const Interactif = {
  parameters: {
    docs: {
      description: {
        story: 'Interaction with onClick and custom hover component.'
      }
    }
  },
  args: {
    values: [
      {date: '2026-01', color: blue, label: 'January'},
      {date: '2026-02', color: orange, label: 'February'},
      {date: '2026-03', color: blue, label: 'March'},
      {date: '2026-04', color: orange, label: 'April'}
    ],
    hoverComponent: ({value, children}) => (
      <PeriodTooltip
        periodLabel={value.date}
        parameters={[{content: value.label}]}
      >
        {children}
      </PeriodTooltip>
    ),
    onClick(value) {
      // Display in Storybook console (console usage accepted in stories)

      console.log('Click value', value)
    }
  }
}

// ===== Story: Mixed formats error =====
export const ErreurFormats = {
  parameters: {
    docs: {
      description: {
        story: 'Displays the error when multiple date formats are mixed.'
      }
    }
  },
  args: {
    values: [
      {date: '2025-01'},
      {date: '2025'},
      {date: '2025-02-01'}
    ]
  }
}
