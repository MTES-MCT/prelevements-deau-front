'use client'

import {useEffect, useState} from 'react'

import DeclarationAdminActions from '@/components/declarations/declaration-admin-actions.js'
import DeclarationSummaryItem from '@/components/declarations/declaration-summary-item.js'
import {useAuth} from '@/contexts/auth-context.js'
import {getReplayableDeclarationsAction} from '@/server/actions/declarations.js'

function buildMissingSource(declaration) {
  return {
    id: `missing-source-${declaration.id}`,
    type: 'DECLARATION',
    status: declaration.processingStatus === 'COMPLETED'
      ? 'FAILED'
      : declaration.processingStatus,
    globalInstructionStatus: 'TO_INSTRUCT',
    metadata: {
      missingSource: true
    },
    chunks: [],
    _count: {
      chunks: 0
    },
    createdAt: declaration.createdAt,
    declaration
  }
}

const ReplayableDeclarationsPanel = () => {
  const {user} = useAuth()
  const [items, setItems] = useState([])
  const [isLoaded, setIsLoaded] = useState(false)

  useEffect(() => {
    if (user?.role !== 'ADMIN') {
      setIsLoaded(true)
      return undefined
    }

    let cancelled = false

    async function fetchReplayableDeclarations() {
      const result = await getReplayableDeclarationsAction()

      if (!cancelled && result.success) {
        setItems(Array.isArray(result.data?.data) ? result.data.data : [])
      }

      if (!cancelled) {
        setIsLoaded(true)
      }
    }

    fetchReplayableDeclarations()

    return () => {
      cancelled = true
    }
  }, [user?.role])

  if (user?.role !== 'ADMIN' || !isLoaded || items.length === 0) {
    return null
  }

  const removeItem = declarationId => {
    setItems(previousItems => previousItems.filter(item => item.id !== declarationId))
  }

  return (
    <section className='fr-mb-4w'>
      <div className='fr-mb-2w flex flex-col gap-1'>
        <h2 className='fr-h6 fr-mb-0'>Déclarations à rejouer</h2>
        <p className='fr-text--sm fr-mb-0 text-gray-600'>
          Ces dépôts ont des fichiers mais aucune source exploitable associée après traitement.
        </p>
      </div>

      <div className='divide-y divide-gray-200 border border-gray-300 bg-white'>
        {items.map(declaration => (
          <DeclarationSummaryItem
            key={declaration.id}
            actionLabel={null}
            actions={(
              <DeclarationAdminActions
                canReplay
                canDelete={false}
                declarationCode={declaration.code}
                declarationId={declaration.id}
                onSuccess={() => removeItem(declaration.id)}
              />
            )}
            declaration={declaration}
            source={buildMissingSource(declaration)}
          />
        ))}
      </div>
    </section>
  )
}

export default ReplayableDeclarationsPanel
