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
      {label: 'info', severity: 'info'},
      {label: 'succès', severity: 'success'},
      {label: 'alerte', severity: 'warning'},
      {label: 'erreur', severity: 'error'}
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
      {label: 'Tag 1'},
      {label: 'Tag 2'}
    ]
  }
}

export const Empty = {
  args: {
    tags: []
  }
}
