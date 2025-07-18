import {useEffect, useState} from 'react'

import {Select} from '@codegouvfr/react-dsfr/SelectNext'
import {Tooltip} from '@codegouvfr/react-dsfr/Tooltip'

const DayMonthSelector = ({
  label,
  toolTip,
  onChange
}) => {
  const [day, setDay] = useState()
  const [month, setMonth] = useState()

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
            onChange: e => setDay(e.target.value.padStart(2, '0'))
          }}
          options={[
            {value: '', label: 'Choisir un jour', disabled: true},
            ...Array.from({length: 31}, (_, i) => ({
              label: (i + 1).toString().padStart(2, '0')
            }))
          ]}
        />
        <Select
          nativeSelectProps={{
            onChange: e => setMonth(e.target.value.padStart(2, '0'))
          }}
          options={[
            {value: '', label: 'Choisir un mois', disabled: true},
            ...Array.from({length: 12}, (_, i) => ({
              label: (i + 1).toString().padStart(2, '0')
            }))
          ]}
        />
      </div>
    </div>
  )
}

export default DayMonthSelector
