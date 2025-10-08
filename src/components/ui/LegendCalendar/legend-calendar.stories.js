import {fr} from '@codegouvfr/react-dsfr'

import LegendCalendar from './index.js'

const meta = {
  title: 'Components/LegendCalendar',
  component: LegendCalendar,
  tags: ['autodocs'],
  argTypes: {
    labels: {
      control: 'object',
      description: `Tableau d'objets pour chaque légende à afficher.

Schéma :
  \`\`\`json
[
  {
    color: string,
    label: string
  }
]
  \`\`\`
  `
    }
  },
  args: {
    labels: [
      {color: fr.colors.decisions.text.actionHigh.blueFrance.default, label: 'Légende A'},
      {color: fr.colors.decisions.background.actionHigh.warning.hover, label: 'Légende B'},
      {color: fr.colors.decisions.background.actionHigh.info.default, label: 'Légende C'},
      {color: fr.colors.decisions.text.disabled.grey.default, label: 'Légende D'}
    ]
  }
}

export default meta

export const Défaut = {}
