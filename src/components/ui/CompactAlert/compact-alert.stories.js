import CompactAlert from './index.js'

const storyMeta = {
  title: 'Components/CompactAlert',
  component: CompactAlert,
  tags: ['autodocs'],
  argTypes: {
    label: {
      control: 'text',
      description: 'Texte affiché dans l’alerte.'
    },
    alertType: {
      control: {type: 'select'},
      options: ['info', 'warning', 'error', 'missing'],
      description: 'Type d’alerte (définit l’icône et la couleur).'
    }
  },
  args: {
    label: 'Ceci est une alerte de type "info"',
    alertType: 'info'
  }
}

export default storyMeta

export const Info = args => <CompactAlert {...args} />

export const Avertissement = args => (
  <CompactAlert {...args} alertType='warning' label='Ceci est une alerte de type "warning"' />
)

export const Erreur = args => (
  <CompactAlert {...args} alertType='error' label='Ceci est une alerte de type "error"' />
)

export const DonnéesManquantes = args => (
  <CompactAlert {...args} alertType='missing' label='Ceci est une alerte de type "missing"' />
)
