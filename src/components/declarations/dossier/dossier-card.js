import {
  ArticleOutlined,
  EventOutlined,
  InterestsOutlined,
  LocalDrinkOutlined,
  LocalShippingOutlined,
  TableRowsOutlined,
  FactoryOutlined,
  WaterDropOutlined, CalendarTodayOutlined
} from '@mui/icons-material'
import moment from 'moment'
import Link from 'next/link'

import ListItem from '@/components/ui/ListItem/index.js'
import {getSourcePeriodLabel, sourceStateLabels} from '@/lib/declaration.js'
import {formatNumber} from '@/utils/number.js'
import 'moment/locale/fr'

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
  const dateDepot = dossier.createdAt ? moment(dossier.createdAt).format('LL') : 'Non renseigné'
  const periodLabel = getSourcePeriodLabel(dossier?.source)

  return [
    {
      icon: EventOutlined,
      content: `Date de dépôt : ${dateDepot}`
    },
    {
      icon: CalendarTodayOutlined,
      content: `Période concernée : ${periodLabel ?? 'Non renseignée'}`
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
      title={'Déclaration n°' + dossier.code}
      subtitleIcon={ArticleOutlined}
      background={background}
      tags={[sourceStateLabels[dossier?.source?.globalInstructionStatus]]}
      rightIcons={dossier.waterWithdrawalType
        ? [rightIcons[dossier.waterWithdrawalType]]
        : []}
      metas={metas(dossier)}
    />
  </Link>
)

export default DossierCard
