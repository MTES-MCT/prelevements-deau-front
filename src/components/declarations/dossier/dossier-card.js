import {
  ArticleOutlined,
  EventOutlined,
  InterestsOutlined,
  LocalDrinkOutlined,
  LocalShippingOutlined,
  TableRowsOutlined,
  FactoryOutlined,
  WaterDropOutlined,
  CalendarTodayOutlined
} from '@mui/icons-material'
import moment from 'moment'
import Link from 'next/link'

import ListItem from '@/components/ui/ListItem/index.js'
import {getSourcePeriodLabel, sourceStateLabels} from '@/lib/declaration.js'
import {getDeclarationTypeLabel} from '@/lib/declaration-types.js'
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
  'template-file': {
    icon: TableRowsOutlined,
    label: 'Modèle de déclaration de volumes'
  },
  'extract-aquasys': {
    icon: TableRowsOutlined,
    label: 'Extraction Aquasys'
  },
  gidaf: {
    icon: FactoryOutlined,
    label: 'Extraction Gidaf'
  },
  unknown: {
    icon: InterestsOutlined,
    label: 'Autre type de déclaration'
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
  const declarationTypeLabel = getDeclarationTypeLabel(dossier.type, dossier.declarationType)

  const metas = [
    {
      icon: ArticleOutlined,
      content: `Type de déclaration : ${declarationTypeLabel}`
    },
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
    }
  ]

  if (dossier.source?.metadata?.totalWaterVolumeWithdrawn) {
    metas.push({
      icon: WaterDropOutlined,
      content: (
        <>
          Volume prélevé : {formatNumber(dossier.source?.metadata?.totalWaterVolumeWithdrawn)}{' '}
          <span aria-label='mètres cubes' role='text'>m³</span>
        </>
      )
    })
  }

  if (dossier.source?.metadata?.totalWaterVolumeDischarged) {
    metas.push({
      icon: WaterDropOutlined,
      content: (
        <>
          Volume rejeté : {formatNumber(dossier.source?.metadata?.totalWaterVolumeDischarged)}{' '}
          <span aria-label='mètres cubes' role='text'>m³</span>
        </>
      )
    })
  }

  return metas
}

const tags = dossier => {
  const status = dossier?.source?.globalInstructionStatus

  return [sourceStateLabels[status] ?? {
    label: dossier?.source ? 'Statut inconnu' : 'Traitement en cours',
    severity: 'info'
  }]
}

const DossierCard = ({dossier, background, url}) => {
  const rightIcon = rightIcons[dossier.type] ?? rightIcons[dossier.waterWithdrawalType] ?? rightIcons.unknown

  return (
    <Link href={url || ''} style={{textDecoration: 'none'}}>
      <ListItem
        border
        title={'Déclaration n°' + dossier.code}
        subtitleIcon={ArticleOutlined}
        background={background}
        tags={tags(dossier)}
        rightIcons={[rightIcon]}
        metas={metas(dossier)}
      />
    </Link>
  )
}

export default DossierCard
