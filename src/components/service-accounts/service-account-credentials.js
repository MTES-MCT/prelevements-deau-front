'use client'

import {useState} from 'react'

import {useRouter} from 'next/navigation'

import ServiceAccountStatusBadge from '@/components/service-accounts/service-account-status-badge.js'
import {
  formatDate,
  formatDateTime,
  getActionData
} from '@/components/service-accounts/service-account-utils.js'
import {
  createServiceAccountCredentialAction,
  revokeServiceAccountCredentialAction
} from '@/server/actions/service-accounts.js'

const ServiceAccountCredentials = ({serviceAccount}) => {
  const router = useRouter()
  const [account, setAccount] = useState(serviceAccount)
  const [isBusy, setIsBusy] = useState(false)
  const [message, setMessage] = useState(null)
  const [secret, setSecret] = useState(null)
  const credentials = account.credentials || []

  async function runAction(action, successMessage) {
    setIsBusy(true)
    setMessage(null)

    try {
      const data = getActionData(await action())
      const nextAccount = data?.account || data

      if (nextAccount?.id) {
        setAccount(nextAccount)
      }

      setMessage({type: 'success', text: successMessage})
      router.refresh()
      return data
    } catch (error) {
      setMessage({type: 'error', text: error.message})
      return null
    } finally {
      setIsBusy(false)
    }
  }

  async function handleCreateCredential(event) {
    event.preventDefault()
    const formData = new FormData(event.currentTarget)
    const expiresAt = formData.get('expiresAt')

    const data = await runAction(async () => createServiceAccountCredentialAction(account.id, {
      name: formData.get('name') || null,
      expiresAt: expiresAt || null
    }), 'Identifiant technique créé. Copiez le secret maintenant.')

    if (data?.clientSecret) {
      setSecret({
        keyId: data.keyId,
        clientSecret: data.clientSecret
      })
      event.currentTarget.reset()
    }
  }

  async function handleRevokeCredential(credential) {
    // eslint-disable-next-line no-alert
    const confirmed = window.confirm(
      `Révoquer l’identifiant technique « ${credential.keyId} » ?\n\nLes tokens actifs issus de cet identifiant seront révoqués.`
    )

    if (!confirmed) {
      return
    }

    await runAction(async () => revokeServiceAccountCredentialAction(account.id, credential.id), 'Identifiant technique révoqué.')
  }

  /* eslint-disable react/jsx-no-bind */
  return (
    <div className='fr-grid-row fr-grid-row--gutters'>
      <div className='fr-col-12 fr-col-lg-4'>
        {message && (
          <div className={`fr-alert fr-alert--${message.type === 'error' ? 'error' : 'success'} fr-mb-3w`}>
            <p>{message.text}</p>
          </div>
        )}

        {secret && (
          <div className='fr-alert fr-alert--warning fr-mb-3w'>
            <h2 className='fr-alert__title'>Secret affiché une seule fois</h2>
            <p>Copiez ces valeurs maintenant. Le secret ne sera plus récupérable.</p>
            <div className='fr-input-group'>
              <label className='fr-label' htmlFor='new-client-id'>clientId</label>
              <input readOnly className='fr-input font-mono' id='new-client-id' value={secret.keyId} />
            </div>
            <div className='fr-input-group fr-mb-0'>
              <label className='fr-label' htmlFor='new-client-secret'>clientSecret</label>
              <textarea readOnly className='fr-input font-mono' id='new-client-secret' rows={3} value={secret.clientSecret} />
            </div>
          </div>
        )}

        <form className='fr-card fr-card--shadow fr-p-3w' onSubmit={handleCreateCredential}>
          <h2 className='fr-h5'>Créer un identifiant</h2>
          <p className='fr-text--sm'>À utiliser avec la route technique de génération de token.</p>

          <div className='fr-input-group'>
            <label className='fr-label' htmlFor='credential-name'>Libellé</label>
            <input
              className='fr-input'
              id='credential-name'
              name='name'
              type='text'
              placeholder='Production, recette, orchestration…'
              disabled={isBusy || account.isDeleted}
            />
          </div>

          <div className='fr-input-group'>
            <label className='fr-label' htmlFor='credential-expires-at'>Expiration</label>
            <input
              className='fr-input'
              id='credential-expires-at'
              name='expiresAt'
              type='date'
              disabled={isBusy || account.isDeleted}
            />
          </div>

          <button className='fr-btn fr-btn--sm fr-btn--icon-left fr-icon-add-line' type='submit' disabled={isBusy || account.isDeleted}>
            Créer l’identifiant
          </button>
        </form>
      </div>

      <div className='fr-col-12 fr-col-lg-8'>
        <section className='fr-card fr-card--shadow fr-p-3w'>
          <div className='flex items-start justify-between gap-2 flex-wrap fr-mb-3w'>
            <div>
              <h2 className='fr-h4 fr-mb-1w'>Identifiants techniques</h2>
              <p className='fr-text--sm fr-mb-0'>Chaque identifiant possède un clientId. Le secret n’est visible qu’à la création.</p>
            </div>
            <ServiceAccountStatusBadge status={account.status} label={account.statusLabel} />
          </div>

          {credentials.length === 0 && (
            <p className='fr-text--sm'>Aucun identifiant technique.</p>
          )}

          <div className='flex flex-col gap-3'>
            {credentials.map(credential => (
              <article key={credential.id} className='fr-card fr-card--grey fr-p-3w'>
                <div className='flex items-start justify-between gap-2 flex-wrap'>
                  <div>
                    <h3 className='fr-h6 fr-mb-1w'>{credential.name || 'Identifiant sans libellé'}</h3>
                    <p className='fr-text--xs fr-mb-1w break-all'>
                      <strong>clientId :</strong> {credential.keyId}
                    </p>
                    <p className='fr-text--xs fr-mb-0'>
                      Créé le {formatDateTime(credential.createdAt)} · Dernière utilisation : {formatDateTime(credential.lastUsedAt)}
                    </p>
                  </div>
                  <ServiceAccountStatusBadge status={credential.status} label={credential.statusLabel} />
                </div>

                <div className='fr-grid-row fr-grid-row--gutters fr-mt-2w'>
                  <div className='fr-col-12 fr-col-md-6'>
                    <p className='fr-text--sm fr-mb-0'><strong>Expire le :</strong> {formatDate(credential.expiresAt)}</p>
                  </div>
                  <div className='fr-col-12 fr-col-md-6 text-right'>
                    {credential.isUsable && !account.isDeleted && (
                      <button
                        className='fr-btn fr-btn--tertiary fr-btn--sm fr-btn--icon-left fr-icon-delete-line'
                        type='button'
                        disabled={isBusy}
                        onClick={() => handleRevokeCredential(credential)}
                      >
                        Révoquer
                      </button>
                    )}
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>
      </div>
    </div>
  )
  /* eslint-enable react/jsx-no-bind */
}

export default ServiceAccountCredentials
