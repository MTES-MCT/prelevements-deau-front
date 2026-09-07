
'use client'

import {useEffect, useState} from 'react'

import {Input} from '@codegouvfr/react-dsfr/Input'
import {Select} from '@codegouvfr/react-dsfr/SelectNext'
import {Typography} from '@mui/material'

import OptionalPreleveurFieldsForm from '@/components/form/optional-preleveur-fields-form.js'
import SearchByStructure from '@/components/form/search-by-structure.js'
import AccordionCentered from '@/components/ui/AccordionCentered/index.js'
import {CopyEmailButton} from '@/components/ui/CopyableEmail/index.js'

const PreleveurMoralForm = ({
  emailRequired = false,
  preleveur,
  showCopyEmail = false,
  setPreleveur
}) => {
  const [isExpanded, setIsExpanded] = useState(false)

  useEffect(() => {
    if (
      preleveur?.addressLine1
      || preleveur?.addressLine2
      || preleveur?.poBox
      || preleveur?.postalCode
      || preleveur?.city
      || preleveur?.phoneNumber
    ) {
      setIsExpanded(true)
    }
  }, [
    preleveur?.addressLine1,
    preleveur?.addressLine2,
    preleveur?.city,
    preleveur?.phoneNumber,
    preleveur?.poBox,
    preleveur?.postalCode
  ])

  return (
    <>
      <Typography component='h3' variant='h6' className='pb-5'>
        Informations de la structure
      </Typography>
      <div className='pb-6'>
        <SearchByStructure setPreleveur={setPreleveur} />
      </div>
      <div className='grid grid-cols-1 md:grid-cols-2 gap-4 pb-5'>
        <Input
          label='Nom de la structure *'
          hintText='Raison sociale, dénomination d’association ou nom officiel'
          nativeInputProps={{
            placeholder: 'Entrer le nom de la structure',
            value: preleveur?.socialReason || '',
            onChange: e => setPreleveur(prev => ({...prev, socialReason: e.target.value}))
          }}
        />
        <Input
          label='SIRET de la structure'
          hintText='Identifiant à 14 chiffres du siège ou de l’établissement'
          nativeInputProps={{
            placeholder: 'Entrer le SIRET',
            value: preleveur?.siret || '',
            onChange: e => setPreleveur(prev => ({...prev, siret: e.target.value}))
          }}
        />
      </div>
      <Typography component='h3' variant='h6' className='pb-5 pt-2'>
        Contact principal
      </Typography>
      <Input
        label='Fonction du contact'
        hintText='Fonction ou service du contact'
        nativeInputProps={{
          placeholder: 'Entrer la fonction',
          value: preleveur?.jobTitle || '',
          onChange: e => setPreleveur(prev => ({...prev, jobTitle: e.target.value}))
        }}
      />
      <div className='w-full grid grid-cols-1 md:grid-cols-[1fr_2fr_2fr] gap-4 pb-5'>
        <Select
          label='Civilité du contact'
          placeholder='Choisir la civilité'
          nativeSelectProps={{
            value: preleveur?.civility || '',
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
            value: preleveur?.lastName || '',
            onChange: e => setPreleveur(prev => ({...prev, lastName: e.target.value}))
          }}
        />
        <Input
          label='Prénom du contact'
          nativeInputProps={{
            placeholder: 'Entrer le prénom',
            value: preleveur?.firstName || '',
            onChange: e => setPreleveur(prev => ({...prev, firstName: e.target.value}))
          }}
        />
      </div>
      <div className='group'>
        <Input
          action={showCopyEmail ? <CopyEmailButton revealOnHover email={preleveur?.email} /> : undefined}
          hintText={emailRequired ? 'Obligatoire pour permettre la connexion ou l’envoi de notification.' : 'Facultative pour un préleveur non déclarant.'}
          label={`Adresse e-mail de connexion${emailRequired ? ' *' : ''}`}
          nativeInputProps={{
            placeholder: 'Entrer l’adresse e-mail de connexion',
            value: preleveur?.email || '',
            onChange: e => setPreleveur(prev => ({...prev, email: e.target.value}))
          }}
        />
      </div>
      <AccordionCentered
        isExpanded={isExpanded}
        setIsExpanded={setIsExpanded}
        label='l’adresse et le téléphone'
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
