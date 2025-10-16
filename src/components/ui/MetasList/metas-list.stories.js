import {InfoOutlined, AccessTimeOutlined, CalendarTodayOutlined} from '@mui/icons-material'

import MetasList from './index.js'

const meta = {
  title: 'Components/MetasList',
  component: MetasList,
  tags: ['autodocs'],
  argTypes: {
    metas: {
      control: 'object',
      description: `
Liste de métadonnées à afficher. Format: [{iconId?, icon?, content}]. Les propriétés "iconId" et "icon" sont optionnelles.

Si "iconId" est fourni, il sera prioritaire sur "icon" et une icone du DSFR sera importée avec cette className.

Si "icon" est fourni, il doit s'agir d'un composant React (ex: une icône MUI).`
    }
  },
  args: {
    metas: [
      {icon: InfoOutlined, content: 'Information'},
      {icon: AccessTimeOutlined, content: 'Horodatage'},
      {icon: CalendarTodayOutlined, content: 'Date'},
      {content: 'Sans icône'}
    ]
  }
}

const renderMetasList = args => {
  const {metas} = args

  return <MetasList metas={metas} />
}

export default meta

export const Default = {render: renderMetasList}

export const SansIcones = {
  args: {
    metas: [
      {content: 'Aucune icône 1'},
      {content: 'Aucune icône 2'}
    ]
  },
  render: renderMetasList
}

export const Vide = {
  args: {metas: []},
  render: renderMetasList
}
