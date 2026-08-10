'use client'

import {useState} from 'react'

import Alert from '@codegouvfr/react-dsfr/Alert'

import MutationList from '@/components/audit/mutation-list.js'
import {getResourceAuditHistoryAction} from '@/server/actions/audit-events.js'

const DATE_FORMATTER = new Intl.DateTimeFormat('fr-FR', {
  dateStyle: 'medium',
  timeStyle: 'short',
  timeZone: 'Europe/Paris'
})

const ResourceMutationHistory = ({initialData, resourceId, resourceType}) => {
  const [data, setData] = useState(initialData)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)
  const items = data?.items ?? []
  const pagination = data?.pagination

  const loadMore = async () => {
    setIsLoading(true)
    setError(null)

    const result = await getResourceAuditHistoryAction(resourceType, resourceId, {
      page: (pagination?.page ?? 1) + 1,
      pageSize: pagination?.pageSize ?? 10
    })

    if (!result.success) {
      setError(result.error || 'Impossible de charger la suite de l’historique.')
      setIsLoading(false)
      return
    }

    setData(current => ({
      ...result.data?.data,
      items: [...(current?.items ?? []), ...(result.data?.data?.items ?? [])]
    }))
    setIsLoading(false)
  }

  return (
    <section className='border border-[var(--border-default-grey)] bg-white' aria-labelledby={`history-${resourceType}-${resourceId}`}>
      <header className='border-b border-[var(--border-default-grey)] px-4 py-3'>
        <h2 className='fr-h5 fr-mb-0' id={`history-${resourceType}-${resourceId}`}>Historique des modifications</h2>
      </header>

      {error && <Alert className='m-4' severity='error' title='Historique indisponible' description={error} />}

      {items.length === 0 ? (
        <p className='fr-text--sm fr-mb-0 px-4 py-8 text-center text-[var(--text-mention-grey)]'>
          Aucune modification historisée pour cette ressource.
        </p>
      ) : (
        <ol className='fr-raw-list divide-y divide-[var(--border-default-grey)]'>
          {items.map(item => (
            <li key={item.id} className='px-4 py-4'>
              <div className='mb-3 flex flex-wrap items-start justify-between gap-2'>
                <div>
                  <p className='fr-text--sm fr-mb-0 font-semibold'>{item.actionLabel}</p>
                  <p className='fr-text--xs fr-mb-0 text-[var(--text-mention-grey)]'>
                    Par {item.actorLabel || item.actorEmail || 'un compte non identifié'}
                    {item.effectiveUserLabel && item.effectiveUserId !== item.actorUserId
                      ? ` pour ${item.effectiveUserLabel}`
                      : ''}
                  </p>
                </div>
                <time className='text-xs text-[var(--text-mention-grey)]' dateTime={item.occurredAt}>
                  {DATE_FORMATTER.format(new Date(item.occurredAt))}
                </time>
              </div>
              <MutationList mutations={[item]} />
            </li>
          ))}
        </ol>
      )}

      {pagination?.page < pagination?.totalPages && (
        <div className='border-t border-[var(--border-default-grey)] px-4 py-3 text-center'>
          <button className='fr-btn fr-btn--secondary fr-btn--sm' disabled={isLoading} type='button' onClick={loadMore}>
            {isLoading ? 'Chargement…' : 'Afficher les modifications précédentes'}
          </button>
        </div>
      )}
    </section>
  )
}

export default ResourceMutationHistory
