'use client'

import {useEffect, useMemo, useState} from 'react'

import {Select} from '@codegouvfr/react-dsfr/SelectNext'

import {normalizeUsageOption} from '@/lib/water-uses.js'
import {getWaterUsesAction} from '@/server/actions/referentiels.js'

const fallbackOptions = []

function rootUsageOptions(waterUses = []) {
  return waterUses
    .filter(usage => usage?.kind === 'USAGE')
    .map(usage => normalizeUsageOption(usage))
    .filter(option => option.value)
}

const WaterUseSelect = ({
  value,
  onChange,
  label = 'Usage *',
  placeholder = 'Sélectionner un usage',
  state,
  stateRelatedMessage
}) => {
  const [waterUses, setWaterUses] = useState(fallbackOptions)

  useEffect(() => {
    let ignore = false

    async function loadWaterUses() {
      const result = await getWaterUsesAction()
      const items = result?.data?.items ?? []

      if (!ignore && Array.isArray(items)) {
        setWaterUses(items)
      }
    }

    loadWaterUses()

    return () => {
      ignore = true
    }
  }, [])

  const options = useMemo(() => rootUsageOptions(waterUses), [waterUses])

  return (
    <Select
      label={label}
      options={options.map(option => ({
        value: option.value,
        label: option.label
      }))}
      placeholder={placeholder}
      state={state}
      stateRelatedMessage={stateRelatedMessage}
      nativeSelectProps={{
        value: value || '',
        onChange: event => onChange(event.target.value)
      }}
    />
  )
}

export default WaterUseSelect
