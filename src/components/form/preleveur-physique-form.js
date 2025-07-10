'use client'

import {useEffect, useState} from 'react'

import {Input} from '@codegouvfr/react-dsfr/Input'
import {Typography} from '@mui/material'

import AccordionCentered from '../ui/accordion-centered.js'

import OptionalPreleveurFieldsForm from './optional-preleveur-fields-form.js'

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
      <div className='w-full grid grid-cols-2 gap-4 pb-5'>
        <Input
          label='Nom *'
          nativeInputProps={{
            placeholder: 'Entrer le nom',
            defaultValue: preleveur?.nom || '',
            onChange: e => setPreleveur(prev => ({...prev, nom: e.target.value}))
          }}
        />
        <Input
          label='Prénom *'
          nativeInputProps={{
            placeholder: 'Entrer le prénom',
            defaultValue: preleveur?.prenom || '',
            onChange: e => setPreleveur(prev => ({...prev, prenom: e.target.value}))
          }}
        />
      </div>
      <Input
        label='Adresse e-mail *'
        nativeInputProps={{
          type: 'email',
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
