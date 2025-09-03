import {useMemo} from 'react'

import Badge from '@codegouvfr/react-dsfr/Badge'

const TagsList = ({tags}) => {
  // Calculer les tags uniques, même si tags est vide
  const uniqueTags = useMemo(() =>
    Array.isArray(tags)
      ? [...new Map(tags.filter(tag => Boolean(tag.label)).map(tag => [tag.label, tag])).values()]
      : [],
  [tags]
  )

  if (uniqueTags.length === 0) {
    return null
  }

  return (
    <ul className='fr-badges-group'>
      {uniqueTags.map(({label, severity}) => (
        <li key={label}>
          <Badge style={{marginBottom: 0}} severity={severity || ''}>{label}</Badge>
        </li>
      ))}
    </ul>
  )
}

export default TagsList
