import {
  CalendarMonthOutlined,
  LocalShippingOutlined,
  AgricultureOutlined
} from '@mui/icons-material'

import EntityHeader from './index.js'

const storyMeta = {
  title: 'Components/EntityHeader',
  component: EntityHeader,
  tags: ['autodocs'],
  argTypes: {
    title: {
      control: 'text',
      description: 'Titre principal de l’entité.'
    },
    iconId: {
      description: 'Icône affichée à côté du titre.'
    },
    metas: {
      control: 'object',
      description: 'Liste de métadonnées [{icon, content}].'
    },
    rightBadges: {
      control: 'object',
      description: 'Badges affichés à droite [{icon, label}].'
    },
    tags: {
      control: 'object',
      description: 'Liste de tags [{label, severity}].'
    },
    hrefButtons: {
      control: 'object',
      description: 'Boutons d\'action [{label, icon, alt, priority, handleClick, href}].'
    }
  },
  args: {
    title: '100 - Exploitation',
    iconId: 'fr-icon-user-line',
    metas: [
      {icon: CalendarMonthOutlined, content: 'Dernier prélèvement le 10 août 2025'}
    ],
    rightBadges: [
      {icon: LocalShippingOutlined, label: 'Camion citerne'}
    ],
    tags: [
      {label: 'EN ACTIVITÉ', severity: 'info'}
    ],
    hrefButtons: [
      {
        label: 'Éditer',
        icon: 'fr-icon-edit-line',
        alt: '',
        priority: 'secondary',
        href: '/'
      }
    ],
    children: <p>Contenu principal de l’entête</p>
  }
}

export default storyMeta

export const Default = args => <EntityHeader {...args} />

export const MoreThanOneAction = args => (
  <EntityHeader {...args} hrefButtons={[
    {
      label: 'Éditer',
      icon: 'fr-icon-edit-line',
      alt: '',
      href: '/'
    },
    {
      label: 'Voir',
      icon: 'fr-icon-arrow-right-line',
      priority: 'primary',
      alt: '',
      href: '/'
    }
  ]} />
)

export const MoreThanOneRightBadge = args => (
  <EntityHeader {...args} rightBadges={[
    {icon: LocalShippingOutlined, label: 'Camion citerne'},
    {icon: AgricultureOutlined, label: 'Agriculture'}
  ]} />
)

export const WithoutMetas = args => (
  <EntityHeader {...args} metas={[]} />
)

export const WithoutRightBadges = args => (
  <EntityHeader {...args} rightBadges={[]} />
)

export const WithoutTags = args => (
  <EntityHeader {...args} tags={[]} />
)

export const WithoutActions = args => (
  <EntityHeader {...args} hrefButtons={null} />
)

export const WithoutTitleIcon = args => (
  <EntityHeader {...args} titleIcon={null} />
)
