import {Typography} from '@mui/material'

import LabelWithIcon from './index.js'

const meta = {
  title: 'Components/LabelWithIcon',
  component: LabelWithIcon,
  tags: ['autodocs'],
  argTypes: {
    iconId: {
      control: 'text',
      description: 'Class CSS pour les icônes tirées du DSFR ou de Remix Icons (ex: "fr-icon-edit-line")'
    },
    icon: {
      control: false, // Pas de contrôle direct, utiliser des stories dédiées
      description: 'Composant React pour les icônes SVG venant de MUI (ex: &lt;OilBarrelOutlinedIcon /&gt;)',
      table: {
        type: {summary: 'React.ComponentType'}
      }
    },
    children: {
      control: 'text',
      description: 'Contenu affiché à côté de l\'icône. Si non fourni, affiche \'Non renseigné\'.'
    }
  },
  args: {
    iconId: 'fr-icon-user-fill',
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
