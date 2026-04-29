import {
  ArticleOutlined,
  EventOutlined,
  InterestsOutlined,
  WaterDropOutlined,
  DescriptionOutlined,
  LocationOnOutlined,
  CalendarTodayOutlined,
  SyncOutlined,
  SensorsOutlined
} from '@mui/icons-material'
import moment from 'moment'
import Link from 'next/link'

import ListItem from '@/components/ui/ListItem/index.js'
import {getSourcePeriodLabel, sourceStateLabels} from '@/lib/declaration.js'
import {formatNumber} from '@/utils/number.js'
import 'moment/locale/fr'

const rightIcons = {
  DECLARATION: {
    icon: DescriptionOutlined,
    label: 'Déclaration'
  },
  API: {
    icon: SyncOutlined,
    label: 'API'
  },
  unknown: {
    icon: InterestsOutlined,
    label: 'Autre'
  }
}

const connectorLabels = new Map([
  ['orange_live_objects', 'Orange Live Objects'],
  ['willie', 'Willie'],
  ['aquasys', 'Aquasys'],
  ['template_file', 'Fichier modèle']
])

const getConnectorLabel = source => {
  const connector = source?.metadata?.connector

  if (!connector) {
    return 'Connecteur API'
  }

  return connectorLabels.get(connector) ?? connector
}

const getApiPointLabel = source => {
  const chunks = source?.chunks ?? []
  const firstChunk = chunks[0]

  if (firstChunk?.pointPrelevementName) {
    return firstChunk.pointPrelevementName
  }

  if (firstChunk?.pointPrelevement?.name) {
    return firstChunk.pointPrelevement.name
  }

  if (source?.metadata?.sourcePointId) {
    return source.metadata.sourcePointId
  }

  return 'Point non renseigné'
}

const getDeclarationTitle = source => {
  if (source?.declaration?.declarant?.socialReason) {
    return source.declaration.declarant.socialReason
  }

  const lastName = source?.declaration?.declarant?.user?.lastName
  const firstName = source?.declaration?.declarant?.user?.firstName

  return [lastName, firstName].filter(Boolean).join(' ') || 'Déclarant non renseigné'
}

const getTitle = source => {
  if (source?.type === 'API') {
    return getConnectorLabel(source)
  }

  return getDeclarationTitle(source)
}

const getSubtitle = source => {
  if (source?.type === 'API') {
    return getApiPointLabel(source)
  }

  return `n° ${source?.declaration?.code ?? ''}`
}

const getSubtitleIcon = source => {
  if (source?.type === 'API') {
    return SensorsOutlined
  }

  return ArticleOutlined
}

const hasMetadataNumber = value => typeof value === 'number' && Number.isFinite(value)

const metas = source => {
  const isApiSource = source?.type === 'API'

  const referenceDate = isApiSource
    ? source?.metadata?.lastRunAt ?? source?.createdAt
    : source?.createdAt

  const formattedDate = referenceDate
    ? moment(referenceDate).format('LL')
    : 'Non renseignée'

  const periodLabel = getSourcePeriodLabel(source)

  const items = [
    {
      icon: EventOutlined,
      content: isApiSource
        ? `Date de synchronisation : ${formattedDate}`
        : `Date de dépôt : ${formattedDate}`
    },
    {
      icon: CalendarTodayOutlined,
      content: `Période concernée : ${periodLabel ?? 'Non renseignée'}`
    },
    {
      icon: LocationOnOutlined,
      content: `${source?._count?.chunks ?? 0} point${(source?._count?.chunks ?? 0) > 1 ? 's' : ''}`
    }
  ]

  if (isApiSource) {
    items.push({
      icon: SensorsOutlined,
      content: `Connecteur : ${getConnectorLabel(source)}`
    })

    if (source?.metadata?.sourcePointId) {
      items.push({
        icon: DescriptionOutlined,
        content: `Identifiant source : ${source.metadata.sourcePointId}`
      })
    }
  }

  if (hasMetadataNumber(source?.metadata?.totalWaterVolumeWithdrawn)) {
    items.push({
      icon: WaterDropOutlined,
      content: (
        <>
          Volume prélevé : {formatNumber(source.metadata.totalWaterVolumeWithdrawn)}{' '}
          <span aria-label='mètres cubes' role='text'>m³</span>
        </>
      )
    })
  }

  if (hasMetadataNumber(source?.metadata?.totalWaterVolumeDischarged)) {
    items.push({
      icon: WaterDropOutlined,
      content: (
        <>
          Volume rejeté : {formatNumber(source.metadata.totalWaterVolumeDischarged)}{' '}
          <span aria-label='mètres cubes' role='text'>m³</span>
        </>
      )
    })
  }

  return items
}

const getTags = source => {
  const label = sourceStateLabels[source?.globalInstructionStatus]

  return label ? [label] : []
}

const DeclarationItemCardContent = ({source, background}) => (
  <ListItem
    border
    title={getTitle(source)}
    subtitle={getSubtitle(source)}
    subtitleIcon={getSubtitleIcon(source)}
    background={background}
    tags={getTags(source)}
    rightIcons={[rightIcons[source?.type || 'unknown'] ?? rightIcons.unknown]}
    metas={metas(source)}
  />
)

const DeclarationItemCard = ({source, background, url}) => {
  if (source?.type === 'API') {
    return (
      <DeclarationItemCardContent
        source={source}
        background={background}
      />
    )
  }

  return (
    <Link href={url || ''} style={{textDecoration: 'none'}}>
      <DeclarationItemCardContent
        source={source}
        background={background}
      />
    </Link>
  )
}

export default DeclarationItemCard
