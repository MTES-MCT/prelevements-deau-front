'use client'

import {useState} from 'react'

import {useRouter} from 'next/navigation'

import ServiceAccountStatusBadge from '@/components/service-accounts/service-account-status-badge.js'
import {
  formatDateTime,
  getActionData,
  pluralize
} from '@/components/service-accounts/service-account-utils.js'
import {
  deleteServiceAccountAction,
  restoreServiceAccountAction,
  updateServiceAccountAction
} from '@/server/actions/service-accounts.js'

const ServiceAccountOverview = ({serviceAccount}) => {
  const router = useRouter()
  const [account, setAccount] = useState(serviceAccount)
  const [isBusy, setIsBusy] = useState(false)
  const [message, setMessage] = useState(null)
  const [copyMessage, setCopyMessage] = useState(null)

  async function runAction(action, successMessage) {
    setIsBusy(true)
    setMessage(null)

    try {
      const data = getActionData(await action())
      setAccount(data)
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

  async function handleSubmit(event) {
    event.preventDefault()
    const formData = new FormData(event.currentTarget)

    await runAction(async () => updateServiceAccountAction(account.id, {
      name: formData.get('name'),
      description: formData.get('description') || null
    }), 'Compte de service mis à jour.')
  }

  async function handleToggle() {
    const nextActive = !account.isActive
    const confirmed = window.confirm(
      nextActive
        ? `Réactiver le compte de service « ${account.name} » ?`
        : `Désactiver le compte de service « ${account.name} » ? Les tokens actifs seront révoqués.`
    )

    if (!confirmed) {
      return
    }

    await runAction(async () => updateServiceAccountAction(account.id, {
      isActive: nextActive
    }), nextActive ? 'Compte de service réactivé.' : 'Compte de service désactivé et tokens actifs révoqués.')
  }

  async function handleDelete() {
    const confirmed = window.confirm(
      `Supprimer le compte de service « ${account.name} » ?\n\nLe compte sera marqué supprimé, désactivé, et ses identifiants/tokens actifs seront révoqués.`
    )

    if (!confirmed) {
      return
    }

    await runAction(async () => deleteServiceAccountAction(account.id), 'Compte de service supprimé.')
  }

  async function handleRestore() {
    const confirmed = window.confirm(
      `Restaurer le compte de service « ${account.name} » ?\n\nLes anciens secrets révoqués ne seront pas restaurés.`
    )

    if (!confirmed) {
      return
    }

    await runAction(async () => restoreServiceAccountAction(account.id), 'Compte de service restauré.')
  }

  async function copyId() {
    try {
      await navigator.clipboard.writeText(account.id)
      setCopyMessage('Identifiant copié.')
    } catch {
      setCopyMessage('Copie impossible automatiquement.')
    }
  }

  return (
    <div className='fr-grid-row fr-grid-row--gutters'>
      <div className='fr-col-12 fr-col-lg-8'>
        {message && (
          <div className={`fr-alert fr-alert--${message.type === 'error' ? 'error' : 'success'} fr-mb-3w`}>
            <p>{message.text}</p>
          </div>
        )}

        <form className='fr-card fr-card--shadow fr-p-4w' onSubmit={handleSubmit}>
          <div className='flex items-start justify-between gap-2 flex-wrap fr-mb-3w'>
            <div>
              <h2 className='fr-h4 fr-mb-1w'>Informations générales</h2>
              <p className='fr-text--sm fr-mb-0'>Nom, description et état opérationnel du compte.</p>
            </div>
            <ServiceAccountStatusBadge status={account.status} label={account.statusLabel} />
          </div>

          <div className='fr-input-group'>
            <label className='fr-label' htmlFor='service-account-id'>Identifiant du compte de service</label>
            <div className='flex gap-2 items-start'>
              <input
                readOnly
                className='fr-input font-mono'
                id='service-account-id'
                value={account.id}
              />
              <button className='fr-btn fr-btn--secondary fr-btn--sm' type='button' onClick={copyId}>
                Copier
              </button>
            </div>
            {copyMessage && <p className='fr-hint-text'>{copyMessage}</p>}
          </div>

          <div className='fr-input-group'>
            <label className='fr-label' htmlFor='service-account-name'>Nom</label>
            <input
              required
              className='fr-input'
              id='service-account-name'
              name='name'
              type='text'
              defaultValue={account.name}
              disabled={isBusy || account.isDeleted}
            />
          </div>

          <div className='fr-input-group'>
            <label className='fr-label' htmlFor='service-account-description'>Description</label>
            <textarea
              className='fr-input'
              id='service-account-description'
              name='description'
              rows={5}
              defaultValue={account.description || ''}
              disabled={isBusy || account.isDeleted}
            />
          </div>

          <div className='flex gap-2 flex-wrap'>
            {!account.isDeleted && (
              <button className='fr-btn' type='submit' disabled={isBusy}>
                Enregistrer
              </button>
            )}
            {!account.isDeleted && (
              <button className='fr-btn fr-btn--secondary' type='button' disabled={isBusy} onClick={handleToggle}>
                {account.isActive ? 'Désactiver' : 'Réactiver'}
              </button>
            )}
            {!account.isDeleted && (
              <button className='fr-btn fr-btn--tertiary fr-btn--icon-left fr-icon-delete-line' type='button' disabled={isBusy} onClick={handleDelete}>
                Supprimer
              </button>
            )}
            {account.isDeleted && (
              <button className='fr-btn' type='button' disabled={isBusy} onClick={handleRestore}>
                Restaurer
              </button>
            )}
          </div>
        </form>
      </div>

      <div className='fr-col-12 fr-col-lg-4'>
        <div className='fr-grid-row fr-grid-row--gutters'>
          <div className='fr-col-12 fr-col-sm-6 fr-col-lg-12'>
            <div className='fr-card fr-card--shadow fr-p-3w h-full'>
              <p className='fr-text--xs fr-mb-1w'>Déclarants actifs</p>
              <p className='fr-display--xs fr-mb-1w'>{account.counts?.activeDeclarants || 0}</p>
              <p className='fr-text--sm fr-mb-0'>{pluralize(account.counts?.declarants || 0, 'rattachement total')}</p>
            </div>
          </div>
          <div className='fr-col-12 fr-col-sm-6 fr-col-lg-12'>
            <div className='fr-card fr-card--shadow fr-p-3w h-full'>
              <p className='fr-text--xs fr-mb-1w'>Identifiants actifs</p>
              <p className='fr-display--xs fr-mb-1w'>{account.counts?.usableCredentials || 0}</p>
              <p className='fr-text--sm fr-mb-0'>{pluralize(account.counts?.credentials || 0, 'identifiant total')}</p>
            </div>
          </div>
          <div className='fr-col-12'>
            <div className='fr-card fr-card--shadow fr-p-3w h-full'>
              <h3 className='fr-h6 fr-mb-2w'>Traçabilité</h3>
              <p className='fr-text--sm fr-mb-1w'><strong>Créé :</strong> {formatDateTime(account.createdAt)}</p>
              <p className='fr-text--sm fr-mb-1w'><strong>Modifié :</strong> {formatDateTime(account.updatedAt)}</p>
              {account.deletedAt && (
                <p className='fr-text--sm fr-mb-0'><strong>Supprimé :</strong> {formatDateTime(account.deletedAt)}</p>
              )}
              {account.sourceId && (
                <p className='fr-text--sm fr-mt-2w fr-mb-0 break-all'><strong>Source :</strong> {account.sourceId}</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ServiceAccountOverview
