'use client'

import {useState} from 'react'

import {useRouter} from 'next/navigation'

import {getActionData} from '@/components/service-accounts/service-account-utils.js'
import {createServiceAccountAction} from '@/server/actions/service-accounts.js'

const ServiceAccountCreateForm = () => {
  const router = useRouter()
  const [isBusy, setIsBusy] = useState(false)
  const [message, setMessage] = useState(null)

  async function handleSubmit(event) {
    event.preventDefault()
    setIsBusy(true)
    setMessage(null)

    const formData = new FormData(event.currentTarget)

    try {
      const serviceAccount = getActionData(await createServiceAccountAction({
        name: formData.get('name'),
        description: formData.get('description') || null,
        isActive: formData.get('isActive') === 'on'
      }))

      router.push(`/comptes-service/${serviceAccount.id}`)
      router.refresh()
    } catch (error) {
      setMessage({type: 'error', text: error.message})
    } finally {
      setIsBusy(false)
    }
  }

  /* eslint-disable react/jsx-no-bind */
  return (
    <div className='fr-grid-row fr-grid-row--center'>
      <div className='fr-col-12 fr-col-lg-8'>
        {message && (
          <div className='fr-alert fr-alert--error fr-mb-3w'>
            <p>{message.text}</p>
          </div>
        )}

        <form className='fr-card fr-card--shadow fr-p-4w' onSubmit={handleSubmit}>
          <h1 className='fr-h3 fr-mb-1w'>Créer un compte de service</h1>
          <p className='fr-text--sm fr-mb-4w'>
            Un compte de service représente une application externe. Les identifiants techniques seront créés ensuite,
            dans l’onglet dédié du compte.
          </p>

          <div className='fr-input-group'>
            <label className='fr-label' htmlFor='service-account-name'>
              Nom du compte{' '}
              <span className='fr-hint-text'>Exemple : Orchestration prélèvements automatisés</span>
            </label>
            <input
              required
              className='fr-input'
              id='service-account-name'
              name='name'
              type='text'
              disabled={isBusy}
            />
          </div>

          <div className='fr-input-group'>
            <label className='fr-label' htmlFor='service-account-description'>Description</label>
            <textarea
              className='fr-input'
              id='service-account-description'
              name='description'
              rows={4}
              disabled={isBusy}
            />
          </div>

          <div className='fr-checkbox-group fr-mb-4w'>
            <input
              defaultChecked
              id='service-account-active'
              name='isActive'
              type='checkbox'
              disabled={isBusy}
            />
            <label className='fr-label' htmlFor='service-account-active'>Créer le compte actif</label>
          </div>

          <div className='flex gap-2 flex-wrap'>
            <button className='fr-btn fr-btn--icon-left fr-icon-add-line' type='submit' disabled={isBusy}>
              Créer le compte
            </button>
            <button
              className='fr-btn fr-btn--secondary'
              type='button'
              disabled={isBusy}
              onClick={() => router.push('/comptes-service')}
            >
              Annuler
            </button>
          </div>
        </form>
      </div>
    </div>
  )
  /* eslint-enable react/jsx-no-bind */
}

export default ServiceAccountCreateForm
