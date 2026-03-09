import {
  ArticleOutlined,
  EventOutlined,
  InterestsOutlined,
  WaterDropOutlined,
  DescriptionOutlined, LocationOnOutlined
} from '@mui/icons-material'
import {format} from 'date-fns'
import {fr} from 'date-fns/locale'
import Link from 'next/link'

import ListItem from '@/components/ui/ListItem/index.js'
import {formatNumber} from '@/utils/number.js'

const rightIcons = {
  'DECLARATION': {
    icon: DescriptionOutlined,
    label: 'Déclaration'
  },
  unknown: {
    icon: InterestsOutlined,
    label: 'Autre'
  }
}

const tags = {
  'TO_INSTRUCT': {
    label: 'À instruire',
    severity: 'info'
  },
  'VALIDATED': {
    label: 'Validé',
    severity: 'success'
  },
  'REJECTED': {
    label: 'Rejeté',
    severity: 'error'
  },
  'PARTIALLY_VALIDATED': {
    label: 'Partiellement validé',
    severity: 'warning'
  },
  'INSTRUCTION_IN_PROGRESS': {
    label: 'Instruction en cours',
    severity: 'info'
  }
}

const metas = source => {
  const dateDepot = source.createdAt
    ? format(new Date(source.createdAt), 'dd/MM/yyyy', {locale: fr})
    : 'Non renseignée'

  return [
    {
      icon: EventOutlined,
      content: `Date de dépôt : ${dateDepot}`
    },
    {
      icon: LocationOnOutlined,
      content: `${source._count.chunks} point${source._count.chunks > 1 ? 's' : ''} de prélèvement`,
    },
    {
      icon: WaterDropOutlined,
      content: source?.metadata?.totalWaterVolumeWithdrawn
        ? (
          <>
            Volume prélevé : {formatNumber(source?.metadata?.totalWaterVolumeWithdrawn)}{' '}
            <span aria-label='mètres cubes' role='text'>m³</span>
          </>
        )
        : 'Aucun volume prélevé déclaré'
    }
  ]
}

const InstructionCard = ({source, background, url}) => (
  <Link href={url || ''} style={{textDecoration: 'none'}}>
    <ListItem
      border
      title={source?.declaration?.declarant?.socialReason
        ?? `${source?.declaration?.declarant?.user?.lastName} ${source?.declaration?.declarant?.user?.firstName}`}
      subtitle={'n° ' + source?.declaration?.code}
      subtitleIcon={ArticleOutlined}
      background={background}
      tags={[tags[source.globalInstructionStatus]]}
      rightIcons={[rightIcons[source.type || 'unknown']]}
      metas={metas(source)}
    />
  </Link>
)

export default InstructionCard
