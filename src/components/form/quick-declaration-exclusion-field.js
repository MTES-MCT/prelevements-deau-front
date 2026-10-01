'use client'

import dynamic from 'next/dynamic'

const DynamicCheckbox = dynamic(
  () => import('@codegouvfr/react-dsfr/Checkbox'),
  {ssr: false}
)

const QuickDeclarationExclusionField = ({value = false, onChange, error}) => (
  <DynamicCheckbox
    className='fr-mb-3w'
    options={[{
      label: 'Exclure de la saisie rapide',
      nativeInputProps: {
        checked: value,
        onChange: event => onChange(event.target.checked)
      }
    }]}
    state={error ? 'error' : 'default'}
    stateRelatedMessage={error}
  />
)

export default QuickDeclarationExclusionField
