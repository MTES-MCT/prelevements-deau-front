'use client'

import {useEffect, useMemo, useState} from 'react'

import {useRouter} from '@bprogress/next/app'
import {Button} from '@codegouvfr/react-dsfr/Button'
import {SegmentedControl} from '@codegouvfr/react-dsfr/SegmentedControl'
import {Checkbox, FormControlLabel, Typography} from '@mui/material'
import {pick, trim} from 'lodash-es'

import PreleveurEmailAliasesForm from './preleveur-email-aliases-form.js'
import PreleveurMoralForm from './preleveur-moral-form.js'
import PreleveurPhysiqueForm from './preleveur-physique-form.js'

import GroupedMultiselect from '@/components/ui/GroupedMultiselect/index.js'
import {isDeclarantPhysique as checkIsPreleveurPhysique, PRELEVEUR_TYPE_ICONS} from '@/lib/declarants.js'
import {createPreleveurAction, updatePreleveurAction} from '@/server/actions/index.js'
import {emptyStringToNull} from '@/utils/string.js'

const COMMON_FIELDS = [
  'declarantType',
  'declarantRole',
  'quickDeclarationEnabled',
  'declarationNotificationsEnabled',
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

function firstTruthy(...values) {
  return values.find(Boolean) || ''
}

function getDeclarantType(declarant) {
  const hasSocialReason = Boolean(firstTruthy(declarant?.socialReason, declarant?.declarant?.socialReason))
  return declarant?.declarantType || (hasSocialReason ? 'LEGAL_PERSON' : 'NATURAL_PERSON')
}

function getDeclarantRole(declarant) {
  return firstTruthy(declarant?.declarantRole, declarant?.declarant?.declarantRole, 'PRELEVEUR')
}

function getQuickDeclarationEnabled(declarant) {
  return declarant?.quickDeclarationEnabled ?? declarant?.declarant?.quickDeclarationEnabled ?? true
}

function getDeclarationNotificationsEnabled(declarant) {
  return declarant?.declarationNotificationsEnabled ?? declarant?.declarant?.declarationNotificationsEnabled ?? true
}

const FormSection = ({
  title,
  description,
  icon,
  children
}) => (
  <section className='border border-gray-200 p-5 md:p-6'>
    <div className='mb-5 flex flex-col gap-1'>
      <Typography component='h2' variant='h5' className='flex items-center gap-2'>
        {icon && <span aria-hidden='true' className={icon} />}
        {title}
      </Typography>
      {description && (
        <Typography variant='body2' color='text.secondary'>
          {description}
        </Typography>
      )}
    </div>

    {children}
  </section>
)

function normalizeDeclarant(declarant) {
  const user = declarant?.user

  return {
    id: firstTruthy(declarant?.userId, declarant?.id),
    declarantType: getDeclarantType(declarant),
    declarantRole: getDeclarantRole(declarant),
    quickDeclarationEnabled: getQuickDeclarationEnabled(declarant),
    declarationNotificationsEnabled: getDeclarationNotificationsEnabled(declarant),
    civility: firstTruthy(declarant?.civility),
    firstName: firstTruthy(declarant?.firstName, user?.firstName),
    lastName: firstTruthy(declarant?.lastName, user?.lastName),
    email: firstTruthy(declarant?.email, user?.email),
    emailAliases: firstTruthy(declarant?.emailAliases, user?.emailAliases, []),
    jobTitle: firstTruthy(declarant?.jobTitle),
    socialReason: firstTruthy(declarant?.socialReason, declarant?.declarant?.socialReason),
    addressLine1: firstTruthy(declarant?.addressLine1),
    addressLine2: firstTruthy(declarant?.addressLine2),
    poBox: firstTruthy(declarant?.poBox),
    postalCode: firstTruthy(declarant?.postalCode),
    city: firstTruthy(declarant?.city),
    phoneNumber: firstTruthy(declarant?.phoneNumber),
    siret: firstTruthy(declarant?.siret)
  }
}

const PreleveurForm = ({
  initialZoneIds = [],
  inviteZoneIds = [],
  preleveur: initialPreleveur,
  zones = []
}) => {
  const router = useRouter()
  const normalizedInitialPreleveur = normalizeDeclarant(initialPreleveur)
  const isEditing = Boolean(normalizedInitialPreleveur.id)
  const canReadEmailAliases = initialPreleveur?.right?.permissions?.includes('declarant.email-alias.read')
  const canManageEmailAliases = initialPreleveur?.right?.permissions?.includes('declarant.email-alias.update')

  const [isPreleveurPhysique, setIsPreleveurPhysique] = useState(
    checkIsPreleveurPhysique(normalizedInitialPreleveur)
  )
  const [error, setError] = useState(null)
  const [validationErrors, setValidationErrors] = useState([])
  const [notifyAccountCreation, setNotifyAccountCreation] = useState(false)
  const [zoneIds, setZoneIds] = useState(initialZoneIds)
  const [preleveur, setPreleveur] = useState({
    declarantType: 'NATURAL_PERSON',
    declarantRole: 'PRELEVEUR',
    quickDeclarationEnabled: true,
    declarationNotificationsEnabled: true,
    civility: '',
    firstName: '',
    lastName: '',
    email: '',
    emailAliases: [],
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

  const isCollecteur = preleveur.declarantRole === 'COLLECTEUR'
  const canInvite = zoneIds.some(zoneId => inviteZoneIds.includes(zoneId))

  useEffect(() => {
    if (!canInvite) {
      setNotifyAccountCreation(false)
    }
  }, [canInvite])

  const zoneOptions = useMemo(() => {
    const groups = new Map()

    for (const zone of zones) {
      const type = zone.type || 'AUTRE'
      if (!groups.has(type)) {
        groups.set(type, [])
      }

      groups.get(type).push({
        value: zone.id,
        label: zone.name,
        content: `${zone.name}${zone.code ? ` - ${zone.code}` : ''}`
      })
    }

    return [...groups].map(([label, options]) => ({label, options}))
  }, [zones])
  const emailRequired = isCollecteur || (canInvite && notifyAccountCreation)
  const hasRequiredIdentity = isPreleveurPhysique
    ? trim(preleveur.lastName) && trim(preleveur.firstName)
    : trim(preleveur.socialReason)
  const isDisabled = !hasRequiredIdentity
    || (emailRequired && !trim(preleveur.email))
    || (!isEditing && zoneIds.length === 0)

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

      if (!isEditing) {
        cleanedPreleveur.notifyAccountCreation = canInvite && notifyAccountCreation && Boolean(cleanedPreleveur.email)
        cleanedPreleveur.zoneIds = zoneIds
      }

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
    <div className='fr-container mb-8'>
      <Typography component='h1' variant='h3' sx={{pb: 5}}>
        {isEditing ? 'Édition d’un déclarant' : 'Création d’un déclarant'}
      </Typography>

      <div className='flex flex-col gap-6'>
        {!isEditing && (
          <FormSection
            title='Zones de rattachement'
            description='Sélectionnez au moins une zone sur laquelle ce déclarant doit être visible et géré.'
            icon='ri-map-pin-2-line'
          >
            <GroupedMultiselect
              searchable
              hint='Plusieurs zones peuvent être sélectionnées.'
              id='declarant-zone-ids'
              label='Zones *'
              options={zoneOptions}
              placeholder='Sélectionner une ou plusieurs zones'
              value={zoneIds}
              onChange={setZoneIds}
            />
          </FormSection>
        )}

        <FormSection
          title='Informations du déclarant'
          description='Identité, rôle, contact et options de dépôt.'
          icon='ri-user-settings-line'
        >
          <div className='flex flex-col gap-4'>
            <SegmentedControl
              className='mb-4'
              legend='Rôle du déclarant'
              segments={[
                {
                  iconId: 'ri-drop-line',
                  label: 'Préleveur',
                  nativeInputProps: {
                    checked: preleveur.declarantRole === 'PRELEVEUR',
                    onChange: () => setPreleveur(prev => ({...prev, declarantRole: 'PRELEVEUR'}))
                  }
                },
                {
                  iconId: 'ri-group-line',
                  label: 'Collecteur',
                  nativeInputProps: {
                    checked: preleveur.declarantRole === 'COLLECTEUR',
                    onChange: () => setPreleveur(prev => ({...prev, declarantRole: 'COLLECTEUR'}))
                  }
                }
              ]}
            />

            <SegmentedControl
              className='mb-4'
              legend='Type de personne'
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
                emailRequired={emailRequired}
              />
            ) : (
              <PreleveurMoralForm
                preleveur={preleveur}
                setPreleveur={setPreleveur}
                emailRequired={emailRequired}
              />
            )}

            <FormControlLabel
              control={(
                <Checkbox
                  checked={preleveur.quickDeclarationEnabled !== false}
                  onChange={event => setPreleveur(prev => ({
                    ...prev,
                    quickDeclarationEnabled: event.target.checked
                  }))}
                />
              )}
              label='Activer la saisie rapide des déclarations'
            />

            <Typography variant='body2' color='text.secondary' sx={{mt: -2}}>
              Activé par défaut : le déclarant pourra saisir ses index directement dans la plateforme, sans déposer de fichier.
            </Typography>

            <FormControlLabel
              control={(
                <Checkbox
                  checked={preleveur.declarationNotificationsEnabled !== false}
                  onChange={event => setPreleveur(prev => ({
                    ...prev,
                    declarationNotificationsEnabled: event.target.checked
                  }))}
                />
              )}
              label='Inclure ce déclarant dans les rappels et relances de déclaration'
            />

            <Typography variant='body2' color='text.secondary' sx={{mt: -2}}>
              Activé par défaut : le déclarant pourra recevoir les rappels et relances automatiques liés aux déclarations attendues.
            </Typography>

            {!isEditing && canInvite && (
              <FormControlLabel
                control={(
                  <Checkbox
                    checked={notifyAccountCreation}
                    disabled={!preleveur.email}
                    onChange={event => setNotifyAccountCreation(event.target.checked)}
                  />
                )}
                label='Notifier le déclarant par email de la création de son compte'
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
            <div className='w-full flex justify-end pt-2'>
              <Button disabled={isDisabled} onClick={handleSubmit}>
                {isEditing ? 'Enregistrer les informations' : 'Créer le déclarant'}
              </Button>
            </div>
          </div>
        </FormSection>

        {isEditing && canReadEmailAliases && (
          <FormSection
            title='Alias e-mail de connexion'
            description='Adresses secondaires autorisées pour ce même compte, gérées séparément des informations du déclarant.'
            icon='ri-at-line'
          >
            <PreleveurEmailAliasesForm
              canManage={canManageEmailAliases}
              declarantId={normalizedInitialPreleveur.id}
              initialAliases={normalizedInitialPreleveur.emailAliases}
              primaryEmail={preleveur.email}
            />
          </FormSection>
        )}
      </div>
    </div>
  )
}

export default PreleveurForm
