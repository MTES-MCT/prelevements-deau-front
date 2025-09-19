import {WaterDropOutlined} from '@mui/icons-material'

import PeriodTooltip from './index.js'

const storyMeta = {
  title: 'Components/PeriodTooltip',
  component: PeriodTooltip,
  tags: ['autodocs'],
  argTypes: {
    periodLabel: {
      control: 'text',
      description: 'Libellé de la période affichée dans l’info-bulle. Exemple : "2025", "Janvier 2024", "2023-2024"...'
    },
    parameters: {
      control: 'object',
      description: `Paramètres à afficher dans l’info-bulle.
  \`\`\`json
   [
      {
        "icon": <Icône>,
        "content": <string>
      }
    ]
    \`\`\`
`
    },
    alerts: {
      control: 'array',
      description: `Tableau d’alertes à afficher dans l’info-bulle.
\`\`\`json
[
  {
    "alertLabel": <string>,
    "alertType": "info" | "warning" | "missing"
  }
]
  \`\`\`
  `
    },
    children: {
      control: 'text',
      description: 'Contenu affiché qui déclenche l’info-bulle.'
    }
  },
  args: {
    periodLabel: '2025',
    parameters: [{icon: WaterDropOutlined, content: '12 900 m3 de volume prélevé'}],
    alerts: [
      {alertLabel: '4 mois avec absence de prélèvement', alertType: 'info'},
      {alertLabel: '1 mois avec alertes', alertType: 'warning'},
      {alertLabel: '2 mois sans déclaration', alertType: 'missing'}
    ],
    children: 'Survoler pour en savoir plus'
  }
}

export default storyMeta

const renderPrelevementsHistory = args => <PeriodTooltip {...args} />

export const Default = {render: renderPrelevementsHistory}

export const SansParametres = {
  args: {
    parameters: null,
    children: 'Les paramètres ne seront pas affichés dans l’info-bulle'
  },
  render: renderPrelevementsHistory
}

export const SansAlertes = {
  args: {
    alerts: null,
    children: 'Les alertes ne seront pas affichées dans l’info-bulle'
  },
  render: renderPrelevementsHistory
}

export const SansParametresEtSansAlertes = {
  args: {
    parameters: null,
    alerts: null,
    children: 'Les paramètres et les alertes ne seront pas affichés dans l’info-bulle'
  },
  render: renderPrelevementsHistory
}

export const AvecDesLabelsLongs = {
  args: {
    periodLabel: 'Période de prélèvement 2023-2024',
    children: 'Le label de la période peut être plus long'
  },
  render: renderPrelevementsHistory
}

