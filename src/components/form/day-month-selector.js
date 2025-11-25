import {useEffect, useState} from 'react'

import {Select} from '@codegouvfr/react-dsfr/SelectNext'
import {Tooltip} from '@codegouvfr/react-dsfr/Tooltip'

const parseDefaultValue = defaultValue => {
  if (!defaultValue) {
    return {day: '', month: ''}
  }

  // Expected format: 0001-MM-DD
  const match = defaultValue.match(/^\d{4}-(\d{2})-(\d{2})$/)
  if (match) {
    return {day: match[2], month: match[1]}
  }

  return {day: '', month: ''}
}

const DayMonthSelector = ({
  label,
  toolTip,
  defaultValue,
  onChange
}) => {
  const parsed = parseDefaultValue(defaultValue)
  const [day, setDay] = useState(parsed.day)
  const [month, setMonth] = useState(parsed.month)

  useEffect(() => {
    if (day && month) {
      onChange(`0001-${month}-${day}`)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [day, month])

  return (
    <div>
      <div className='flex flex-cols'>
        <p className='pr-2'>{label}</p>
        {toolTip && (
          <Tooltip
            kind='hover'
            title={toolTip}
          />
        )}
      </div>
      <div className='grid grid-cols-2 gap-4 pt-2'>
        <Select
          nativeSelectProps={{
            value: day,
            onChange: e => setDay(e.target.value.padStart(2, '0'))
          }}
          options={[
            {value: '', label: 'Choisir un jour', disabled: true},
            ...Array.from({length: 31}, (_, i) => ({
              value: (i + 1).toString().padStart(2, '0'),
              label: (i + 1).toString().padStart(2, '0')
            }))
          ]}
        />
        <Select
          nativeSelectProps={{
            value: month,
            onChange: e => setMonth(e.target.value.padStart(2, '0'))
          }}
          options={[
            {value: '', label: 'Choisir un mois', disabled: true},
            ...Array.from({length: 12}, (_, i) => ({
              value: (i + 1).toString().padStart(2, '0'),
              label: (i + 1).toString().padStart(2, '0')
            }))
          ]}
        />
      </div>
    </div>
  )
}

export default DayMonthSelector
