
'use client'

import {useEffect, useState} from 'react'

import {Input} from '@codegouvfr/react-dsfr/Input'
import {Select} from '@codegouvfr/react-dsfr/SelectNext'
import {Typography} from '@mui/material'

import OptionalPreleveurFieldsForm from '@/components/form/optional-preleveur-fields-form.js'
import SearchByCompany from '@/components/form/search-by-company.js'
import AccordionCentered from '@/components/ui/AccordionCentered/index.js'

const PreleveurMoralForm = ({preleveur, setPreleveur, emailRequired = false}) => {
  const [isExpanded, setIsExpanded] = useState(false)

  useEffect(() => {
    if (preleveur?.commune) {
      setIsExpanded(true)
    }
  }, [preleveur])

  return (
    <>
      <Typography component='h3' variant='h6' className='pb-5'>
        Informations générales
      </Typography>
      <div className='grid grid-cols-1 md:grid-cols-2 gap-4 pb-5'>
        <div>
          <p className='pb-2'>Rechercher l’entreprise</p>
          <SearchByCompany setPreleveur={setPreleveur} />
        </div>
        <Input
          label='SIRET'
          nativeInputProps={{
            placeholder: 'Entrer le SIRET',
            defaultValue: preleveur?.siret || '',
            onChange: e => setPreleveur(prev => ({...prev, siret: e.target.value}))
          }}
        />
      </div>
      <Input
        label='Raison sociale *'
        hintText='Nom officiel de l’entreprise'
        nativeInputProps={{
          placeholder: 'Entrer la raison sociale',
          defaultValue: preleveur?.socialReason || '',
          onChange: e => setPreleveur(prev => ({...prev, socialReason: e.target.value}))
        }}
      />
      <Input
        label='Fonction du contact'
        hintText='Fonction ou service du contact'
        nativeInputProps={{
          placeholder: 'Entrer la fonction',
          defaultValue: preleveur?.jobTitle || '',
          onChange: e => setPreleveur(prev => ({...prev, jobTitle: e.target.value}))
        }}
      />
      <div className='w-full grid grid-cols-1 md:grid-cols-[1fr_2fr_2fr] gap-4 pb-5'>
        <Select
          label='Civilité du contact'
          placeholder='Choisir la civilité'
          nativeSelectProps={{
            defaultValue: preleveur?.civility || '',
            onChange: e => setPreleveur(prev => ({...prev, civility: e.target.value}))
          }}
          options={[
            {value: 'MR', label: 'M. '},
            {value: 'MRS', label: 'Mme'},
            {value: '', label: 'Non indiqué'}
          ]}
        />
        <Input
          label='Nom du contact'
          nativeInputProps={{
            placeholder: 'Entrer le nom',
            defaultValue: preleveur?.lastName || '',
            onChange: e => setPreleveur(prev => ({...prev, lastName: e.target.value}))
          }}
        />
        <Input
          label='Prénom du contact'
          nativeInputProps={{
            placeholder: 'Entrer le prénom',
            defaultValue: preleveur?.firstName || '',
            onChange: e => setPreleveur(prev => ({...prev, firstName: e.target.value}))
          }}
        />
      </div>
      <Input
        label={`Adresse email du contact${emailRequired ? ' *' : ''}`}
        hintText={emailRequired ? 'Obligatoire pour permettre la connexion ou l’envoi de notification.' : 'Facultative pour un préleveur non déclarant.'}
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
