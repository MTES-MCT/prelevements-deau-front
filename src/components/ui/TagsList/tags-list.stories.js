import TagsList from './index.js'

const meta = {
  title: 'Components/TagsList',
  component: TagsList,
  tags: ['autodocs'],
  argTypes: {
    tags: {
      control: 'object',
      description: 'Liste de tags affichés. Chaque tag accepte {label, severity}.'
    }
  },
  args: {
    tags: [
      {label: 'valide', severity: 'success'},
      {label: 'accepté', severity: 'success'},
      {label: 'en attente', severity: 'warning'}
    ]
  }
}

export default meta

export const Default = {
  args: {
    tags: [
      {label: 'info', severity: 'info'},
      {label: 'succès', severity: 'success'},
      {label: 'alerte', severity: 'warning'},
      {label: 'erreur', severity: 'error'}
    ]
  }
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
