/* eslint-disable camelcase */

import Input from '@codegouvfr/react-dsfr/Input'

const OptionalPreleveurFieldsForm = ({preleveur, setPreleveur}) => (
  <div>
    <Input
      label='Numéro de télephone'
      nativeInputProps={{
        type: 'tel',
        placeholder: 'Entrer le numéro de téléphone de contact',
        defaultValue: preleveur?.numero_telephone || '',
        onChange: e => setPreleveur(prev => ({...prev, numero_telephone: e.target.value}))
      }}
    />
    <Input
      hintText='Numéro de rue et nom'
      label='Adresse ligne 1'
      nativeInputProps={{
        placeholder: 'Entrer l’adresse',
        defaultValue: preleveur?.adresse_1 || '',
        onChange: e => setPreleveur(prev => ({...prev, adresse_1: e.target.value}))
      }}
    />
    <Input
      hintText='Complément d’adresse'
      label='Adresse ligne 2'
      nativeInputProps={{
        placeholder: 'Entrer le complément d’adresse',
        defaultValue: preleveur?.adresse_2 || '',
        onChange: e => setPreleveur(prev => ({...prev, adresse_2: e.target.value}))
      }}
    />
    <div className='w-full grid grid-cols-3 gap-4'>
      <Input
        label='Boite postale'
        nativeInputProps={{
          type: 'number',
          placeholder: 'Entrer le numéro de boite postale',
          defaultValue: preleveur?.bp || '',
          onChange: e => setPreleveur(prev => ({...prev, bp: e.target.value}))
        }}
      />
      <Input
        label='Code postal'
        nativeInputProps={{
          placeholder: 'Entrer le code postal',
          defaultValue: preleveur?.code_postal || '',
          onChange: e => setPreleveur(prev => ({...prev, code_postal: e.target.value}))
        }}
      />
      <Input
        label='Commune'
        nativeInputProps={{
          placeholder: 'Entrer la commune',
          defaultValue: preleveur?.commune || '',
          onChange: e => setPreleveur(prev => ({...prev, commune: e.target.value}))
        }}
      />
    </div>
  </div>
)

export default OptionalPreleveurFieldsForm
