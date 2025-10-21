import {fr} from '@codegouvfr/react-dsfr'
import {
  CalendarMonthOutlined, PinDropOutlined, DynamicFeedOutlined, OilBarrelOutlined
} from '@mui/icons-material'
import {Box, Typography} from '@mui/material'

import ExpendableListItem from './index.js'

const meta = {
  title: 'Components/ExpendableListItem',
  component: ExpendableListItem,
  tags: ['autodocs'],
  argTypes: {
    icon: {
      control: false,
      description: 'Composant React pour les icônes SVG venant de MUI (ex: <OilBarrelOutlinedIcon />)',
      table: {
        type: {summary: 'React.ComponentType'}
      }
    },
    iconId: {
      control: 'text',
      description: 'Class CSS pour les icônes tirées du DSFR ou de Remix Icons (ex: "fr-icon-edit-line")'
    },
    label: {
      description: 'Label de l\'élément (peut être un texte ou un composant React)',
      control: false
    },
    tags: {
      description: `Liste des tags à afficher. Chaque tag peut avoir : label (string ou React.ReactNode), severity, hasIcon

Exemple:
\`\`\`js
[
  {
    label: "2 exploitations",
    severity: "info",
    hasIcon: false
  }
]
\`\`\``,
      control: 'object'
    },
    metas: {
      description: `Liste des métadonnées à afficher. Chaque meta contient : icon (composant MUI), content (string)

Exemple:
\`\`\`js
[
  {
    icon: CalendarMonthOutlined,
    content: "Date information"
  },
  {
    icon: PinDropOutlined,
    content: "Location"
  }
]
\`\`\``,
      control: 'object'
    },
    background: {
      description: 'Couleur de fond du composant',
      control: 'radio',
      options: ['primary', 'secondary'],
      defaultValue: 'primary'
    },
    children: {
      description: 'Contenu déployable',
      control: false
    }
  },
  args: {
    icon: OilBarrelOutlined,
    iconId: '',
    label: (
      <Box className='flex align-items-center gap-1'>
        <Typography fontWeight='bold'>Label principal</Typography>
        <Box>avec texte supplémentaire</Box>
      </Box>
    ),
    tags: [
      {
        label: (
          <div className='flex align-items-center gap-1'>
            <DynamicFeedOutlined sx={{fontSize: 16}} />
            2 exploitations
          </div>
        ),
        severity: 'info',
        hasIcon: false
      }
    ],
    metas: [
      {
        icon: CalendarMonthOutlined,
        content: 'Meta information content 1'
      },
      {
        icon: PinDropOutlined,
        content: 'Meta information content 2'
      }
    ],
    background: 'primary',
    children: (
      <Box
        sx={{
          backgroundColor: fr.colors.decisions.background.alt.blueFrance.default,
          height: '200px',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center'
        }}
      >
        Contenu déployable
      </Box>
    )
  }
}

export default meta

export const Défaut = {}

export const FondSecondaire = {
  args: {
    background: 'secondary'
  }
}

export const AvecIconeDSFR = {
  args: {
    icon: undefined,
    iconId: 'fr-icon-map-pin-line'
  }
}

export const SansTag = {
  args: {
    tags: undefined
  }
}

export const SansMeta = {
  args: {
    metas: undefined
  }
}

export const Minimaliste = {
  args: {
    label: 'Configuration minimale',
    tags: undefined,
    metas: undefined,
    children: (
      <Box sx={{padding: 2}}>
        <Typography>Contenu simple</Typography>
      </Box>
    )
  }
}

export const TagsMultiples = {
  args: {
    tags: [
      {label: 'Validé', severity: 'success', hasIcon: true},
      {label: 'Prioritaire', severity: 'error', hasIcon: true},
      {label: '3 alertes', severity: 'warning', hasIcon: false},
      {label: 'Contrôlé', severity: 'info', hasIcon: true}
    ]
  }
}

export const LabelComplexe = {
  args: {
    label: (
      <Box>
        <Typography variant='h6' fontWeight='bold'>
          Titre complexe
        </Typography>
        <Typography variant='caption' color='text.secondary'>
          Sous-titre avec informations supplémentaires
        </Typography>
      </Box>
    )
  }
}

export const LabelTexteSimple = {
  args: {
    label: 'Simple texte sans composant React',
    tags: [
      {label: 'Simple', severity: 'success', hasIcon: true}
    ],
    metas: [
      {
        icon: CalendarMonthOutlined,
        content: 'Information simple'
      }
    ]
  }
}
