import {
  CalendarMonthOutlined,
  ArticleOutlined,
  CalendarTodayOutlined,
  EventAvailableOutlined,
  TableRowsOutlined,
  LocalShippingOutlined
} from '@mui/icons-material'

import ListItem from './index.js'

const iconMapping = {
  none: null,
  withIcon: ArticleOutlined
}

const meta = {
  title: 'Components/ListItem',
  component: ListItem,
  tags: ['autodocs'],
  argTypes: {
    title: {control: 'text', description: 'Titre principal de l’élément. Obligatoire.'},
    subtitle: {control: 'text', description: 'Sous-titre de l’élément. Optionnel.'},
    subtitleIcon: {
      options: Object.keys(iconMapping),
      mapping: iconMapping,
      control: {type: 'radio'},
      description: 'Afficher ou non l’icône avant le sous-titre.'
    },
    tags: {
      control: 'object',
      description: 'Liste de tags affichés au-dessus du titre. Chaque tag accepte {label, severity}.'
    },
    metas: {
      control: 'object',
      description: 'Liste de métadonnées affichées sous le contenu. Format: [{iconKey, content}].'
    },
    rightIcons: {
      control: 'object',
      description: 'Icônes à droite du titre avec tooltip. Format: [{iconKey, label}].'
    },
    background: {
      control: {type: 'radio'},
      options: ['primary', 'secondary'],
      description: 'Couleur de fond du composant.'
    }
  },
  args: {
    title: 'Département de la Réunion',
    subtitle: '24715964',
    subtitleIcon: 'withIcon',
    tags: [
      {label: 'valide', severity: 'success'},
      {label: 'accepté', severity: 'success'}
    ],
    metas: [
      {iconKey: 'CalendarMonthOutlined', content: 'Transmission du mois de mai'},
      {iconKey: 'CalendarTodayOutlined', content: 'Déposé le 12/08/2025'},
      {iconKey: 'EventAvailableOutlined', content: 'Validé le 20/08/2025'},
      {iconKey: 'TableRowsOutlined', content: 'Saisie par tableur'}
    ],
    rightIcons: [
      {iconKey: 'LocalShippingOutlined', label: 'Camion citerne'}
    ],
    background: 'primary'
  }
}

const renderListItem = args => {
  const {subtitleIcon, metas, rightIcons, ...rest} = args

  const mappedMetas = (metas || []).map(m => ({
    icon: {
      CalendarMonthOutlined,
      CalendarTodayOutlined,
      EventAvailableOutlined,
      TableRowsOutlined
    }[m.iconKey] || null,
    content: m.content
  }))

  const mappedRightIcons = (rightIcons || []).map(r => ({
    icon: {
      LocalShippingOutlined
    }[r.iconKey] || null,
    label: r.label
  }))

  return (
    <ListItem
      {...rest}
      subtitleIcon={subtitleIcon}
      metas={mappedMetas}
      rightIcons={mappedRightIcons}
    />
  )
}

export default meta

export const Default = {render: renderListItem}

export const BackgroundSecondary = {args: {background: 'secondary'}, render: renderListItem}

export const WithoutMetas = {args: {metas: []}, render: renderListItem}

export const WithoutRightIcons = {args: {rightIcons: []}, render: renderListItem}

export const WithoutSubtitleIcon = {args: {subtitleIcon: 'none'}, render: renderListItem}

export const Simple = {
  args: {
    title: 'Test',
    subtitle: '123',
    tags: [],
    metas: [],
    rightIcons: [],
    subtitleIcon: 'none'
  },
  render: renderListItem
}
