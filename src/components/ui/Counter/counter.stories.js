import Counter from './index.js'

const meta = {
  title: 'Components/Counter',
  component: Counter,
  tags: ['autodocs'],
  argTypes: {
    label: {
      control: 'text',
      description: 'Libellé affiché au-dessus du nombre. Type : string.'
    },
    number: {
      control: 'number',
      description: 'Valeur numérique affichée en grand. Type : number.'
    }
  },
  args: {
    label: 'Nombre de prélèvements',
    number: 42
  }
}

export default meta

export const Défaut = {}

export const SansNombre = {
  args: {
    number: undefined
  }
}

export const SansLabel = {
  args: {
    label: undefined
  }
}

export const LabelLong = {
  args: {
    label: 'Nombre total de prélèvements effectués sur l’ensemble des points de prélèvement au cours de l’année écoulée'
  }
}
