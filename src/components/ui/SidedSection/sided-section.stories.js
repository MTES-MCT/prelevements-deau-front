import {fr} from '@codegouvfr/react-dsfr'
import {Box} from '@mui/material'

import SidedSection from './index.js'

const meta = {
  title: 'Components/SidedSection',
  component: SidedSection,
  tags: ['autodocs'],
  argTypes: {
    title: {
      control: 'text',
      description: 'Titre principal affiché en haut de la section.',
      type: 'string'
    },
    subtitle: {
      control: 'text',
      description: 'Sous-titre affiché sous le titre principal, peut être plus long.',
      type: 'string'
    },
    background: {
      control: {type: 'radio'},
      options: ['primary', 'secondary'],
      description: 'Définit la couleur de fond de la section : \'primary\' (bleu) ou \'secondary\' (gris clair).',
      type: 'string'
    },
    firstContent: {
      table: {disable: false},
      description: 'Premier bloc de contenu.',
      type: 'node'
    },
    secondContent: {
      table: {disable: false},
      description: 'Second bloc de contenu.',
      type: 'node'
    },
    children: {
      table: {disable: false},
      description: 'Contenu additionnel affiché sous les deux blocs principaux ou tout seul si les blocs sont absents.',
      type: 'node'
    }
  },
  args: {
    title: 'Titre de la section',
    subtitle: 'Sous-titre de la section : peut être plus long et occuper plusieurs lignes',
    background: 'primary',
    firstContent: (
      <Box
        sx={{
          backgroundColor: fr.colors.decisions.background.default.grey.default,
          border: `1px solid ${fr.colors.decisions.border.active.blueFrance.default}`,
          width: '100%',
          height: '400px',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center'
        }}
      >
        Premier bloc
      </Box>
    ),
    secondContent: (
      <Box
        sx={{
          backgroundColor: fr.colors.decisions.background.default.grey.default,
          border: `1px solid ${fr.colors.decisions.border.active.blueFrance.default}`,
          width: '100%',
          height: '400px',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center'
        }}
      >
        Second bloc
      </Box>
    ),
    children: (
      <Box
        sx={{
          backgroundColor: fr.colors.decisions.background.default.grey.default,
          border: `1px solid ${fr.colors.decisions.border.active.blueFrance.default}`,
          width: '100%',
          height: '200px',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center'
        }}
      >
        Contenu optionnel, secondaire ou principal selon le contexte.
      </Box>
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

export const SansPremierBloc = {
  args: {
    firstContent: null
  }
}

export const SansSecondBloc = {
  args: {
    secondContent: null
  }
}

export const SansPremierEtSecondBloc = {
  args: {
    firstContent: null,
    secondContent: null
  }
}

export const AvecBackgroundSecondaire = {
  args: {
    background: 'secondary'
  }
}

export const SansTitre = {
  args: {
    title: null
  }
}

export const SansSousTitre = {
  args: {
    subtitle: null
  }
}

export const SansTitreEtSousTitre = {
  args: {
    title: null,
    subtitle: null
  }
}
