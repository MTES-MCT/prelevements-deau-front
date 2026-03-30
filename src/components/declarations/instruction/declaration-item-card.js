import {
  ArticleOutlined,
  EventOutlined,
  InterestsOutlined,
  WaterDropOutlined,
  DescriptionOutlined,
  LocationOnOutlined,
  CalendarTodayOutlined
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
  unknown: {
    icon: InterestsOutlined,
    label: 'Autre'
  }
}

const metas = source => {
  const dateDepot = source.createdAt ? moment(source.createdAt).format('LL') : 'Non renseigné'
  const periodLabel = getSourcePeriodLabel(source)

  const metas = [
    {
      icon: EventOutlined,
      content: `Date de dépôt : ${dateDepot}`
    },
    {
      icon: CalendarTodayOutlined,
      content: `Période concernée : ${periodLabel ?? 'Non renseignée'}`
    },
    {
      icon: LocationOnOutlined,
      content: `${source._count.chunks} point${source._count.chunks > 1 ? 's' : ''}`
    }
  ]

  if (source?.metadata?.totalWaterVolumeWithdrawn) {
    metas.push({
      icon: WaterDropOutlined,
      content: (
        <>
          Volume prélevé : {formatNumber(source?.metadata?.totalWaterVolumeWithdrawn)}{' '}
          <span aria-label='mètres cubes' role='text'>m³</span>
        </>
      )
    })
  }

  if (source?.metadata?.totalWaterVolumeDischarged) {
    metas.push({
      icon: WaterDropOutlined,
      content: (
        <>
          Volume rejeté : {formatNumber(source?.metadata?.totalWaterVolumeDischarged)}{' '}
          <span aria-label='mètres cubes' role='text'>m³</span>
        </>
      )
    })
  }

  return metas
}

const DeclarationItemCard = ({source, background, url}) => (
  <Link href={url || ''} style={{textDecoration: 'none'}}>
    <ListItem
      border
      title={source?.declaration?.declarant?.socialReason
        ?? `${source?.declaration?.declarant?.user?.lastName} ${source?.declaration?.declarant?.user?.firstName}`}
      subtitle={`n° ${source?.declaration?.code ?? ''}`}
      subtitleIcon={ArticleOutlined}
      background={background}
      tags={[sourceStateLabels[source.globalInstructionStatus]]}
      rightIcons={[rightIcons[source.type || 'unknown']]}
      metas={metas(source)}
    />
  </Link>
)

export default DeclarationItemCard
