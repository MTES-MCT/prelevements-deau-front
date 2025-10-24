/* eslint-disable camelcase */

'use client'

import {useEffect, useState} from 'react'

import {Button} from '@codegouvfr/react-dsfr/Button'
import {Typography} from '@mui/material'
import {omit} from 'lodash-es'
import dynamic from 'next/dynamic'
import {useRouter, useSearchParams} from 'next/navigation'

import PreleveurMoralForm from './preleveur-moral-form.js'
import PreleveurPhysiqueForm from './preleveur-physique-form.js'

import {createPreleveur} from '@/app/api/points-prelevement.js'
import {emptyStringToNull} from '@/utils/string.js'

const DynamicCheckbox = dynamic(
  () => import('@codegouvfr/react-dsfr/Checkbox'),
  {ssr: false}
)

const PreleveurCreationForm = () => {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [isDisabled, setIsDisabled] = useState(true)
  const [isPreleveurPhysique, setIsPreleveurPhysique] = useState(true)
  const [error, setError] = useState(null)
  const [validationErrors, setValidationErrors] = useState([])
  const [preleveur, setPreleveur] = useState({
    civilite: '',
    raison_sociale: '',
    sigle: '',
    nom: '',
    prenom: '',
    email: '',
    adresse_1: '',
    adresse_2: '',
    bp: '',
    code_postal: '',
    commune: '',
    numero_telephone: '',
    code_siren: ''
  })

  useEffect(() => {
    const preleveur = {}
    for (const [key, value] of searchParams.entries()) {
      preleveur[key] = value
    }

    setIsPreleveurPhysique(preleveur.__typename === 'PersonnePhysique')
    setPreleveur(omit(preleveur, '__typename'))
  }, [searchParams])

  const handleSubmit = async () => {
    setError(null)
    setValidationErrors([])

    if (preleveur.numero_telephone && !/^\d{10}$/.test(preleveur.numero_telephone)) {
      setValidationErrors([
        {message: 'Le numéro de téléphone doit être composé de dix chiffres.'}
      ])

      return
    }

    if (preleveur.code_postal && !/^\d{5}$/.test(preleveur.code_postal)) {
      setValidationErrors([
        {message: 'Le code postal doit être composé de 5 chiffres.'}
      ])

      return
    }

    try {
      const cleanedPreleveur = emptyStringToNull(preleveur)
      const response = await createPreleveur(cleanedPreleveur)

      if (response.code === 400) {
        if (response.validationErrors) {
          setValidationErrors(response.validationErrors)
        } else {
          setError(response.message)
        }
      } else {
        router.push(`/preleveurs/${response.id_preleveur}`)
      }
    } catch (error) {
      setError(error.message)
    }
  }

  useEffect(() => {
    setIsDisabled(!(preleveur.nom && preleveur.prenom && preleveur.email))
  }, [preleveur])

  return (
    <div className='fr-container'>
      <Typography variant='h3' sx={{pb: 5}}>
        Création d&apos;un préleveur
      </Typography>
      <DynamicCheckbox
        small
        legend='Choix du type :'
        options={[
          {
            value: 'physique',
            label: 'Personne physique',
            nativeInputProps: {
              checked: isPreleveurPhysique,
              onChange: () => setIsPreleveurPhysique(true)
            }
          },
          {
            value: 'morale',
            label: 'Personne morale',
            nativeInputProps: {
              checked: !isPreleveurPhysique,
              onChange: () => setIsPreleveurPhysique(false)
            }
          }
        ]}
      />
      {isPreleveurPhysique ? (
        <PreleveurPhysiqueForm
          preleveur={preleveur}
          setPreleveur={setPreleveur}
        />
      ) : (
        <PreleveurMoralForm
          preleveur={preleveur}
          setPreleveur={setPreleveur}
        />
      )}
      {error && (
        <div className='text-center p-5 text-red-500'>
          <p><b>Un problème est survenu :</b></p>
          {error}
        </div>
      )}
      {validationErrors?.length > 0 && (
        <div className='text-center p-5 text-red-500'>
          <p><b>{validationErrors.length === 1 ? 'Problème de validation :' : 'Problèmes de validation :'}</b></p>
          {validationErrors.map(err => (
            <p key={err.message}>{err.message}</p>
          )
          )}
        </div>
      )}
      <div className='w-full flex justify-center p-5 mb-8'>
        <Button disabled={isDisabled} onClick={handleSubmit}>
          Valider la création du préleveur
        </Button>
      </div>
    </div>
  )
}

export default PreleveurCreationForm
