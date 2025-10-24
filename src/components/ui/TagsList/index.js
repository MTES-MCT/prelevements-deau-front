import Badge from '@codegouvfr/react-dsfr/Badge'
import uniqBy from 'lodash-es/uniqBy'

const TagsList = ({tags = []}) => {
  const uniqueMetas = uniqBy(tags, 'label')

  return (
    <ul className='fr-badges-group'>
      {uniqueMetas.map(({label, severity, hasIcon = true}) => (
        <li key={label}>
          <Badge noIcon={!hasIcon} style={{marginBottom: 0}} severity={severity || ''}>{label}</Badge>
        </li>
      ))}
    </ul>
  )
}

export default TagsList
