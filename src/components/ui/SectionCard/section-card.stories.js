import {Box} from '@mui/system'

import SectionCard from './index.js'

const meta = {
  title: 'Components/SectionCard',
  component: SectionCard,
  tags: ['autodocs'],
  argTypes: {
    title: {
      control: 'text',
      description: 'Titre affiché dans la carte. Type : string.'
    },
    icon: {
      control: 'text',
      description: 'Nom de la classe CSS pour l’icône affichée à gauche du titre. Type : string.'
    },
    buttonProps: {
      control: 'object',
      description: 'Props passées au bouton d’action (objet, optionnel).'
    },
    children: {
      control: 'text',
      description: 'Contenu de la carte (ReactNode).'
    }
  },
  args: {
    title: 'Titre de section',
    icon: 'fr-icon-information-fill fr-icon--sm',
    buttonProps: {
      priority: 'secondary',
      children: 'label du bouton'
    },
    children: <Box>Ceci est le contenu de la carte de section.</Box>
  }
}

export default meta

export const Défaut = {}

export const SansBouton = {
  args: {
    buttonProps: undefined
  }
}

export const SansIcône = {
  args: {
    icon: ''
  }
}

export const SansContenu = {
  args: {
    children: null
  }
}
