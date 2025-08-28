import {
  ArticleOutlined,
  CalendarTodayOutlined,
  InterestsOutlined,
  LocalDrinkOutlined,
  LocalShippingOutlined,
  TableRowsOutlined,
  FactoryOutlined
} from '@mui/icons-material'
import {format} from 'date-fns'

import ListItem from '@/components/ui/ListItem/index.js'

const rightIcons = {
  'camion-citerne': {
    icon: LocalShippingOutlined,
    label: 'Camion-citerne'
  },
  'icpe-hors-zre': {
    icon: FactoryOutlined,
    label: 'ICPE hors ZRE'
  },
  'aep-zre': {
    icon: LocalDrinkOutlined,
    label: 'Prélèvement AEP ou en ZRE'
  },
  autre: {
    icon: InterestsOutlined,
    label: 'Autre type de prélèvement'
  }
}

const tags = {
  error: {
    label: 'Erreur',
    severity: 'error'
  },
  warning: {
    label: 'Avertissement',
    severity: 'warning'
  },
  success: {
    label: 'Validé',
    severity: 'success'
  },
  info: {
    label: 'En attente',
    severity: 'info'
  }
}

const typeDonnees = typeDonnees => {
  if (typeDonnees === 'saisie-manuelle') {
    return 'Saisie manuelle'
  }

  if (typeDonnees === 'tableur') {
    return 'Saisie par tableur'
  }

  if (typeDonnees === 'vide') {
    return 'Type de saisie inconnu'
  }

  return typeDonnees
}

const metas = dossier => ([
  {
    icon: CalendarTodayOutlined,
    content: `Déposé le : ${format(new Date(dossier.dateDepot), 'dd/MM/yyyy')}`
  },
  {
    icon: TableRowsOutlined,
    content: typeDonnees(dossier.typeDonnees)
  }
])

const DossierCard = ({dossier, background}) => (
  <ListItem
    border
    title={dossier?.declarant?.raisonSociale
      ?? `${dossier.demandeur?.nom} ${dossier.demandeur?.prenom}`}
    subtitle={dossier.number}
    subtitleIcon={ArticleOutlined}
    background={background}
    tags={tags[dossier.validationStatus]
      ? [tags[dossier.validationStatus]]
      : []}
    rightIcons={dossier.typePrelevement
      ? [rightIcons[dossier.typePrelevement]]
      : []}
    metas={metas(dossier)}
  />
)

export default DossierCard
