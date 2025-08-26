import {
  CalendarMonthOutlined, ArticleOutlined, CalendarTodayOutlined, EventAvailableOutlined, TableRowsOutlined,
  LocalShippingOutlined
} from '@mui/icons-material'

import ListItem from './index.js'

const meta = {
  title: 'Components/ListItem',
  component: ListItem,
  tags: ['autodocs'],
  args: {
    title: 'Département de la Réunion',
    subtitle: '24715964',
    subtitleIcon: ArticleOutlined,
    tags: [{label: 'valide', severity: 'success'}, {label: 'accepté', severity: 'success'}],
    metas: [
      {icon: CalendarMonthOutlined, content: 'Déposition de mai'},
      {icon: CalendarTodayOutlined, content: 'Déposé le 12/08/2025'},
      {icon: EventAvailableOutlined, content: 'Validé le 20/08/2025'},
      {icon: TableRowsOutlined, content: 'Saisie par tableur'}
    ],
    rightIcons: [
      {
        label: 'Camion citerne',
        icon: LocalShippingOutlined
      }
    ],
    background: 'primary'
  },
  argTypes: {
    background: {
      control: {type: 'radio'},
      options: ['primary', 'secondary']
    }
  }
}

export default meta

export const Default = {}

export const BackgroundSecondary = {
  args: {
    background: 'secondary'
  }
}

export const WithoutMetas = {
  args: {
    metas: null,
    background: 'secondary'
  }
}

export const WithoutSubtitleIcon = {
  args: {
    subtitleIcon: null,
    background: 'secondary'
  }
}

export const WithoutTags = {
  args: {
    tags: null,
    background: 'secondary'
  }
}

export const WithoutExtras = {
  args: {
    rightIcons: null,
    background: 'secondary'
  }
}
