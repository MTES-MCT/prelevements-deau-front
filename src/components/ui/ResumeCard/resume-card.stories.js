import {action} from 'storybook/actions'

import ResumeCard from './index.js'

const meta = {
  title: 'Components/ResumeCard',
  component: ResumeCard,
  tags: ['autodocs'],
  argTypes: {
    alertType: {
      control: {type: 'select'},
      options: ['info', 'success', 'warning', 'error'],
      description: 'Type d’alerte (définit l’icône et la couleur).'
    },
    label: {
      control: 'text',
      description: 'Titre ou label principal de la carte.',
      table: {
        type: {summary: 'string'}
      }
    },
    value: {
      control: 'text',
      description: 'Valeur numérique ou texte mise en avant (ex: nombre d’éléments).',
      table: {
        type: {summary: 'string | number'}
      }
    },
    hint: {
      control: 'text',
      description: 'Description associée à la valeur principale.',
      table: {
        type: {summary: 'string'}
      }
    },
    actionLabel: {
      control: 'text',
      description: 'Texte du bouton d’action.',
      table: {
        type: {summary: 'string'}
      }
    },
    handleClick: {
      control: 'function',
      description: 'Callback appelé lors du clic sur le bouton d’action.',
      table: {
        type: {summary: 'function'}
      }
    }
  },
  args: {
    alertType: 'info',
    label: 'Exploitations en fin de validité',
    value: '12',
    hint: 'exploitations arrivent à expiration',
    actionLabel: 'Consulter la page',
    handleClick: action('handleClick')
  }
}

export default meta

export const Défaut = {}

export const Succès = {
  args: {
    alertType: 'success'
  }
}

export const Avertissement = {
  args: {
    alertType: 'warning'
  }
}

export const Erreur = {
  args: {
    alertType: 'error'
  }
}

export const SansAction = {
  args: {
    actionLabel: '',
    handleClick: undefined
  }
}
