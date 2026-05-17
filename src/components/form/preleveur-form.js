
'use client'

import {useState} from 'react'

import {Button} from '@codegouvfr/react-dsfr/Button'
import {SegmentedControl} from '@codegouvfr/react-dsfr/SegmentedControl'
import {Typography} from '@mui/material'
import {pick, trim} from 'lodash-es'
import {useRouter} from 'next/navigation'

import PreleveurMoralForm from './preleveur-moral-form.js'
import PreleveurPhysiqueForm from './preleveur-physique-form.js'

import {isDeclarantPhysique as checkIsPreleveurPhysique, PRELEVEUR_TYPE_ICONS} from '@/lib/declarants.js'
import {createPreleveurAction, updatePreleveurAction} from '@/server/actions/index.js'
import {emptyStringToNull} from '@/utils/string.js'

const COMMON_FIELDS = [
  'declarantType',
  'civility',
  'lastName',
  'firstName',
  'email',
  'jobTitle',
  'addressLine1',
  'addressLine2',
  'poBox',
  'postalCode',
  'city',
  'phoneNumber'
]

const MORAL_ONLY_FIELDS = [
  'socialReason',
  'siret'
]

// eslint-disable-next-line complexity
function normalizeDeclarant(declarant) {
  return {
    id: declarant?.userId || declarant?.id,
    declarantType: declarant?.declarantType || (declarant?.socialReason || declarant?.declarant?.socialReason ? 'LEGAL_PERSON' : 'NATURAL_PERSON'),
    civility: declarant?.civility || '',
    firstName: declarant?.firstName || declarant?.user?.firstName || '',
    lastName: declarant?.lastName || declarant?.user?.lastName || '',
    email: declarant?.email || declarant?.user?.email || '',
    jobTitle: declarant?.jobTitle || '',
    socialReason: declarant?.socialReason || declarant?.declarant?.socialReason || '',
    addressLine1: declarant?.addressLine1 || '',
    addressLine2: declarant?.addressLine2 || '',
    poBox: declarant?.poBox || '',
    postalCode: declarant?.postalCode || '',
    city: declarant?.city || '',
    phoneNumber: declarant?.phoneNumber || '',
    siret: declarant?.siret || ''
  }
}

const PreleveurForm = ({preleveur: initialPreleveur}) => {
  const router = useRouter()
  const normalizedInitialPreleveur = normalizeDeclarant(initialPreleveur)
  const isEditing = Boolean(normalizedInitialPreleveur.id)

  const [isPreleveurPhysique, setIsPreleveurPhysique] = useState(
    checkIsPreleveurPhysique(normalizedInitialPreleveur)
  )
  const [error, setError] = useState(null)
  const [validationErrors, setValidationErrors] = useState([])
  const [preleveur, setPreleveur] = useState({
    declarantType: 'NATURAL_PERSON',
    civility: '',
    firstName: '',
    lastName: '',
    email: '',
    jobTitle: '',
    socialReason: '',
    addressLine1: '',
    addressLine2: '',
    poBox: '',
    postalCode: '',
    city: '',
    phoneNumber: '',
    siret: '',
    ...normalizedInitialPreleveur
  })

  const isDisabled = isPreleveurPhysique
    ? !(trim(preleveur.lastName) && trim(preleveur.firstName) && trim(preleveur.email))
    : !(trim(preleveur.socialReason) && trim(preleveur.email))

  const handleSubmit = async () => {
    setError(null)
    setValidationErrors([])

    if (preleveur.phoneNumber && !/^\d{10}$/.test(preleveur.phoneNumber)) {
      setValidationErrors([
        {message: 'Le numéro de téléphone doit être composé de dix chiffres.'}
      ])

      return
    }

    if (preleveur.postalCode && !/^\d{5}$/.test(preleveur.postalCode)) {
      setValidationErrors([
        {message: 'Le code postal doit être composé de 5 chiffres.'}
      ])

      return
    }

    try {
      const declarantType = isPreleveurPhysique ? 'NATURAL_PERSON' : 'LEGAL_PERSON'
      const fieldsToSend = isPreleveurPhysique
        ? COMMON_FIELDS
        : [...COMMON_FIELDS, ...MORAL_ONLY_FIELDS]

      const filteredPreleveur = pick({...preleveur, declarantType}, fieldsToSend)
      const cleanedPreleveur = emptyStringToNull(filteredPreleveur)

      let response

      if (isEditing) {
        response = await updatePreleveurAction(normalizedInitialPreleveur.id, cleanedPreleveur)
      } else {
        response = await createPreleveurAction(cleanedPreleveur)
      }

      if (response.success) {
        router.push(`/declarants/${response.data.userId || response.data.id}`)
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
        {isEditing ? 'Édition d’un déclarant' : 'Création d’un déclarant'}
      </Typography>

      <div className='flex flex-col gap-4'>
        <SegmentedControl
          className='mb-4'
          legend='Type de déclarant'
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
