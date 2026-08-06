import Select from '@codegouvfr/react-dsfr/SelectNext'

const options = [
  {value: '', label: 'Non renseigné'},
  {value: 'true', label: 'Oui'},
  {value: 'false', label: 'Non'}
]

function getSelectValue(value) {
  if (value === true) {
    return 'true'
  }

  return value === false ? 'false' : ''
}

const NullableBooleanSelect = ({label, value, onChange, hintText}) => (
  <Select
    label={label}
    hintText={hintText}
    nativeSelectProps={{
      value: getSelectValue(value),
      onChange(event) {
        const nextValue = event.target.value
        onChange(nextValue === '' ? null : nextValue === 'true')
      }
    }}
    options={options}
  />
)

export default NullableBooleanSelect
