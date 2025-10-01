import {useRef, useState} from 'react'

import {fr} from '@codegouvfr/react-dsfr'
import {Box} from '@mui/system'

import PeriodSelectorHeader from './index.js'

const meta = {
  title: 'Components/PeriodSelectorHeader',
  component: PeriodSelectorHeader,
  tags: ['autodocs'],
  decorators: [
    Story => (
      <div style={{minHeight: 800}}>
        <Story />
      </div>
    )
  ],
  argTypes: {
    periodLabel: {
      control: {type: 'text'},
      description: `Label de la période affichée dans le titre.

**Type**: \`string\`

**Exemple**: \`"2024"\`, \`"2022 - 2025"\``
    },
    viewTypeLabel: {
      control: {type: 'text'},
      description: `Label de la vue affichée dans le badge (optionnel).

**Type**: \`string | null\`

**Valeurs possibles**: \`"ANNÉES"\`, \`"MOIS"\`, \`"JOURS"\`, \`null\`

Lorsque \`null\`, le badge n'est pas affiché.`
    },
    defaultInitialViewType: {
      control: {type: 'select'},
      options: ['years', 'months'],
      description: `Vue initiale du sélecteur de date.

**Type**: \`'years' | 'months'\`

- \`'years'\`: Affiche la liste des années
- \`'months'\`: Affiche la grille des mois`
    },
    currentViewType: {
      control: {type: 'select'},
      options: ['years', 'months'],
      description: `Vue courante sélectionnée dans le sélecteur.

**Type**: \`'years' | 'months'\`

Cette prop contrôle l'état actuel du sélecteur.`
    },
    defaultSelectedPeriods: {
      control: {type: 'object'},
      description: `Liste des périodes pré-sélectionnées au chargement.

**Type**: \`Array<Period>\`

**Schéma Period**:
\`\`\`typescript
// Pour une année
{ type: 'year', value: number }

// Pour un mois
{ type: 'month', year: number, month: number }
\`\`\`

**Exemples**:
\`\`\`javascript
// Sélection d'années
[
  { type: 'year', value: 2023 },
  { type: 'year', value: 2024 }
]

// Sélection de mois (month: 0 = janvier)
[
  { type: 'month', year: 2024, month: 2 }, // Mars 2024
  { type: 'month', year: 2024, month: 3 }  // Avril 2024
]
\`\`\``
    },
    selectablePeriods: {
      control: {type: 'object'},
      description: `Configuration des périodes disponibles à la sélection.

**Type**: \`SelectablePeriods\`

**Schéma**:
\`\`\`typescript
{
  years?: number[]           // Années sélectionnables
  months?: {                 // Plage de mois sélectionnables
    start: Date
    end: Date
  }
}
\`\`\`

**Exemples**:
\`\`\`javascript
// Pour la vue années
{
  years: [2022, 2023, 2024, 2025]
}

// Pour la vue mois
{
  months: {
    start: new Date(2024, 0),  // Janvier 2024
    end: new Date(2024, 11)    // Décembre 2024
  }
}
\`\`\``
    },
    onSelectionChange: {
      control: false,
      description: `Callback appelée lors d'un changement de sélection.

**Type**: \`(periods: Array<Period>) => void\`

**Paramètres**:
- \`periods\`: Nouvelle liste des périodes sélectionnées

Cette fonction est appelée à chaque fois que l'utilisateur modifie sa sélection.`
    },
    children: {
      control: false,
      description: `Contenu additionnel affiché sous l'en-tête.

**Type**: \`ReactNode\`

Permet d'ajouter du contenu personnalisé sous l'en-tête de période.`
    }
  },
  args: {
    children: (
      <Box sx={{background: fr.colors.decisions.background.alt.grey.default, padding: 2}}>
        Contenu personnalisé sous l’en-tête
      </Box>
    )
  }
}

const Wrapper = ({
  periodLabel: initialPeriodLabel,
  viewTypeLabel,
  defaultInitialViewType,
  currentViewType: currentViewTypeFromArgs,
  defaultSelectedPeriods: defaultPeriodsFromArgs,
  selectablePeriods,
  children
}) => {
  const defaultPeriodsRef = useRef(defaultPeriodsFromArgs || [])
  const defaultPeriods = defaultPeriodsRef.current
  const [currentViewType, setCurrentViewType] = useState(currentViewTypeFromArgs)
  const [periodLabel, setPeriodLabel] = useState(initialPeriodLabel)

  const handleSelectionChange = periods => {
    if (periods.length > 0 && periods.every(p => p.type === 'year')) {
      // Trie les années sélectionnées
      const years = periods.map(p => p.value).sort((a, b) => a - b)
      // Affiche "2022" ou "2022 - 2025"
      setPeriodLabel(years.length === 1 ? `${years[0]}` : `${years[0]} - ${years.at(-1)}`)
      setCurrentViewType('years')
    } else if (periods.length > 0 && periods[0].type === 'month') {
      setCurrentViewType('months')
    }
  }

  return (
    <PeriodSelectorHeader
      periodLabel={periodLabel}
      viewTypeLabel={viewTypeLabel}
      defaultInitialViewType={defaultInitialViewType}
      currentViewType={currentViewType}
      defaultSelectedPeriods={defaultPeriods}
      selectablePeriods={selectablePeriods}
      onSelectionChange={handleSelectionChange}
    >
      {children}
    </PeriodSelectorHeader>
  )
}

export default meta

export const VueJours = {
  args: {
    periodLabel: '2024',
    viewTypeLabel: 'JOURS',
    defaultInitialViewType: 'months',
    currentViewType: 'months',
    selectablePeriods: {
      months: {
        start: new Date(2024, 3), // Avril 2024
        end: new Date(2024, 8) // Septembre 2024
      }
    },
    defaultSelectedPeriods: [
      {type: 'month', year: 2024, month: 3}, // Avril
      {type: 'month', year: 2024, month: 4}, // Mai
      {type: 'month', year: 2024, month: 5}, // Juin
      {type: 'month', year: 2024, month: 6}, // Juillet
      {type: 'month', year: 2024, month: 7}, // Août
      {type: 'month', year: 2024, month: 8} // Septembre
    ]
  },
  parameters: {
    docs: {
      description: {
        story: `**Vue par jours** : Affiche une sélection de mois avec le badge "JOURS".

Cette vue est utilisée quand l'utilisateur veut analyser les données jour par jour sur une période donnée. Le sélecteur de date permet de choisir des mois spécifiques, et la grille du calendrier affichera ensuite les jours de ces mois.

**Cas d'usage** : Analyse détaillée des prélèvements d'eau sur quelques mois.`
      }
    }
  },
  render: args => <Wrapper {...args} />
}

export const VueMois = {
  args: {
    periodLabel: '2023 - 2024',
    viewTypeLabel: 'MOIS',
    defaultInitialViewType: 'years',
    currentViewType: 'years',
    selectablePeriods: {
      years: [2023, 2024, 2025]
    },
    defaultSelectedPeriods: [
      {type: 'year', value: 2023},
      {type: 'year', value: 2024}
    ]
  },
  parameters: {
    docs: {
      description: {
        story: `**Vue par mois** : Affiche une sélection d'années avec le badge "MOIS".

Cette vue permet de sélectionner des années complètes, et la grille du calendrier affichera ensuite les mois de ces années. Idéale pour une analyse mensuelle sur plusieurs années.

**Cas d'usage** : Comparaison des tendances mensuelles entre différentes années.`
      }
    }
  },
  render: args => <Wrapper {...args} />
}

export const VueAnnées = {
  args: {
    periodLabel: '2018 - 2025',
    viewTypeLabel: 'ANNÉES',
    defaultInitialViewType: 'years',
    currentViewType: 'years',
    selectablePeriods: {
      years: [2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025]
    },
    defaultSelectedPeriods: [
      {type: 'year', value: 2018},
      {type: 'year', value: 2019},
      {type: 'year', value: 2020},
      {type: 'year', value: 2021},
      {type: 'year', value: 2022},
      {type: 'year', value: 2023},
      {type: 'year', value: 2024},
      {type: 'year', value: 2025}
    ]
  },
  parameters: {
    docs: {
      description: {
        story: `**Vue par années** : Affiche une sélection d'années avec le badge "ANNÉES".

Cette vue est la plus compacte et permet une sélection rapide sur une longue période. Parfaite pour analyser des tendances annuelles sur de nombreuses années.

**Cas d'usage** : Analyse des évolutions à long terme, comparaisons inter-annuelles sur une décennie.`
      }
    }
  },
  render: args => <Wrapper {...args} />
}

export const SansBadge = {
  args: {
    periodLabel: '2023 - 2024',
    viewTypeLabel: null,
    defaultInitialViewType: 'years',
    currentViewType: 'years',
    selectablePeriods: {
      years: [2022, 2023, 2024, 2025]
    },
    defaultSelectedPeriods: [
      {type: 'year', value: 2023},
      {type: 'year', value: 2024}
    ]
  },
  parameters: {
    docs: {
      description: {
        story: `**Interface épurée** : En-tête sans badge de vue.

Quand \`viewTypeLabel\` est \`null\`, seul le titre de période est affiché. Cette configuration offre une interface plus minimaliste.

**Cas d'usage** : Interfaces où le type de vue est évident ou géré ailleurs, ou pour un design plus épuré.`
      }
    }
  },
  render: args => <Wrapper {...args} />
}

export const SansContenuPersonnalisé = {
  args: {
    periodLabel: '2024',
    viewTypeLabel: 'MOIS',
    defaultInitialViewType: 'years',
    currentViewType: 'years',
    selectablePeriods: {
      years: [2023, 2024, 2025]
    },
    children: null,
    defaultSelectedPeriods: [
      {type: 'year', value: 2024}
    ]
  },
  parameters: {
    docs: {
      description: {
        story: `**Sans contenu personnalisé** : Démonstration de l'absence de la prop \`children\`.

Le composant n'affiche aucun contenu supplémentaire sous l'en-tête, offrant une interface plus épurée.

**Cas d'usage** : Interfaces où aucune information contextuelle supplémentaire n'est nécessaire.`
      }
    }
  },
  render: args => <Wrapper {...args} />
}
