import {fr} from '@codegouvfr/react-dsfr'
import Link from 'next/link'

import ListItem from '@/components/ui/ListItem/index.js'
import {getDeclarantTitleFromUser, getDeclarantTypeIcon} from '@/lib/declarants.js'

const Declarant = ({declarant, index}) =>
  (
    <Link href={`declarants/${declarant.id}`}>
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
          <span className='font-bold mr-1'>{declarant.declarant._count.pointPrelevements}</span> {declarant.declarant._count.pointPrelevements > 1 ? 'exploitations' : 'exploitation'}
        </>}
      />
    </Link>
  )

export default Declarant
