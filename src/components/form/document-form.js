
import {Input} from '@codegouvfr/react-dsfr/Input'
import {Select} from '@codegouvfr/react-dsfr/SelectNext'

const naturesDocument = [
  'Autorisation AOT',
  'Autorisation CSP',
  'Autorisation CSP - IOTA',
  'Autorisation hydroélectricité',
  'Autorisation ICPE',
  'Autorisation IOTA',
  'Délibération abandon',
  'Rapport hydrogéologue agréé'
]

const DocumentForm = ({document, setDocument}) => (
  <>
    <div className='grid grid-cols-2 gap-4'>
      <Input
        label='Référence'
        nativeInputProps={{
          defaultValue: document?.reference,
          onChange: e => setDocument(prev => ({...prev, reference: e.target.value}))
        }}
      />
      <Select
        label='Nature *'
        placeholder='Sélectionner la nature du document'
        nativeSelectProps={{
          defaultValue: document?.nature,
          onChange: e => setDocument(prev => ({...prev, nature: e.target.value}))
        }}
        options={naturesDocument.map(nature => ({
          value: nature,
          label: nature
        }))}
      />
    </div>
    <div className='grid grid-cols-2 gap-4'>
      <Input
        label='Date de signature *'
        nativeInputProps={{
          type: 'date',
          defaultValue: document?.signatureDate,
          onChange: e => setDocument(prev => ({...prev, signatureDate: e.target.value}))
        }}
      />
      <Input
        label='Date de fin de validité'
        nativeInputProps={{
          type: 'date',
          defaultValue: document?.validityEndDate,
          onChange: e => setDocument(prev => ({...prev, validityEndDate: e.target.value}))
        }}
      />
    </div>
    <Input
      textArea
      label='Remarque'
      nativeTextAreaProps={{
        defaultValue: document?.comment,
        onChange: e => setDocument(prev => ({...prev, comment: e.target.value}))
      }}
    />
  </>
)

export default DocumentForm
