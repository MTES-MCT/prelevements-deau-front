import {Typography} from '@mui/material'

import LabelWithIcon from './index.js'

const meta = {
  title: 'Components/LabelWithIcon',
  component: LabelWithIcon,
  tags: ['autodocs'],
  argTypes: {
    icon: {
      control: 'text',
      description: 'Nom de la classe CSS de l\'icône à afficher (string).'
    },
    children: {
      control: 'text',
      description: 'Contenu affiché à côté de l\'icône. Si non fourni, affiche \'Non renseigné\'.'
    }
  },
  args: {
    icon: 'fr-icon-user-fill',
    children: (
      <Typography variant='body1'>
        Valeur affichée.
      </Typography>
    )
  }
}

export default meta

export const Défaut = {}
export const ChildrenEnTantQueTexte = {
  args: {
    children: 'Texte simple en tant qu\'enfant'
  }
}

export const SansChildren = {
  args: {
    children: null
  }
}
