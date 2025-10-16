import {Star} from '@mui/icons-material'

import InfoBox from './index.js'

const meta = {
  title: 'Components/InfoBox',
  component: InfoBox,
  tags: ['autodocs'],
  argTypes: {
    icon: {
      control: 'object',
      description: 'Icône affichée avant le label. Type: Object. Optionnel.'
    },
    label: {
      control: 'text',
      description: 'Texte du label affiché. Type: string. Obligatoire.'
    },
    description: {
      control: 'text',
      description: 'Texte de la description affichée. Type: string. Obligatoire.'
    }
  },
  args: {
    icon: <Star />,
    label: 'Label',
    description: 'valeur associée au label'
  }
}

export default meta

export const Défaut = {}
