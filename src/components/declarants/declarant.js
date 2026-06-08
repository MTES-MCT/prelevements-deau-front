import {fr} from '@codegouvfr/react-dsfr'
import Link from 'next/link'

import ListItem from '@/components/ui/ListItem/index.js'
import {getDeclarantTitleFromUser, getDeclarantTypeIcon, getDeclarantRoleLabel} from '@/lib/declarants.js'

const Declarant = ({declarant, index, basePath = '/declarants'}) => {
  const directExploitationsCount = declarant.declarant?._count?.pointPrelevements ?? 0
  const collectorRightsCount = declarant.declarant?._count?.collecteurExploitations ?? declarant.declarant?.collecteurExploitations?.length ?? 0
  const isCollecteur = declarant.declarant?.declarantRole === 'COLLECTEUR'
  const count = isCollecteur ? collectorRightsCount : directExploitationsCount

  return (
    <Link href={`${basePath}/${declarant.id}`}>
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
          <span className='font-bold mr-1'>{count}</span> {count > 1 ? 'exploitations' : 'exploitation'}
        </>}
        tags={[{label: getDeclarantRoleLabel(declarant.declarant?.declarantRole), severity: isCollecteur ? 'info' : 'success'}]}
      />
    </Link>
  )
}

export default Declarant
