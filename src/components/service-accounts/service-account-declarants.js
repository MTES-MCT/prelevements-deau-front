'use client'

import {useMemo, useState} from 'react'

import Link from 'next/link'
import {useRouter} from 'next/navigation'

import ServiceAccountStatusBadge from '@/components/service-accounts/service-account-status-badge.js'
import {
  formatDate,
  getActionData,
  toDateInputValue,
  todayInputValue
} from '@/components/service-accounts/service-account-utils.js'
import {
  addServiceAccountDeclarantAction,
  removeServiceAccountDeclarantAction,
  updateServiceAccountDeclarantAction
} from '@/server/actions/service-accounts.js'

function getDeclarantSubtitle(declarant) {
  const values = [declarant?.email, declarant?.siret, declarant?.city].filter(Boolean)
  return values.length > 0 ? values.join(' · ') : 'Informations non renseignées'
}

const ServiceAccountDeclarants = ({serviceAccount, declarants = []}) => {
  const router = useRouter()
  const [account, setAccount] = useState(serviceAccount)
  const [isBusy, setIsBusy] = useState(false)
  const [message, setMessage] = useState(null)
  const links = useMemo(() => account.declarants || [], [account.declarants])

  const alreadyLinkedDeclarantIds = useMemo(
    () => new Set(links.filter(link => link.isActive || link.isFuture).map(link => link.declarantUserId)),
    [links]
  )

  const declarantOptions = useMemo(
    () => declarants.filter(declarant => !alreadyLinkedDeclarantIds.has(declarant.id)),
    [alreadyLinkedDeclarantIds, declarants]
  )

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

  async function handleAddDeclarant(event) {
    event.preventDefault()
    const formData = new FormData(event.currentTarget)
    const declarantUserId = formData.get('declarantUserId')

    if (!declarantUserId) {
      setMessage({type: 'error', text: 'Sélectionnez un déclarant.'})
      return
    }

    const data = await runAction(async () => addServiceAccountDeclarantAction(account.id, {
      declarantUserId,
      startDate: formData.get('startDate') || null,
      endDate: formData.get('endDate') || null
    }), 'Déclarant rattaché au compte de service.')

    if (data) {
      event.currentTarget.reset()
    }
  }

  async function handleUpdateDeclarantLink(event, link) {
    event.preventDefault()
    const formData = new FormData(event.currentTarget)

    await runAction(async () => updateServiceAccountDeclarantAction(account.id, link.id, {
      startDate: formData.get('startDate') || null,
      endDate: formData.get('endDate') || null
    }), 'Rattachement mis à jour.')
  }

  async function handleRemoveDeclarantLink(link) {
    const label = link.declarant?.label || link.declarantUserId
    // eslint-disable-next-line no-alert
    const confirmed = window.confirm(
      `Retirer le rattachement avec « ${label} » ?\n\nLes tokens d’impersonation actifs associés seront révoqués.`
    )

    if (!confirmed) {
      return
    }

    await runAction(async () => removeServiceAccountDeclarantAction(account.id, link.id), 'Rattachement supprimé et tokens d’impersonation actifs révoqués.')
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

        <form className='fr-card fr-card--shadow fr-p-3w' onSubmit={handleAddDeclarant}>
          <h2 className='fr-h5'>Rattacher un déclarant</h2>
          <p className='fr-text--sm'>Le compte de service pourra agir pour ce déclarant sur la période active.</p>

          <div className='fr-select-group'>
            <label className='fr-label' htmlFor='declarant-user-id'>Déclarant</label>
            <select
              required
              className='fr-select'
              id='declarant-user-id'
              name='declarantUserId'
              disabled={isBusy || account.isDeleted}
              defaultValue=''
            >
              <option disabled value=''>Sélectionner un déclarant</option>
              {declarantOptions.map(declarant => (
                <option key={declarant.id} value={declarant.id}>
                  {declarant.label} — {declarant.email}
                </option>
              ))}
            </select>
          </div>

          <div className='fr-grid-row fr-grid-row--gutters'>
            <div className='fr-col-12 fr-col-md-6'>
              <div className='fr-input-group'>
                <label className='fr-label' htmlFor='declarant-start-date'>Début</label>
                <input
                  className='fr-input'
                  id='declarant-start-date'
                  name='startDate'
                  type='date'
                  defaultValue={todayInputValue()}
                  disabled={isBusy || account.isDeleted}
                />
              </div>
            </div>
            <div className='fr-col-12 fr-col-md-6'>
              <div className='fr-input-group'>
                <label className='fr-label' htmlFor='declarant-end-date'>Fin</label>
                <input
                  className='fr-input'
                  id='declarant-end-date'
                  name='endDate'
                  type='date'
                  disabled={isBusy || account.isDeleted}
                />
              </div>
            </div>
          </div>

          <button className='fr-btn fr-btn--sm fr-btn--icon-left fr-icon-add-line' type='submit' disabled={isBusy || account.isDeleted}>
            Ajouter
          </button>
        </form>
      </div>

      <div className='fr-col-12 fr-col-lg-8'>
        <section className='fr-card fr-card--shadow fr-p-3w'>
          <div className='flex items-start justify-between gap-2 flex-wrap fr-mb-3w'>
            <div>
              <h2 className='fr-h4 fr-mb-1w'>Déclarants rattachés</h2>
              <p className='fr-text--sm fr-mb-0'>Chaque rattachement définit qui le compte de service peut représenter.</p>
            </div>
            <ServiceAccountStatusBadge status={account.status} label={account.statusLabel} />
          </div>

          {links.length === 0 && (
            <p className='fr-text--sm'>Aucun déclarant rattaché.</p>
          )}

          <div className='flex flex-col gap-3'>
            {links.map(link => (
              <form
                key={`${link.id}-${link.updatedAt}`}
                className='fr-card fr-card--grey fr-p-3w'
                onSubmit={event => handleUpdateDeclarantLink(event, link)}
              >
                <div className='fr-grid-row fr-grid-row--gutters'>
                  <div className='fr-col-12 fr-col-lg-5'>
                    <div className='flex items-start justify-between gap-2 fr-mb-1w'>
                      <h3 className='fr-h6 fr-mb-0'>{link.declarant?.label || link.declarantUserId}</h3>
                      <ServiceAccountStatusBadge status={link.status} label={link.statusLabel} />
                    </div>
                    <p className='fr-text--xs fr-mb-2w'>{getDeclarantSubtitle(link.declarant)}</p>
                    <Link className='fr-link fr-link--sm' href={`/declarants/${link.declarantUserId}`}>
                      Voir la fiche déclarant
                    </Link>
                  </div>

                  <div className='fr-col-12 fr-col-lg-4'>
                    <div className='fr-grid-row fr-grid-row--gutters'>
                      <div className='fr-col-12'>
                        <label className='fr-label' htmlFor={`link-start-${link.id}`}>
                          Début{' '}
                          <span className='fr-hint-text'>Actuellement : {formatDate(link.startDate)}</span>
                        </label>
                        <input
                          className='fr-input'
                          id={`link-start-${link.id}`}
                          name='startDate'
                          type='date'
                          defaultValue={toDateInputValue(link.startDate)}
                          disabled={isBusy || account.isDeleted}
                        />
                      </div>
                      <div className='fr-col-12'>
                        <label className='fr-label' htmlFor={`link-end-${link.id}`}>
                          Fin{' '}
                          <span className='fr-hint-text'>Actuellement : {formatDate(link.endDate)}</span>
                        </label>
                        <input
                          className='fr-input'
                          id={`link-end-${link.id}`}
                          name='endDate'
                          type='date'
                          defaultValue={toDateInputValue(link.endDate)}
                          disabled={isBusy || account.isDeleted}
                        />
                      </div>
                    </div>
                  </div>

                  <div className='fr-col-12 fr-col-lg-3 flex items-end justify-end gap-2 flex-wrap'>
                    <button className='fr-btn fr-btn--secondary fr-btn--sm' type='submit' disabled={isBusy || account.isDeleted}>
                      Enregistrer
                    </button>
                    <button
                      className='fr-btn fr-btn--tertiary fr-btn--sm fr-btn--icon-left fr-icon-delete-line'
                      type='button'
                      disabled={isBusy || account.isDeleted}
                      onClick={() => handleRemoveDeclarantLink(link)}
                    >
                      Retirer
                    </button>
                  </div>
                </div>
              </form>
            ))}
          </div>
        </section>
      </div>
    </div>
  )
  /* eslint-enable react/jsx-no-bind */
}

export default ServiceAccountDeclarants
