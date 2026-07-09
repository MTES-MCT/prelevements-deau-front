'use client'

import {useEffect, useState} from 'react'

import {fr} from '@codegouvfr/react-dsfr'
import {Alert} from '@codegouvfr/react-dsfr/Alert'
import Link from 'next/link'

import DeclarationAdminActions from '@/components/declarations/declaration-admin-actions.js'
import DeclarationSummaryItem from '@/components/declarations/declaration-summary-item.js'
import {useAuth} from '@/contexts/auth-context.js'
import {getDeclarationTypeLabel} from '@/lib/declaration-types.js'
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

function formatReplayableCount(count) {
  return `${count} déclaration${count > 1 ? 's' : ''} en erreur à rejouer`
}

const ReplayableDeclarationsSummary = ({count}) => (
  <section
    className='fr-mb-4w border border-orange-200 border-l-4 bg-white px-4 py-3'
    role='status'
  >
    <div className='flex flex-col gap-3 md:flex-row md:items-center md:justify-between'>
      <div className='flex min-w-0 gap-3'>
        <span
          aria-hidden='true'
          className='fr-icon-warning-fill mt-1 shrink-0'
          style={{color: fr.colors.decisions.text.default.warning.default}}
        />
        <div className='min-w-0'>
          <p className='fr-text--md fr-mb-0 font-semibold text-gray-900'>
            {formatReplayableCount(count)}
          </p>
          <p className='fr-text--sm fr-mb-0 text-gray-600'>
            Ces déclarations doivent être vérifiées et relancées depuis la liste dédiée.
          </p>
        </div>
      </div>

      <Link className='fr-btn fr-btn--secondary fr-btn--sm shrink-0' href='/declarations/a-rejouer'>
        Ouvrir la liste
      </Link>
    </div>
  </section>
)

function getFileLabel(file, declarationType) {
  return file.filename || getDeclarationTypeLabel(file.type, declarationType)
}

const ReplayableDeclarationDownloads = ({declaration}) => {
  const files = (declaration.files ?? []).filter(file => file.url)

  if (files.length === 0) {
    return null
  }

  if (files.length === 1) {
    return (
      <Link
        download
        className='fr-btn fr-btn--secondary fr-btn--sm fr-btn--icon-left fr-icon-download-line'
        href={files[0].url}
      >
        Télécharger
      </Link>
    )
  }

  return (
    <div className='flex max-w-full flex-col items-end gap-1 text-right'>
      <span className='fr-text--xs fr-mb-0 text-gray-600'>Fichiers déposés</span>
      {files.map(file => (
        <Link
          key={file.id}
          download
          className='fr-link max-w-full truncate text-sm'
          href={file.url}
          title={getFileLabel(file, declaration.declarationType)}
        >
          {getFileLabel(file, declaration.declarationType)}
        </Link>
      ))}
    </div>
  )
}

const ReplayableDeclarationActions = ({
  declaration,
  onSuccess
}) => (
  <div className='flex max-w-xs flex-col items-end gap-2'>
    <ReplayableDeclarationDownloads declaration={declaration} />
    <DeclarationAdminActions
      canReplay
      declarationCode={declaration.code}
      declarationId={declaration.id}
      redirectOnDelete={false}
      onSuccess={onSuccess}
    />
  </div>
)

const ReplayableDeclarationsPanel = ({mode = 'list'}) => {
  const {user, isLoading} = useAuth()
  const [items, setItems] = useState([])
  const [isLoaded, setIsLoaded] = useState(false)
  const [fetchError, setFetchError] = useState(null)

  useEffect(() => {
    if (isLoading) {
      return undefined
    }

    if (user?.role !== 'ADMIN') {
      setItems([])
      setFetchError(null)
      setIsLoaded(true)
      return undefined
    }

    let cancelled = false
    setIsLoaded(false)
    setFetchError(null)

    async function fetchReplayableDeclarations() {
      const result = await getReplayableDeclarationsAction()

      if (!cancelled && result.success) {
        setItems(Array.isArray(result.data?.data) ? result.data.data : [])
      }

      if (!cancelled && !result.success) {
        setItems([])
        setFetchError(result.error || 'Impossible de récupérer les déclarations à rejouer.')
      }

      if (!cancelled) {
        setIsLoaded(true)
      }
    }

    fetchReplayableDeclarations()

    return () => {
      cancelled = true
    }
  }, [isLoading, user?.role])

  if (isLoading || !isLoaded) {
    return null
  }

  if (user?.role !== 'ADMIN') {
    if (mode === 'list') {
      return (
        <Alert
          severity='error'
          title='Accès réservé aux administrateurs'
          description='Cette vue est réservée aux administrateurs.'
        />
      )
    }

    return null
  }

  if (fetchError) {
    if (mode === 'list') {
      return (
        <Alert
          severity='error'
          title='Déclarations à rejouer indisponibles'
          description={fetchError}
        />
      )
    }

    return null
  }

  if (items.length === 0) {
    if (mode === 'list') {
      return (
        <Alert
          severity='success'
          title='Aucune déclaration à rejouer'
          description='Toutes les déclarations traitées disposent d’une source exploitable.'
        />
      )
    }

    return null
  }

  if (mode === 'summary') {
    return <ReplayableDeclarationsSummary count={items.length} />
  }

  const removeItem = declarationId => {
    setItems(previousItems => previousItems.filter(item => item.id !== declarationId))
  }

  return (
    <section className='fr-mb-4w'>
      <div className='divide-y divide-gray-200 border border-gray-300 bg-white'>
        {items.map(declaration => (
          <DeclarationSummaryItem
            key={declaration.id}
            actionLabel={null}
            actions={(
              <ReplayableDeclarationActions
                declaration={declaration}
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
