import {Input} from '@codegouvfr/react-dsfr/Input'
import {debounce} from 'lodash-es'
import dynamic from 'next/dynamic'

const DynamicSelect = dynamic(
  () => import('@codegouvfr/react-dsfr/SelectNext'),
  {ssr: false}
)

const DEFAULT_PERIOD_OPTIONS = [{value: 'all', label: 'Tout'}]

const InstructionFilters = ({filters, setFilters, periodOptions}) => {
  const options = periodOptions?.length ? periodOptions : DEFAULT_PERIOD_OPTIONS

  return (
    <div className='fr-mb-4w fr-grid-row'>
      <div className='fr-col-6 fr-p-2w'>
        <Input
          label='Déclarant'
          nativeInputProps={{
            defaultValue: filters.declarant || '',
            onChange: debounce(e => setFilters(prev => ({...prev, declarant: e.target.value})), 300)
          }}
        />
      </div>
      <div className='fr-col-6 fr-p-2w'>
        <Input
          label='Numéro de déclaration'
          nativeInputProps={{
            defaultValue: filters.dossierNumber || '',
            onChange: debounce(e => setFilters(prev => ({...prev, dossierNumber: e.target.value})), 300)
          }}
        />
      </div>
      <div className='fr-col-12 fr-grid-row'>
        <DynamicSelect
          label='Période concernée'
          options={options}
          className='fr-col-6 fr-p-2w'
          nativeSelectProps={{
            value: filters.periode || 'all',
            onChange: e => setFilters(prev => ({...prev, periode: e.target.value}))
          }}
        />
      </div>
    </div>
  )
}

export default InstructionFilters
