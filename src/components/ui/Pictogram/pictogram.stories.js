import {StarBorderOutlined} from '@mui/icons-material'

import Pictogram from './index.js'

const meta = {
  title: 'Components/Pictogram',
  component: Pictogram,
  tags: ['autodocs'],
  argTypes: {
    pictogram: {
      control: false,
      description: 'Composant React du pictogramme à afficher. Exemple: l’icône MUI `StarBorderOutlined`.'
    }
  },
  args: {
    pictogram: StarBorderOutlined
  }
}

export default meta

export const Défaut = {}
