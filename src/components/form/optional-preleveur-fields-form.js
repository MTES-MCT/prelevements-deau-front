
import Input from '@codegouvfr/react-dsfr/Input'

const OptionalPreleveurFieldsForm = ({preleveur, setPreleveur}) => (
  <div>
    <Input
      label='Numéro de téléphone'
      nativeInputProps={{
        type: 'tel',
        placeholder: 'Entrer le numéro de téléphone de contact',
        value: preleveur?.phoneNumber || '',
        onChange: e => setPreleveur(prev => ({...prev, phoneNumber: e.target.value}))
      }}
    />
    <Input
      hintText='Numéro de rue et nom'
      label='Adresse ligne 1'
      nativeInputProps={{
        placeholder: 'Entrer l’adresse',
        value: preleveur?.addressLine1 || '',
        onChange: e => setPreleveur(prev => ({...prev, addressLine1: e.target.value}))
      }}
    />
    <Input
      hintText='Complément d’adresse'
      label='Adresse ligne 2'
      nativeInputProps={{
        placeholder: 'Entrer le complément d’adresse',
        value: preleveur?.addressLine2 || '',
        onChange: e => setPreleveur(prev => ({...prev, addressLine2: e.target.value}))
      }}
    />
    <div className='w-full grid grid-cols-1 md:grid-cols-3 gap-4'>
      <Input
        label='Boîte postale'
        nativeInputProps={{
          placeholder: 'Entrer la boîte postale',
          value: preleveur?.poBox || '',
          onChange: e => setPreleveur(prev => ({...prev, poBox: e.target.value}))
        }}
      />
      <Input
        label='Code postal'
        nativeInputProps={{
          placeholder: 'Entrer le code postal',
          value: preleveur?.postalCode || '',
          onChange: e => setPreleveur(prev => ({...prev, postalCode: e.target.value}))
        }}
      />
      <Input
        label='Commune'
        nativeInputProps={{
          placeholder: 'Entrer la commune',
          value: preleveur?.city || '',
          onChange: e => setPreleveur(prev => ({...prev, city: e.target.value}))
        }}
      />
    </div>
  </div>
)

export default OptionalPreleveurFieldsForm
