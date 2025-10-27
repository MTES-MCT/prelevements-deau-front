import Badge from '@codegouvfr/react-dsfr/Badge'
import uniqBy from 'lodash-es/uniqBy'

const TagsList = ({tags = [], size = 'md'}) => {
  const uniqueMetas = uniqBy(tags, 'label')

  return (
    <ul className='fr-badges-group'>
      {uniqueMetas.map(({label, severity, hasIcon = true}) => (
        <li key={label}>
          <Badge noIcon={!hasIcon} small={size === 'sm'} style={{marginBottom: 0}} severity={severity || ''}>{label}</Badge>
        </li>
      ))}
    </ul>
  )
}

export default TagsList
