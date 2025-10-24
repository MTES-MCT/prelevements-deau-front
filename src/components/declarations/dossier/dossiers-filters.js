import {Input} from '@codegouvfr/react-dsfr/Input'
import {debounce} from 'lodash-es'
import dynamic from 'next/dynamic'

const DynamicSelect = dynamic(
  () => import('@codegouvfr/react-dsfr/SelectNext'),
  {ssr: false}
)

const DEFAULT_PERIOD_OPTIONS = [{value: 'all', label: 'Tout'}]

const DossiersFilters = ({filters, setFilters, periodOptions}) => {
  const options = periodOptions?.length ? periodOptions : DEFAULT_PERIOD_OPTIONS

  return (
    <div className='fr-mb-4w fr-grid-row'>
      <div className='fr-col-6 fr-p-2w'>
        <Input
          label='Préleveur'
          nativeInputProps={{
            defaultValue: filters.declarant || '',
            onChange: debounce(e => setFilters(prev => ({...prev, declarant: e.target.value})), 300)
          }}
        />
      </div>
      <div className='fr-col-6 fr-p-2w'>
        <Input
          label='Numéro de dossier'
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
        <DynamicSelect
          label='Type de prélèvement'
          options={[
            {value: 'all', label: 'Tous les types'},
            {value: 'aep-zre', label: 'Prélèvement AEP ou en ZRE'},
            {value: 'camion-citerne', label: 'Camion-citerne'},
            {value: 'icpe-hors-zre', label: 'ICPE hors ZRE'},
            {value: 'autre', label: 'Autre'}
          ]}
          className='fr-col-6 fr-p-2w'
          nativeSelectProps={{
            value: filters.typePrelevement || 'all',
            onChange: e => setFilters(prev => ({...prev, typePrelevement: e.target.value}))
          }}
        />
      </div>
    </div>
  )
}

export default DossiersFilters
