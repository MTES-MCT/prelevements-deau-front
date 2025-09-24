import {useRef, useState} from 'react'

import {Typography} from '@mui/material'

import DatepickerTrigger from './index.js'

const meta = {
  title: 'Components/Datepicker',
  component: DatepickerTrigger,
  tags: ['autodocs'],
  decorators: [
    Story => (
      <div style={{minHeight: 800}}>
        <Story />
      </div>
    )
  ],
  argTypes: {
    defaultInitialViewType: {
      description: `Vue initiale du sélecteur.

\`'years' | 'months'\``
    },
    currentViewType: {
      description: `Vue courante sélectionnée.

\`'years' | 'months'\``
    },
    defaultSelectedPeriods: {
      control: {type: 'object'},
      description: `Liste des périodes pré-sélectionnées.

**Schéma**:
\`\`\`js
[
  { type: 'year', value: 2025 },
  { type: 'month', year: 2025, month: 2 } // Mars 2025
]
\`\`\`
- Pour une année : \`{ type: 'year', value: <number> }\`
- Pour un mois : \`{ type: 'month', year: <number>, month: <number> }\` (month: 0 = janvier)`
    },
    selectablePeriods: {
      control: {type: 'object'},
      description: `Périodes disponibles à la sélection.

**Schéma**:
\`\`\`js
{
  years: [2022, 2023, 2024, 2025],
  months: {
    start: new Date(2024, 0), // Janvier 2024
    end: new Date(2024, 11)   // Décembre 2024
  }
}
\`\`\`
- \`years\` : tableau d'années disponibles
- \`months\` : objet avec date de début et de fin`
    },
    maxSelectablePeriods: {
      control: {type: 'number'},
      description: `Nombre maximum de périodes sélectionnables (optionnel).

**Type**: \`number\``
    },
    onSelectionChange: {
      control: false,
      description: `Callback appelée lors d'un changement de sélection.

**Signature**:
\`\`\`js
(periods: Array<{type: 'year' | 'month', ...}>) => void
\`\`\``
    }
  }
}

const Wrapper = ({
  defaultInitialViewType,
  currentViewType,
  defaultSelectedPeriods: defaultPeriodsFromArgs,
  ...props
}) => {
  const defaultPeriodsRef = useRef(defaultPeriodsFromArgs || [])
  const defaultPeriods = defaultPeriodsRef.current
  const [selectedPeriods, setSelectedPeriods] = useState(defaultPeriods)

  const handleSelectionChange = periods => setSelectedPeriods(periods)

  return (
    <div>
      <DatepickerTrigger
        {...props}
        defaultInitialViewType={defaultInitialViewType}
        currentViewType={currentViewType}
        defaultSelectedPeriods={defaultPeriods}
        selectablePeriods={props.selectablePeriods}
        maxSelectablePeriods={props.maxSelectablePeriods}
        onSelectionChange={handleSelectionChange}
      />
      <Typography sx={{marginTop: 2, fontWeight: 'bold'}}>
        {`Résultat : ${selectedPeriods.length} période(s) sélectionnée(s)`}
      </Typography>
    </div>
  )
}

export default meta

export const VueParMois = {
  args: {
    defaultInitialViewType: 'months',
    currentViewType: 'months',
    maxSelectablePeriods: 6,
    selectablePeriods: {
      months: {
        start: new Date(2024, 3),
        end: new Date(2024, 8)
      }
    },
    defaultSelectedPeriods: []
  },
  parameters: {
    docs: {
      description: {
        story: 'Vue par mois : affiche uniquement les mois d\'avril à septembre 2024. L\'utilisateur peut sélectionner jusqu\'à 6 mois consécutifs. Idéal pour une sélection fine sur une période restreinte.'
      }
    }
  },
  render: args => <Wrapper {...args} />
}

export const VueParAnnées = {
  args: {
    defaultInitialViewType: 'years',
    currentViewType: 'years',
    selectablePeriods: {
      years: [2015, 2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025]
    },
    defaultSelectedPeriods: [],
    maxSelectablePeriods: 5
  },
  parameters: {
    docs: {
      description: {
        story: 'Vue par années : permet de sélectionner une ou plusieurs années parmi une liste de 2015 à 2025. La sélection multiple est limitée à 5 années.'
      }
    }
  },
  render: args => <Wrapper {...args} />
}

export const AvecDézoom = {
  args: {
    description: 'Vue initiale: années, mais ouvert sur les mois de 2025. Le bouton "Dézoom" permet de revenir à la vue années.',
    defaultInitialViewType: 'years',
    currentViewType: 'months',
    selectablePeriods: {
      years: [2015, 2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025],
      months: {
        start: new Date(2025, 0), // Janvier 2025
        end: new Date(2025, 11) // Décembre 2025
      }
    },
    defaultSelectedPeriods: [
      {type: 'year', value: 2025},
      {type: 'month', year: 2025, month: 2}, // Mars
      {type: 'month', year: 2025, month: 3}, // Avril
      {type: 'month', year: 2025, month: 4}, // Mai
      {type: 'month', year: 2025, month: 5} // Juin
    ]
  },
  parameters: {
    docs: {
      description: {
        story: 'Vue mixte avec bouton "Dézoom" : commence sur la vue années, mais affiche les mois de 2025. L\'utilisateur peut revenir à la vue années via le bouton. Permet de montrer la navigation entre années et mois.'
      }
    }
  },
  render: args => <Wrapper {...args} />
}

export const VueParMoisAvecSelection = {
  args: {
    defaultInitialViewType: 'months',
    currentViewType: 'months',
    maxSelectablePeriods: 6,
    selectablePeriods: {
      months: {
        start: new Date(2024, 0), // Janvier 2024
        end: new Date(2024, 11) // Décembre 2024
      }
    },
    defaultSelectedPeriods: [
      {type: 'month', year: 2024, month: 2}, // Mars 2024
      {type: 'month', year: 2024, month: 3}, // Avril 2024
      {type: 'month', year: 2024, month: 4} // Mai 2024
    ]
  },
  parameters: {
    docs: {
      description: {
        story: 'Vue par mois avec sélection pré-remplie : affiche toute l\'année 2024, avec mars, avril et mai déjà sélectionnés. Permet de tester l\'affichage d\'une sélection multiple continue.'
      }
    }
  },
  render: args => <Wrapper {...args} />
}

export const ListeCourteAnnées = {
  args: {
    defaultInitialViewType: 'years',
    currentViewType: 'years',
    selectablePeriods: {
      years: [2022, 2023, 2024, 2025]
    },
    defaultSelectedPeriods: []
  },
  parameters: {
    docs: {
      description: {
        story: 'Vue années avec liste courte : ne propose que 4 années à la sélection, pour tester le composant sur un jeu de données réduit.'
      }
    }
  },
  render: args => <Wrapper {...args} />
}
