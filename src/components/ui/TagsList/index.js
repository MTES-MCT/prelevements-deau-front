import Badge from '@codegouvfr/react-dsfr/Badge'

const TagsList = ({tags}) => {
  if (!Array.isArray(tags) || tags.length === 0) {
    return null
  }

  return (
    <ul className='fr-badges-group'>
      {tags.map(({label, severity, id}) => (
        <li key={id}>
          <Badge style={{marginBottom: 0}} severity={severity || ''}>{label || ''}</Badge>
        </li>
      ))}
    </ul>
  )
}

export default TagsList
