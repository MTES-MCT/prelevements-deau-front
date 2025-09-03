import TagsList from './index.js'

const meta = {
  title: 'Components/TagsList',
  component: TagsList,
  tags: ['autodocs'],
  argTypes: {
    tags: {
      control: 'object',
      description: 'List of displayed tags. Each tag accepts {label, severity}.'
    }
  },
  args: {
    tags: [
      {label: 'info', severity: 'info', id: 1},
      {label: 'succès', severity: 'success', id: 2},
      {label: 'alerte', severity: 'warning', id: 3},
      {label: 'erreur', severity: 'error', id: 4}
    ]
  }
}

export default meta

export const Default = {
  args: {}
}

export const WithoutSeverity = {
  args: {
    tags: [
      {label: 'Tag 1', id: 1},
      {label: 'Tag 2', id: 2}
    ]
  }
}

export const Empty = {
  args: {
    tags: []
  }
}
