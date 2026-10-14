'use client'

import {Input} from '@codegouvfr/react-dsfr/Input'

const CountingCodeField = ({value, onChange, error, label = 'Code comptage'}) => (
  <Input
    label={label}
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
