/* eslint-disable camelcase */
'use client'

import {useEffect, useState} from 'react'

import {Input} from '@codegouvfr/react-dsfr/Input'
import {Typography} from '@mui/material'

import OptionalPreleveurFieldsForm from '@/components/form/optional-preleveur-fields-form.js'
import SearchByCompany from '@/components/form/search-by-company.js'
import AccordionCentered from '@/components/ui/accordion-centered.js'

const PreleveurMoralForm = ({preleveur, setPreleveur}) => {
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
      <div className='grid grid-cols-2 gap-4 pb-5'>
        <div>
          <p className='pb-2'>Rechercher l’entreprise</p>
          <SearchByCompany setPreleveur={setPreleveur} />
        </div>
        <Input
          label='Code SIREN'
          nativeInputProps={{
            placeholder: 'Entrer le code SIREN',
            defaultValue: preleveur?.code_siren || '',
            onChange: e => setPreleveur(prev => ({...prev, code_siren: e.target.value}))
          }}
        />
      </div>
      <Input
        label='Raison sociale'
        hintText='Nom officiel de l’entreprise'
        nativeInputProps={{
          placeholder: 'Entrer la raison sociale',
          defaultValue: preleveur?.raison_sociale || '',
          onChange: e => setPreleveur(prev => ({...prev, raison_sociale: e.target.value}))
        }}
      />
      <div className='grid grid-cols-2 gap-4 pb-5'>
        <Input
          label='Nom du contact'
          nativeInputProps={{
            placeholder: 'Entrer le nom',
            defaultValue: preleveur?.nom || '',
            onChange: e => setPreleveur(prev => ({...prev, nom: e.target.value}))
          }}
        />
        <Input
          label='Prénom du contact'
          nativeInputProps={{
            placeholder: 'Entrer le prénom',
            defaultValue: preleveur?.prenom || '',
            onChange: e => setPreleveur(prev => ({...prev, prenom: e.target.value}))
          }}
        />
      </div>
      <Input
        label='Adresse email du contact'
        nativeInputProps={{
          placeholder: 'Entrer l’adresse email de contact',
          defaultValue: preleveur?.email || '',
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

export default PreleveurMoralForm
