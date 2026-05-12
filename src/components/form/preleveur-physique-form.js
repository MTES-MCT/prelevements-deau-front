'use client'

import {useEffect, useState} from 'react'

import {Input} from '@codegouvfr/react-dsfr/Input'
import {Select} from '@codegouvfr/react-dsfr/SelectNext'
import {Typography} from '@mui/material'

import OptionalPreleveurFieldsForm from './optional-preleveur-fields-form.js'

import AccordionCentered from '@/components/ui/AccordionCentered/index.js'

const PreleveurPhysiqueForm = ({preleveur, setPreleveur}) => {
  const [isExpanded, setIsExpanded] = useState(false)

  useEffect(() => {
    if (preleveur?.commune) {
      setIsExpanded(true)
    }
  }, [preleveur])

  return (
    <>
      <Typography variant='h5' className='pb-5'>
        Informations générales
      </Typography>
      <div className='w-full grid grid-cols-[1fr_2fr_2fr] gap-4 pb-5'>
        <Select
          label='Civilité'
          placeholder='Choisir la civilité'
          nativeSelectProps={{
            placeholder: 'Choisir la civilité',
            defaultValue: preleveur?.civility || '',
            onChange: e => setPreleveur(prev => ({...prev, civility: e.target.value}))
          }}
          options={[
            {value: 'MR', label: 'M.'},
            {value: 'MRS', label: 'Mme'},
            {value: '', label: 'Non indiqué'}
          ]}
        />
        <Input
          label='Nom *'
          nativeInputProps={{
            placeholder: 'Entrer le nom',
            defaultValue: preleveur?.lastName || '',
            onChange: e => setPreleveur(prev => ({...prev, lastName: e.target.value}))
          }}
        />
        <Input
          label='Prénom *'
          nativeInputProps={{
            placeholder: 'Entrer le prénom',
            defaultValue: preleveur?.firstName || '',
            onChange: e => setPreleveur(prev => ({...prev, firstName: e.target.value}))
          }}
        />
      </div>
      <Input
        label='Adresse e-mail *'
        nativeInputProps={{
          defaultValue: preleveur?.email || '',
          placeholder: 'Entrez l’adresse e-mail de contact',
          onChange: e => setPreleveur(prev => ({...prev, email: e.target.value}))
        }}
      />
      <AccordionCentered
        isExpanded={isExpanded}
        setIsExpanded={setIsExpanded}
        label='les champs optionnels'
      >
        <OptionalPreleveurFieldsForm
          preleveur={preleveur}
          setPreleveur={setPreleveur}
        />
      </AccordionCentered>
    </>
  )
}

export default PreleveurPhysiqueForm
