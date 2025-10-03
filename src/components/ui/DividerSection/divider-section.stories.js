import {fr} from '@codegouvfr/react-dsfr'
import {Box} from '@mui/material'

import DividerSection from './index.js'

const storyMeta = {
  title: 'Components/DividerSection',
  component: DividerSection,
  tags: ['autodocs'],
  argTypes: {
    title: {
      control: 'text',
      description: 'Titre affiché dans le Divider.'
    },
    children: {
      control: false,
      description: 'Contenu affiché sous le Divider.',
      type: 'node'
    }
  },
  args: {
    title: 'Titre de la section',
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
        Contenu de la section
      </Box>
    )
  }
}

export default storyMeta

export const Défaut = {}

