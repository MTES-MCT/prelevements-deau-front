/* eslint-disable camelcase */

'use client'

import {useState} from 'react'

import {Button} from '@codegouvfr/react-dsfr/Button'
import {SegmentedControl} from '@codegouvfr/react-dsfr/SegmentedControl'
import {Typography} from '@mui/material'
import {pick, trim} from 'lodash-es'
import {useRouter} from 'next/navigation'

import PreleveurMoralForm from './preleveur-moral-form.js'
import PreleveurPhysiqueForm from './preleveur-physique-form.js'

import {isPreleveurPhysique as checkIsPreleveurPhysique, PRELEVEUR_TYPE_ICONS} from '@/lib/preleveurs.js'
import {createPreleveurAction, updatePreleveurAction} from '@/server/actions/index.js'
import {emptyStringToNull} from '@/utils/string.js'

// Fields common to both preleveur types
const COMMON_FIELDS = [
  'civilite',
  'nom',
  'prenom',
  'email',
  'adresse_1',
  'adresse_2',
  'bp',
  'code_postal',
  'commune',
  'numero_telephone'
]

// Fields specific to personne morale
const MORAL_ONLY_FIELDS = [
  'code_siren',
  'raison_sociale',
  'sigle'
]

const PreleveurForm = ({preleveur: initialPreleveur}) => {
  const router = useRouter()

  const isEditing = Boolean(initialPreleveur?._id)

  const [isPreleveurPhysique, setIsPreleveurPhysique] = useState(
    checkIsPreleveurPhysique(initialPreleveur)
  )
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
    code_siren: '',
    ...initialPreleveur
  })

  // Determine if submit button should be disabled (trim values to handle whitespace-only)
  const isDisabled = isPreleveurPhysique
    ? !(trim(preleveur.nom) && trim(preleveur.prenom) && trim(preleveur.email))
    : !(trim(preleveur.raison_sociale) || trim(preleveur.sigle))

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
      // Filter fields based on preleveur type
      const fieldsToSend = isPreleveurPhysique
        ? COMMON_FIELDS
        : [...COMMON_FIELDS, ...MORAL_ONLY_FIELDS]

      const filteredPreleveur = pick(preleveur, fieldsToSend)
      const cleanedPreleveur = emptyStringToNull(filteredPreleveur)

      let response

      if (isEditing) {
        response = await updatePreleveurAction(initialPreleveur._id, cleanedPreleveur)
      } else {
        response = await createPreleveurAction(cleanedPreleveur)
      }

      if (response.success) {
        router.push(`/preleveurs/${response.data.id_preleveur}`)
      } else if (response.validationErrors) {
        setValidationErrors(response.validationErrors)
      } else {
        setError(response.error)
      }
    } catch (error) {
      setError(error.message)
    }
  }

  return (
    <div className='fr-container'>
      <Typography variant='h3' sx={{pb: 5}}>
        {isEditing ? 'Édition d’un préleveur' : 'Création d’un préleveur'}
      </Typography>

      <div className='flex flex-col gap-4'>
        <SegmentedControl
          className='mb-4'
          legend='Type de préleveur'
          segments={[
            {
              iconId: PRELEVEUR_TYPE_ICONS.physique,
              label: 'Personne physique',
              nativeInputProps: {
                checked: isPreleveurPhysique,
                onChange: () => setIsPreleveurPhysique(true)
              }
            },
            {
              iconId: PRELEVEUR_TYPE_ICONS.morale,
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
        <div className='w-full flex justify-end p-5 mb-8'>
          <Button disabled={isDisabled} onClick={handleSubmit}>
            {isEditing ? 'Enregistrer' : 'Créer'}
          </Button>
        </div>
      </div>
    </div>
  )
}

export default PreleveurForm
