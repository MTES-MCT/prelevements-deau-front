import {
  ArticleOutlined,
  CalendarTodayOutlined,
  InterestsOutlined,
  LocalDrinkOutlined,
  LocalShippingOutlined,
  TableRowsOutlined,
  FactoryOutlined
} from '@mui/icons-material'
import Link from 'next/link'

import ListItem from '@/components/ui/ListItem/index.js'
import {getDossierPeriodLabel} from '@/lib/dossier.js'

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
    return 'Saisie par fichier'
  }

  if (typeDonnees === 'vide') {
    return 'Déclaration vide'
  }

  return typeDonnees
}

const metas = dossier => {
  const periodLabel = getDossierPeriodLabel(dossier)

  return [
    {
      icon: CalendarTodayOutlined,
      content: `Période concernée : ${periodLabel ?? 'Non renseignée'}`
    },
    {
      icon: TableRowsOutlined,
      content: typeDonnees(dossier.typeDonnees)
    }
  ]
}

const DossierCard = ({dossier, background, url}) => (
  <Link href={url || ''} style={{textDecoration: 'none'}}>
    <ListItem
      border
      title={dossier?.declarant?.raisonSociale
        ?? `${dossier.demandeur?.nom} ${dossier.demandeur?.prenom}`}
      subtitle={dossier.ds.dossierNumber}
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
  </Link>
)

export default DossierCard
