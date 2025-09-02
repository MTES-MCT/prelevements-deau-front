import Badge from '@codegouvfr/react-dsfr/Badge'

const TagsList = ({tags}) => {
  if (!Array.isArray(tags) || tags.length === 0) {
    return null
  }

  return (
    <ul className='fr-badges-group'>
      {tags.map(tag => (
        <li key={tag.label || Math.random()}>
          <Badge severity={tag?.severity}>{tag.label || ''}</Badge>
        </li>
      ))}
    </ul>
  )
}

export default TagsList
