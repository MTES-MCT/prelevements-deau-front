import {InfoOutlined, AccessTimeOutlined, CalendarTodayOutlined} from '@mui/icons-material'

import MetasList from './index.js'

const meta = {
  title: 'Components/MetasList',
  component: MetasList,
  tags: ['autodocs'],
  argTypes: {
    metas: {
      control: 'object',
      description: 'Liste de métadonnées à afficher. Format: [{icon?, content}]. La propriété "icon" est optionnelle.'
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
