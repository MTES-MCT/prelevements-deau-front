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
    },
    size: {
      control: {type: 'radio'},
      options: ['sm', 'md'],
      description: 'Taille des icônes (sm: 16px, md: 18px)',
      table: {
        type: {summary: 'string'},
        defaultValue: {summary: 'md'}
      }
    }
  },
  args: {
    metas: [
      {icon: InfoOutlined, content: 'Information'},
      {icon: AccessTimeOutlined, content: 'Horodatage'},
      {icon: CalendarTodayOutlined, content: 'Date'},
      {content: 'Sans icône'}
    ],
    size: 'md'
  }
}

const renderMetasList = args => {
  const {metas, size} = args

  return <MetasList metas={metas} size={size} />
}

export default meta

export const Default = {render: renderMetasList}

export const Small = {
  args: {
    size: 'sm'
  },
  render: renderMetasList
}

export const SansIcones = {
  args: {
    metas: [
      {content: 'Aucune icône 1'},
      {content: 'Aucune icône 2'}
    ]
  },
  render: renderMetasList
}

export const AvecIconeDSFR = {
  args: {
    metas: [
      {iconId: 'fr-icon-calendar-line', content: 'Avec icône DSFR'},
      {iconId: 'fr-icon-time-line', content: 'Horodatage'},
      {icon: InfoOutlined, content: 'Avec icône MUI'}
    ]
  },
  render: renderMetasList
}

export const Vide = {
  args: {metas: []},
  render: renderMetasList
}
