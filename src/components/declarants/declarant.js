import {fr} from '@codegouvfr/react-dsfr'
import Link from 'next/link'

import ListItem from '@/components/ui/ListItem/index.js'
import {
  getDeclarantRoleLabel,
  getDeclarantTitleFromUser,
  getDeclarantTypeIcon,
  getPreleveurType,
  getPreleveurTypeLabel,
  isDeclarationNotificationsEnabled
} from '@/lib/declarants.js'

function pluralize(count, singular, plural = `${singular}s`) {
  return `${count} ${count > 1 ? plural : singular}`
}

const Declarant = ({declarant, index, basePath = '/declarants'}) => {
  const directExploitationsCount = declarant.declarant?._count?.pointPrelevements ?? 0
  const collectorRightsCount = declarant.declarant?._count?.collecteurExploitations ?? declarant.declarant?.collecteurExploitations?.length ?? 0
  const role = declarant.declarant?.declarantRole || declarant.declarantRole || 'PRELEVEUR'
  const isCollecteur = role === 'COLLECTEUR'
  const preleveurTypeLabel = getPreleveurTypeLabel(getPreleveurType(declarant))
  const count = isCollecteur ? collectorRightsCount : directExploitationsCount
  const countLabel = isCollecteur
    ? pluralize(count, 'exploitation accessible', 'exploitations accessibles')
    : pluralize(count, 'exploitation')

  const content = (
    <ListItem
      border
      background={index % 2 === 0 ? 'primary' : 'secondary'}
      title={<>
        <span
          className={`mr-2 ${getDeclarantTypeIcon(declarant)}`}
          style={{color: fr.colors.decisions.text.label.blueFrance.default}}
        />
        <span>{ getDeclarantTitleFromUser(declarant) } </span>
      </>}
      subtitle={<>
        <span className='font-bold mr-1'>{count}</span> {countLabel.replace(/^\d+\s*/, '')}
      </>}
      tags={[
        {label: getDeclarantRoleLabel(role), severity: isCollecteur ? 'info' : 'success'},
        !isCollecteur && {
          label: preleveurTypeLabel || 'Type non renseigné',
          severity: preleveurTypeLabel ? 'info' : 'warning'
        },
        !isDeclarationNotificationsEnabled(declarant) && {label: 'Rappels désactivés', severity: 'warning'},
        !declarant.email && {label: 'Sans email', severity: 'warning'}
      ].filter(Boolean)}
      metas={[
        declarant.email && {iconId: 'ri-at-line', content: declarant.email},
        isCollecteur
          ? {iconId: 'ri-shield-user-line', content: countLabel}
          : {iconId: 'ri-map-pin-user-line', content: countLabel}
      ].filter(Boolean)}
    />
  )

  return declarant.right?.permissions?.includes('declarant.detail.read')
    ? <Link href={`${basePath}/${declarant.id}`}>{content}</Link>
    : <div>{content}</div>
}

export default Declarant
