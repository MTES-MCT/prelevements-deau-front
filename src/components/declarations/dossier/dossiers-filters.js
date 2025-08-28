import {Input} from '@codegouvfr/react-dsfr/Input'
import dynamic from 'next/dynamic'

const DynamicSelect = dynamic(
  () => import('@codegouvfr/react-dsfr/SelectNext'),
  {ssr: false}
)

const monthOptions = [
  {value: 'all', label: 'Tout'},
  ...Array.from({length: 12}, (_, i) => {
    const date = new Date()
    date.setMonth(date.getMonth() - i)
    const month = date.toLocaleString('default', {month: 'long'})
    const year = date.getFullYear()
    return {
      value: `month-${year}-${date.getMonth() + 1}`,
      label: `${month} ${year}`
    }
  })
]

const DossiersFilters = ({setFilters}) => (
  <div className='fr-mb-4w fr-grid-row'>
    <div className='fr-col-6 fr-p-2w'>
      <Input
        label='Préleveur'
        onChange={e => setFilters(prev => ({...prev, declarant: e.target.value}))}
      />
    </div>
    <div className='fr-col-6 fr-p-2w'>
      <Input
        label='Numéro de dossier'
        onChange={e => setFilters(prev => ({...prev, numeroDossier: e.target.value}))}
      />
    </div>
    <div className='fr-col-12 fr-grid-row'>
      <DynamicSelect
        label='Mois déclaré'
        options={monthOptions}
        className='fr-col-6 fr-p-2w'
        defaultValue='last-6-months'
        onChange={e => setFilters(prev => ({...prev, periode: e.target.value}))}
      />
      <DynamicSelect
        label='Type de prélevement'
        options={[
          {value: 'all', label: 'Tous les types'},
          {value: 'aep-zre', label: 'Prélèvement AEP ou en ZRE'},
          {value: 'camion-citerne', label: 'Camion-citerne'},
          {value: 'icpe-hors-zre', label: 'ICPE hors ZRE'},
          {value: 'autre', label: 'Autre'}
        ]}
        className='fr-col-6 fr-p-2w'
        defaultValue='all'
        onChange={e => setFilters(prev => ({...prev, typePrelevement: e.target.value}))}
      />
    </div>
  </div>
)

export default DossiersFilters
