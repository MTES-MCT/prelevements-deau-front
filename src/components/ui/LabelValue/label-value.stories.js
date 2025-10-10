import {Typography} from '@mui/material'

import LabelValue from './index.js'

const meta = {
  title: 'Components/LabelValue',
  component: LabelValue,
  tags: ['autodocs'],
  argTypes: {
    label: {
      control: 'text',
      description: 'Texte du libellé affiché avant ou au-dessus de la valeur. Type: string. Obligatoire.'
    },
    children: {
      control: false,
      description: 'Contenu complet alternatif (ReactNode). Si fourni, il remplace la prop `value` pour le rendu. Optionnel'
    }
  },
  args: {
    label: 'Label',
    children: (
      <Typography variant='body1'>
        Valeur affichée.
      </Typography>
    )
  }
}

export default meta

export const Défaut = {}
export const SansChildren = {
  args: {
    children: null
  }
}
