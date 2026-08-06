'use client'

import {useState} from 'react'

import Input from '@codegouvfr/react-dsfr/Input'
import {Typography} from '@mui/material'
import dynamic from 'next/dynamic'

import NullableBooleanSelect from '@/components/form/nullable-boolean-select.js'

const DynamicCheckbox = dynamic(
  () => import('@codegouvfr/react-dsfr/Checkbox'),
  {ssr: false}
)

const TextInput = ({point, setPoint, field, label, placeholder, hintText}) => (
  <Input
    label={label}
    hintText={hintText}
    nativeInputProps={{
      defaultValue: point?.[field] || '',
      placeholder,
      onChange: e => setPoint(prev => ({...prev, [field]: e.target.value}))
    }}
  />
)

const JsonTextarea = ({point, setPoint, field, label, hintText, defaultValue, validate}) => {
  const [rawValue, setRawValue] = useState(JSON.stringify(point?.[field] ?? defaultValue, null, 2))
  const [error, setError] = useState(null)

  const handleChange = event => {
    const {value} = event.target
    setRawValue(value)

    if (!value.trim()) {
      setPoint(prev => ({...prev, [field]: defaultValue}))
      setError(null)
      return
    }

    try {
      const parsed = JSON.parse(value)
      const validationMessage = validate(parsed)

      if (validationMessage) {
        setError(validationMessage)
        return
      }

      setPoint(prev => ({...prev, [field]: parsed}))
      setError(null)
    } catch {
      setError('Le contenu doit être un JSON valide.')
    }
  }

  return (
    <div>
      <Input
        textArea
        label={label}
        hintText={hintText}
        nativeTextAreaProps={{
          value: rawValue,
          rows: 6,
          onChange: handleChange
        }}
      />
      {error && (
        <p className='fr-error-text fr-mt-n2w'>
          {error}
        </p>
      )}
    </div>
  )
}

const validateNames = value => Array.isArray(value)
  ? null
  : 'Le champ names doit être un tableau JSON.'

const validateIdentifiers = value => (
  value && typeof value === 'object' && !Array.isArray(value)
    ? null
    : 'Le champ identifiers doit être un objet JSON.'
)

const getDateInputValue = value => value ? String(value).slice(0, 10) : ''

const OptionalPointFieldsForm = ({point, setPoint}) => (
  <div>
    <Typography variant='h5' sx={{pb: 5}}>
      Informations d’identification
    </Typography>

    <TextInput
      point={point}
      setPoint={setPoint}
      field='otherNames'
      label='Autres noms'
      hintText='Autres noms utilisés pour ce point de prélèvement dans d’autres systèmes d’information'
      placeholder='Entrer les autres noms, séparés par une virgule'
    />

    <Input
      label='Date de mise en service'
      nativeInputProps={{
        type: 'date',
        value: getDateInputValue(point?.commissioningDate),
        onChange: event => setPoint(prev => ({
          ...prev,
          commissioningDate: event.target.value || null
        }))
      }}
    />

    <TextInput
      point={point}
      setPoint={setPoint}
      field='waterAgencyInternalIdentifier'
      label='Identifiant interne Agence de l’eau'
      placeholder='Entrer l’identifiant interne Agence de l’eau'
    />

    <NullableBooleanSelect
      label='Point référent de l’ouvrage'
      value={point?.isReferencePoint}
      onChange={value => setPoint(prev => ({...prev, isReferencePoint: value}))}
    />

    <JsonTextarea
      point={point}
      setPoint={setPoint}
      field='names'
      label='Noms structurés (JSON)'
      hintText='Exemple : [{"type":"NOM_OUVRAGE_PRELEVEMENT","value":"Canal…","source":"BVTECH"}]'
      defaultValue={[]}
      validate={validateNames}
    />

    <JsonTextarea
      point={point}
      setPoint={setPoint}
      field='identifiers'
      label='Identifiants externes (JSON)'
      hintText='Exemple : {"DDTM":"C66150008","AERMC":"1666150002","ASA":"39"}'
      defaultValue={{}}
      validate={validateIdentifiers}
    />

    <TextInput
      point={point}
      setPoint={setPoint}
      field='codeBSS'
      label='Code BSS'
      placeholder='Entrer le code BSS'
    />

    <TextInput
      point={point}
      setPoint={setPoint}
      field='codeBNPE'
      label='Code BNPE'
      placeholder='Entrer le code BNPE'
    />

    <TextInput
      point={point}
      setPoint={setPoint}
      field='codeAIOT'
      label='Code AIOT'
      placeholder='Entrer le code AIOT'
    />

    <TextInput
      point={point}
      setPoint={setPoint}
      field='codeMESO'
      label='Code masse d’eau souterraine'
      placeholder='Entrer le code MESO'
    />

    <TextInput
      point={point}
      setPoint={setPoint}
      field='codeMEContinentalesBV'
      label='Code masse d’eau de surface continentale'
      placeholder='Entrer le code masse d’eau continentale'
    />

    <TextInput
      point={point}
      setPoint={setPoint}
      field='codeBDCarthage'
      label='Code bassin versant BD Carthage'
      placeholder='Entrer le code bassin versant BD Carthage'
    />

    <TextInput
      point={point}
      setPoint={setPoint}
      field='codeEUMasseDEau'
      label='Code EU masse d’eau'
      placeholder='Entrer le code EU masse d’eau'
    />

    <TextInput
      point={point}
      setPoint={setPoint}
      field='codePTP'
      label='Code PTP'
      placeholder='Entrer le code PTP'
    />

    <TextInput
      point={point}
      setPoint={setPoint}
      field='codeOPR'
      label='Code OPR'
      placeholder='Entrer le code OPR'
    />

    <TextInput
      point={point}
      setPoint={setPoint}
      field='codeBDLISA'
      label='Code BDLISA'
      placeholder='Entrer le code BDLISA'
    />

    <TextInput
      point={point}
      setPoint={setPoint}
      field='codeBDTopage'
      label='Code BD Topage'
      placeholder='Entrer le code BD Topage'
    />

    <TextInput
      point={point}
      setPoint={setPoint}
      field='codeSISPEA'
      label='Code SISPEA'
      placeholder='Entrer le code SISPEA'
    />

    <TextInput
      point={point}
      setPoint={setPoint}
      field='codeSISEAUX'
      label='Code SISEAUX'
      placeholder='Entrer le code SISEAUX'
    />

    <TextInput
      point={point}
      setPoint={setPoint}
      field='codeINSEE'
      label='Code INSEE'
      placeholder='Entrer le code INSEE'
    />

    <TextInput
      point={point}
      setPoint={setPoint}
      field='codeROE'
      label='Code ROE'
      placeholder='Entrer le code ROE'
    />

    <Typography variant='h5' sx={{py: 5}}>
      Localisation : informations complémentaires
    </Typography>

    <TextInput
      point={point}
      setPoint={setPoint}
      field='communeCode'
      label='Code commune'
      placeholder='Entrer le code commune'
    />

    <TextInput
      point={point}
      setPoint={setPoint}
      field='communeName'
      label='Nom de la commune'
      placeholder='Entrer le nom de la commune'
    />

    <TextInput
      point={point}
      setPoint={setPoint}
      field='streamName'
      label='Cours d’eau'
      placeholder='Entrer le nom du cours d’eau'
    />

    <Typography variant='h6' sx={{py: 3}}>
      Eaux superficielles
    </Typography>

    <TextInput
      point={point}
      setPoint={setPoint}
      field='watershed'
      label='Bassin versant'
      placeholder='Entrer le bassin versant'
    />

    <TextInput
      point={point}
      setPoint={setPoint}
      field='underWatershed'
      label='Sous-bassin versant'
      placeholder='Entrer le sous-bassin versant'
    />

    <TextInput
      point={point}
      setPoint={setPoint}
      field='resourceName'
      label='Nom de la ressource'
      placeholder='Entrer le cours d’eau ou la ressource associée au point'
    />

    <Typography variant='h6' sx={{py: 3}}>
      Eaux souterraines
    </Typography>

    <TextInput
      point={point}
      setPoint={setPoint}
      field='managementUnit'
      label='Unité de gestion des volumes prélevables'
      placeholder='Entrer l’unité de gestion des volumes prélevables'
    />

    <TextInput
      point={point}
      setPoint={setPoint}
      field='managementSubUnit'
      label='Sous-unité de gestion des volumes prélevables'
      placeholder='Entrer la sous-unité de gestion des volumes prélevables'
    />

    <TextInput
      point={point}
      setPoint={setPoint}
      field='aquiferName'
      label='Nappe'
      placeholder='Entrer le nom de la nappe'
    />

    <Input
      label='Profondeur'
      nativeInputProps={{
        type: 'number',
        defaultValue: point?.depth ?? '',
        placeholder: 'Entrer la profondeur en m',
        onChange: e => setPoint(prev => ({
          ...prev,
          depth: e.target.value === '' ? null : Number(e.target.value)
        }))
      }}
    />

    <div className='w-full grid grid-cols-2 gap-4 py-5'>
      <DynamicCheckbox
        options={[
          {
            label: 'Zone de répartition des eaux',
            nativeInputProps: {
              defaultChecked: point?.isZre || false,
              onChange: e => setPoint(prev => ({...prev, isZre: e.target.checked}))
            }
          }
        ]}
      />

      <DynamicCheckbox
        options={[
          {
            label: 'Réservoir biologique',
            nativeInputProps: {
              defaultChecked: point?.isBiologicalReservoir || false,
              onChange: e => setPoint(prev => ({
                ...prev,
                isBiologicalReservoir: e.target.checked
              }))
            }
          }
        ]}
      />
    </div>
  </div>
)

export default OptionalPointFieldsForm
