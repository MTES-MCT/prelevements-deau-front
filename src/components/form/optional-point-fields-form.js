'use client'

import Input from '@codegouvfr/react-dsfr/Input'
import {Typography} from '@mui/material'
import dynamic from 'next/dynamic'

const DynamicCheckbox = dynamic(
  () => import('@codegouvfr/react-dsfr/Checkbox'),
  {ssr: false}
)

const OptionalPointFieldsForm = ({point, setPoint}) => (
  <div>
    <Typography variant='h5' sx={{pb: 5}}>
      Informations d’identification
    </Typography>

    <Input
      label='Autres noms'
      hintText='Autres noms utilisés pour ce point de prélèvement dans d’autres systèmes d’information'
      nativeInputProps={{
        defaultValue: point?.otherNames || '',
        placeholder: 'Entrer les autres noms, séparés par une virgule',
        onChange: e => setPoint(prev => ({...prev, otherNames: e.target.value}))
      }}
    />

    <Input
      label='Code BSS'
      nativeInputProps={{
        defaultValue: point?.codeBSS || '',
        placeholder: 'Entrer le code BSS',
        onChange: e => setPoint(prev => ({...prev, codeBSS: e.target.value}))
      }}
    />

    <Input
      label='Code BNPE'
      nativeInputProps={{
        defaultValue: point?.codeBNPE || '',
        placeholder: 'Entrer le code BNPE',
        onChange: e => setPoint(prev => ({...prev, codeBNPE: e.target.value}))
      }}
    />

    <Input
      label='Code AIOT'
      nativeInputProps={{
        defaultValue: point?.codeAIOT || '',
        placeholder: 'Entrer le code AIOT',
        onChange: e => setPoint(prev => ({...prev, codeAIOT: e.target.value}))
      }}
    />

    <Input
      label='Code masse d’eau souterraine'
      nativeInputProps={{
        defaultValue: point?.codeMESO || '',
        placeholder: 'Entrer le code MESO',
        onChange: e => setPoint(prev => ({...prev, codeMESO: e.target.value}))
      }}
    />

    <Input
      label='Code masse d’eau de surface continentale'
      nativeInputProps={{
        defaultValue: point?.codeMEContinentalesBV || '',
        placeholder: 'Entrer le code masse d’eau continentale',
        onChange: e => setPoint(prev => ({...prev, codeMEContinentalesBV: e.target.value}))
      }}
    />

    <Input
      label='Code bassin versant BD Carthage'
      nativeInputProps={{
        defaultValue: point?.codeBDCarthage || '',
        placeholder: 'Entrer le code bassin versant BD Carthage',
        onChange: e => setPoint(prev => ({...prev, codeBDCarthage: e.target.value}))
      }}
    />

    <Input
      label='Code EU masse d’eau'
      nativeInputProps={{
        defaultValue: point?.codeEUMasseDEau || '',
        placeholder: 'Entrer le code EU masse d’eau',
        onChange: e => setPoint(prev => ({...prev, codeEUMasseDEau: e.target.value}))
      }}
    />

    <Input
      label='Code PTP'
      nativeInputProps={{
        defaultValue: point?.codePTP || '',
        placeholder: 'Entrer le code PTP',
        onChange: e => setPoint(prev => ({...prev, codePTP: e.target.value}))
      }}
    />

    <Input
      label='Code OPR'
      nativeInputProps={{
        defaultValue: point?.codeOPR || '',
        placeholder: 'Entrer le code OPR',
        onChange: e => setPoint(prev => ({...prev, codeOPR: e.target.value}))
      }}
    />

    <Input
      label='Code BDLISA'
      nativeInputProps={{
        defaultValue: point?.codeBDLISA || '',
        placeholder: 'Entrer le code BDLISA',
        onChange: e => setPoint(prev => ({...prev, codeBDLISA: e.target.value}))
      }}
    />

    <Input
      label='Code BD Topage'
      nativeInputProps={{
        defaultValue: point?.codeBDTopage || '',
        placeholder: 'Entrer le code BD Topage',
        onChange: e => setPoint(prev => ({...prev, codeBDTopage: e.target.value}))
      }}
    />

    <Input
      label='Code SISPEA'
      nativeInputProps={{
        defaultValue: point?.codeSISPEA || '',
        placeholder: 'Entrer le code SISPEA',
        onChange: e => setPoint(prev => ({...prev, codeSISPEA: e.target.value}))
      }}
    />

    <Typography variant='h5' sx={{py: 5}}>
      Localisation : informations complémentaires
    </Typography>

    <Input
      label='Code commune'
      nativeInputProps={{
        defaultValue: point?.communeCode || '',
        placeholder: 'Entrer le code commune',
        onChange: e => setPoint(prev => ({...prev, communeCode: e.target.value}))
      }}
    />

    <Input
      label='Nom de la commune'
      nativeInputProps={{
        defaultValue: point?.communeName || '',
        placeholder: 'Entrer le nom de la commune',
        onChange: e => setPoint(prev => ({...prev, communeName: e.target.value}))
      }}
    />

    <Input
      label='Cours d’eau'
      nativeInputProps={{
        defaultValue: point?.streamName || '',
        placeholder: 'Entrer le nom du cours d’eau',
        onChange: e => setPoint(prev => ({...prev, streamName: e.target.value}))
      }}
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
