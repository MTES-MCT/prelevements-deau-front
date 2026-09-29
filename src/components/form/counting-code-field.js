'use client'

import {Input} from '@codegouvfr/react-dsfr/Input'

const CountingCodeField = ({value, onChange, error}) => (
  <Input
    label='Code comptage'
    hintText='Facultatif. Identifie ce comptage, indépendamment du numéro de série du compteur.'
    state={error ? 'error' : 'default'}
    stateRelatedMessage={error}
    nativeInputProps={{
      type: 'text',
      maxLength: 255,
      value: value ?? '',
      onChange: event => onChange(event.target.value)
    }}
  />
)

export default CountingCodeField
