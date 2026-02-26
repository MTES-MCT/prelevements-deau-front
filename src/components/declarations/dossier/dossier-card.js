import {
  ArticleOutlined,
  EventOutlined,
  InterestsOutlined,
  LocalDrinkOutlined,
  LocalShippingOutlined,
  TableRowsOutlined,
  FactoryOutlined,
  WaterDropOutlined
} from '@mui/icons-material'
import {format} from 'date-fns'
import {fr} from 'date-fns/locale'
import Link from 'next/link'

import ListItem from '@/components/ui/ListItem/index.js'
import {formatNumber} from '@/utils/number.js'

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
  unknown: {
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
  if (typeDonnees === 'MANUAL') {
    return 'Saisie manuelle'
  }

  if (typeDonnees === 'SPREADSHEET') {
    return 'Saisie par fichier'
  }

  if (typeDonnees === 'NONE') {
    return 'Aucun fichier transmis'
  }

  return typeDonnees
}

const metas = dossier => {
  const dateDepot = dossier.createdAt
    ? format(new Date(dossier.createdAt), 'dd/MM/yyyy', {locale: fr})
    : 'Non renseignée'

  return [
    {
      icon: EventOutlined,
      content: `Date de dépôt : ${dateDepot}`
    },
    {
      icon: TableRowsOutlined,
      content: typeDonnees(dossier.dataSourceType)
    },
    {
      icon: WaterDropOutlined,
      content: dossier.source?.metadata?.totalWaterVolumeWithdrawn
        ? (
          <>
            Volume prélevé : {formatNumber(dossier.source?.metadata?.totalWaterVolumeWithdrawn)}{' '}
            <span aria-label='mètres cubes' role='text'>m³</span>
          </>
        )
        : 'Aucun volume prélevé déclaré'
    }
  ]
}

const DossierCard = ({dossier, background, url}) => (
  <Link href={url || ''} style={{textDecoration: 'none'}}>
    <ListItem
      border
      title={dossier?.declarant?.socialReason
        ?? `${dossier.declarant?.user?.lastName} ${dossier.declarant?.user?.firstName}`}
      subtitle={'n°' + dossier.code}
      subtitleIcon={ArticleOutlined}
      background={background}
      tags={tags[dossier.status]
        ? [tags[dossier.status]]
        : []}
      rightIcons={dossier.waterWithdrawalType
        ? [rightIcons[dossier.waterWithdrawalType]]
        : []}
      metas={metas(dossier)}
    />
  </Link>
)

export default DossierCard
