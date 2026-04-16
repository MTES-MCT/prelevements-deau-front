import {fr} from '@codegouvfr/react-dsfr'
import Link from 'next/link'

import ListItem from '@/components/ui/ListItem/index.js'
import {usageIcons} from '@/lib/points-prelevement.js'
import {getPreleveurTypeIcon} from '@/lib/preleveurs.js'

export const getPreleveurLabel = preleveur => {
  const hasSociete = preleveur.raison_sociale || preleveur.sigle

  if (hasSociete) {
    return [preleveur.sigle, preleveur.raison_sociale]
      .filter(Boolean)
      .join(' ')
  }

  return [preleveur.civilite, preleveur.nom, preleveur.prenom]
    .filter(Boolean)
    .join(' ')
}

const Preleveur = ({preleveur, index}) =>
  (
    <Link href={`preleveurs/${preleveur.id_preleveur}`}>
      <ListItem
        border
        background={index % 2 === 0 ? 'primary' : 'secondary'}
        title={
          <>
            <span
              className={`mr-2 ${getPreleveurTypeIcon(preleveur)}`}
              style={{color: fr.colors.decisions.text.label.blueFrance.default}}
            />
            <span>
              {getPreleveurLabel(preleveur)}
            </span>
          </>
        }
        subtitle={<>
          <span className='font-bold mr-1'>{preleveur.exploitations.length}</span> {preleveur.exploitations.length > 1 ? 'exploitations en vigueur' : 'exploitation en vigueur'}
        </>}
        rightIcons={preleveur.usages.map(usage => (
          {label: usage, icon: usageIcons[usage]}
        ))}
      />
    </Link>
  )

export default Preleveur
