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
    <Input
      label='Titre'
      nativeInputProps={{
        value: document?.title || '',
        onChange: event => setDocument(previous => ({...previous, title: event.target.value}))
      }}
    />
    <div className='grid grid-cols-2 gap-4'>
      <Input
        label='Référence'
        nativeInputProps={{
          value: document?.reference || '',
          onChange: event => setDocument(previous => ({...previous, reference: event.target.value}))
        }}
      />
      <Select
        label='Nature *'
        placeholder='Sélectionner la nature du document'
        nativeSelectProps={{
          value: document?.nature || '',
          onChange: event => setDocument(previous => ({...previous, nature: event.target.value}))
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
          value: document?.signatureDate || '',
          onChange: event => setDocument(previous => ({...previous, signatureDate: event.target.value}))
        }}
      />
      <Input
        label='Date de fin de validité'
        nativeInputProps={{
          type: 'date',
          value: document?.validityEndDate || '',
          onChange: event => setDocument(previous => ({...previous, validityEndDate: event.target.value}))
        }}
      />
    </div>
    <Input
      textArea
      label='Commentaire'
      nativeTextAreaProps={{
        value: document?.comment || '',
        onChange: event => setDocument(previous => ({...previous, comment: event.target.value}))
      }}
    />
  </>
)

export default DocumentForm
