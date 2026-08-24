'use client'

import {useState} from 'react'

import {Alert} from '@codegouvfr/react-dsfr/Alert'
import {Button} from '@codegouvfr/react-dsfr/Button'
import {Input} from '@codegouvfr/react-dsfr/Input'
import Link from 'next/link'
import {useRouter} from 'next/navigation'

import {copyTextToClipboard} from '@/lib/clipboard.js'
import {getPasswordAccessActionAvailability} from '@/lib/password-accesses.js'
import {
  createPasswordActivationAction,
  revokePasswordAccessAction
} from '@/server/actions/password-accesses.js'

const STATUS_LABELS = Object.freeze({
  ACTIVE: 'Actif',
  PENDING: 'Activation en attente',
  EXPIRED: 'Lien expiré',
  NONE: 'Non activé'
})

const STATUS_CLASSES = Object.freeze({
  ACTIVE: 'fr-badge--success',
  PENDING: 'fr-badge--info',
  EXPIRED: 'fr-badge--warning',
  NONE: 'fr-badge--new'
})

function formatDateTime(value) {
  if (!value) {
    return '—'
  }

  return new Intl.DateTimeFormat('fr-FR', {
    dateStyle: 'medium',
    timeStyle: 'short'
  }).format(new Date(value))
}

function getUserLabel(user) {
  return [user.firstName, user.lastName].filter(Boolean).join(' ') || user.email
}

function getActivationActionLabel(status) {
  if (status === 'ACTIVE') {
    return 'Réinitialiser l’accès'
  }

  return status === 'NONE' ? 'Créer un accès' : 'Remplacer le lien'
}

const PasswordAccessRow = ({access, currentUserId, onActivationCreated}) => {
  const router = useRouter()
  const [isBusy, setIsBusy] = useState(false)
  const [error, setError] = useState(null)
  const {user, status} = access
  const actionAvailability = getPasswordAccessActionAvailability({
    currentUserId,
    status,
    userId: user.id
  })

  const handleCreateActivation = async () => {
    if (!actionAvailability.canCreateActivation) {
      return
    }

    if (status === 'ACTIVE') {
      // eslint-disable-next-line no-alert
      const confirmed = window.confirm(
        `Réinitialiser l’accès par mot de passe de ${getUserLabel(user)} ?\n\nSon mot de passe actuel et toutes ses sessions seront invalidés immédiatement.`
      )

      if (!confirmed) {
        return
      }
    } else if (status === 'PENDING' || status === 'EXPIRED') {
      // eslint-disable-next-line no-alert
      const confirmed = window.confirm(
        `Remplacer le lien d’activation de ${getUserLabel(user)} ?\n\nLe lien précédent sera invalidé.`
      )

      if (!confirmed) {
        return
      }
    }

    setIsBusy(true)
    setError(null)

    try {
      const result = await createPasswordActivationAction(user.id)

      if (!result.success || !result.data?.activationUrl) {
        setError(result.error || 'Le lien d’activation n’a pas pu être généré.')
        return
      }

      onActivationCreated({
        activationUrl: result.data.activationUrl,
        expiresAt: result.data.expiresAt,
        reset: result.data.reset,
        sessionsRevoked: result.data.sessionsRevoked,
        user
      })
      router.refresh()
    } catch {
      setError('Le lien d’activation n’a pas pu être généré.')
    } finally {
      setIsBusy(false)
    }
  }

  const handleRevoke = async () => {
    if (!actionAvailability.canRevoke) {
      return
    }

    // eslint-disable-next-line no-alert
    const confirmed = window.confirm(
      `Révoquer l’accès par mot de passe de ${getUserLabel(user)} ?\n\nSes sessions et son lien d’activation seront invalidés.`
    )

    if (!confirmed) {
      return
    }

    setIsBusy(true)
    setError(null)

    try {
      const result = await revokePasswordAccessAction(user.id)

      if (!result.success) {
        setError(result.error || 'L’accès n’a pas pu être révoqué.')
        return
      }

      router.refresh()
    } catch {
      setError('L’accès n’a pas pu être révoqué.')
    } finally {
      setIsBusy(false)
    }
  }

  return (
    <tr>
      <td>
        <strong>{getUserLabel(user)}</strong><br />
        <span className='fr-text--xs'>{user.email}</span>
        {error && <p className='fr-error-text fr-mt-1v'>{error}</p>}
      </td>
      <td>{user.role}</td>
      <td>
        <span className={`fr-badge fr-badge--sm ${STATUS_CLASSES[status] || ''}`}>
          {STATUS_LABELS[status] || status}
        </span>
      </td>
      <td>
        {status === 'ACTIVE' ? formatDateTime(access.passwordSetAt) : formatDateTime(access.activationExpiresAt)}
      </td>
      <td>
        {!actionAvailability.identityAvailable && (
          <p className='fr-text--xs fr-mb-0'>
            Actions indisponibles : votre identité n’a pas pu être vérifiée. Rechargez la page.
          </p>
        )}
        {actionAvailability.identityAvailable && actionAvailability.isOwnAccount && (
          <p className='fr-text--xs fr-mb-0'>
            Ces actions sont indisponibles sur votre propre compte afin d’éviter son verrouillage.
            {' '}Pour modifier un mot de passe existant, utilisez <Link href='/mon-compte'>Mon compte</Link>.
            {' '}Pour créer, réinitialiser ou révoquer cet accès, demandez à un autre administrateur.
          </p>
        )}
        {actionAvailability.identityAvailable && !actionAvailability.isOwnAccount && (
          <div className='flex flex-wrap gap-2'>
            <Button
              size='small'
              priority='secondary'
              disabled={isBusy || !actionAvailability.canCreateActivation}
              onClick={handleCreateActivation}
            >
              {getActivationActionLabel(status)}
            </Button>
            {actionAvailability.canRevoke && (
              <Button
                size='small'
                priority='tertiary no outline'
                disabled={isBusy}
                onClick={handleRevoke}
              >
                Révoquer
              </Button>
            )}
          </div>
        )}
      </td>
    </tr>
  )
}

const PasswordAccessesAdmin = ({accesses, currentUserId, initialSearch = ''}) => {
  const [activation, setActivation] = useState(null)
  const [copyState, setCopyState] = useState(null)

  const copyActivationUrl = async () => {
    const copied = await copyTextToClipboard(activation.activationUrl)
    setCopyState(copied ? 'Lien copié.' : 'Copie impossible : sélectionnez le lien ci-dessous.')
  }

  return (
    <div className='flex flex-col gap-6'>
      {activation && (
        <Alert
          severity='success'
          title={`Lien créé pour ${getUserLabel(activation.user)}`}
          description={(
            <div className='flex flex-col gap-2'>
              <p className='fr-mb-0'>
                Ce lien est affiché uniquement ici, utilisable une fois et valable jusqu’au {formatDateTime(activation.expiresAt)}.
              </p>
              {activation.reset && (
                <p className='fr-mb-0'>
                  Le mot de passe précédent et {activation.sessionsRevoked || 0} session(s) ont été révoqués.
                </p>
              )}
              <code className='block break-all select-all'>{activation.activationUrl}</code>
              <div>
                <Button size='small' priority='secondary' onClick={copyActivationUrl}>Copier le lien</Button>
              </div>
              {copyState && <p className='fr-text--xs fr-mb-0' aria-live='polite'>{copyState}</p>}
            </div>
          )}
        />
      )}

      <form action='/administration/acces-mot-de-passe' className='max-w-xl' method='get'>
        <Input
          label='Rechercher un compte'
          hintText='Nom ou adresse email'
          nativeInputProps={{
            type: 'search',
            name: 'recherche',
            defaultValue: initialSearch
          }}
        />
        <Button type='submit' size='small'>Rechercher</Button>
      </form>

      {accesses.length === 0 ? (
        <Alert
          severity='info'
          title='Aucun compte trouvé'
          description='Modifiez la recherche pour afficher d’autres comptes.'
        />
      ) : (
        <div className='fr-table fr-table--bordered'>
          <div className='fr-table__wrapper'>
            <div className='fr-table__container'>
              <div className='fr-table__content'>
                <table>
                  <caption>Accès par mot de passe des comptes actifs</caption>
                  <thead>
                    <tr>
                      <th scope='col'>Compte</th>
                      <th scope='col'>Rôle</th>
                      <th scope='col'>État</th>
                      <th scope='col'>Date</th>
                      <th scope='col'>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {accesses.map(access => (
                      <PasswordAccessRow
                        key={access.user.id}
                        access={access}
                        currentUserId={currentUserId}
                        onActivationCreated={value => {
                          setActivation(value)
                          setCopyState(null)
                        }}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default PasswordAccessesAdmin
