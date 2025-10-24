import DocumentItem from './index.js'

const meta = {
  title: 'Components/DocumentItem',
  component: DocumentItem,
  tags: ['autodocs'],
  argTypes: {
    title: {control: 'text', description: 'Titre du document.'},
    subtitle: {control: 'text', description: 'Sous-titre du document.'},
    info: {control: 'text', description: 'Info bulle affichée en tooltip.'},
    onEdit: {action: 'edit clicked', description: 'Callback pour l’édition.'},
    onDelete: {action: 'delete clicked', description: 'Callback pour la suppression.'},
    viewUrl: {control: 'text', description: 'URL pour voir le document.'},
    background: {
      control: {type: 'radio'},
      options: ['primary', 'secondary'],
      description: 'Couleur de fond du composant.'
    }
  },
  args: {
    title: 'Nom du document.pdf',
    subtitle: 'Infos complémentaires',
    info: 'Commentaire sur le document (optionnel)',
    background: 'primary',
    viewUrl: 'https://example.com/document.pdf'
  }
}

const renderDocumentItem = args => <DocumentItem {...args} />

export default meta

export const Default = {render: renderDocumentItem}

export const FondSecondaire = {
  args: {
    background: 'secondary'
  },
  render: renderDocumentItem
}

export const VisionnageSeul = {
  args: {
    onEdit: undefined,
    onDelete: undefined
  },
  render: renderDocumentItem
}

export const SansActions = {
  args: {
    onEdit: undefined,
    onDelete: undefined,
    viewUrl: undefined
  },
  render: renderDocumentItem
}

export const AvecInfo = {
  args: {
    info: 'Ce document est confidentiel'
  },
  render: renderDocumentItem
}

export const SansInfo = {
  args: {
    info: undefined
  },
  render: renderDocumentItem
}
