'use client'

import {
  useCallback, useEffect, useMemo, useRef, useState
} from 'react'

import {Alert} from '@codegouvfr/react-dsfr/Alert'
import {SegmentedControl} from '@codegouvfr/react-dsfr/SegmentedControl'
import {useRouter} from 'next/navigation'

import NewDeclarationForm from './new-declaration-form.js'
import QuickDeclarationForm from './quick-declaration-form.js'

const UnsavedQuickDeclarationModal = ({
  close,
  confirm,
  open
}) => {
  if (!open) {
    return null
  }

  return (
    <div className='fixed inset-0 z-[1000] flex items-center justify-center bg-black/40 px-4' role='presentation'>
      <div
        aria-labelledby='quick-declaration-leave-title'
        aria-modal='true'
        className='w-full max-w-lg bg-white p-6 shadow-lg'
        role='dialog'
      >
        <h2 id='quick-declaration-leave-title' className='fr-h4 fr-mb-2w'>
          Quitter la saisie rapide ?
        </h2>
        <p className='fr-text--sm fr-mb-4w'>
          Les données saisies ne seront pas conservées si vous quittez cette page ou changez de mode sans soumettre la déclaration.
        </p>
        <div className='flex flex-col gap-2 sm:flex-row sm:justify-end'>
          <button className='fr-btn fr-btn--secondary' type='button' onClick={close}>
            Continuer la saisie
          </button>
          <button className='fr-btn' type='button' onClick={confirm}>
            Quitter sans soumettre
          </button>
        </div>
      </div>
    </div>
  )
}

const NewDeclarationEntry = ({
  allowedDeclarationTypes = [],
  availablePreleveurs = [],
  declarantRole,
  quickDeclarationEnabled = true,
  canCreateQuickDeclaration = true
}) => {
  const router = useRouter()
  const quickAvailable = useMemo(() => {
    if (quickDeclarationEnabled === false || !canCreateQuickDeclaration) {
      return false
    }

    if (declarantRole !== 'COLLECTEUR') {
      return true
    }

    return availablePreleveurs.some(preleveur => preleveur.quickDeclarationEnabled !== false)
  }, [availablePreleveurs, canCreateQuickDeclaration, declarantRole, quickDeclarationEnabled])

  const fileAvailable = useMemo(() => allowedDeclarationTypes.length > 0, [allowedDeclarationTypes])

  const [mode, setMode] = useState(quickAvailable ? 'quick' : 'file')
  const [quickDeclarationDirty, setQuickDeclarationDirty] = useState(false)
  const shouldConfirmLeaveQuickDeclaration = mode === 'quick' && quickDeclarationDirty
  const skipQuickDeclarationLeaveConfirmationRef = useRef(false)
  const [pendingMode, setPendingMode] = useState(null)
  const [pendingHref, setPendingHref] = useState(null)
  const [leaveModalOpen, setLeaveModalOpen] = useState(false)

  const handleQuickDeclarationSubmitted = useCallback(() => {
    skipQuickDeclarationLeaveConfirmationRef.current = true
    setQuickDeclarationDirty(false)
  }, [])

  const changeMode = useCallback(nextMode => {
    if (nextMode === mode) {
      return
    }

    if (shouldConfirmLeaveQuickDeclaration) {
      setPendingMode(nextMode)
      setPendingHref(null)
      setLeaveModalOpen(true)
      return
    }

    setMode(nextMode)
  }, [mode, shouldConfirmLeaveQuickDeclaration])

  const closeLeaveModal = useCallback(() => {
    setPendingMode(null)
    setPendingHref(null)
    setLeaveModalOpen(false)
  }, [])

  const confirmLeaveQuickDeclaration = useCallback(() => {
    const href = pendingHref
    const nextMode = pendingMode

    setQuickDeclarationDirty(false)
    setPendingHref(null)
    setPendingMode(null)
    setLeaveModalOpen(false)

    if (href) {
      const url = new URL(href)
      router.push(`${url.pathname}${url.search}${url.hash}`)
      return
    }

    setMode(nextMode ?? 'file')
  }, [pendingHref, pendingMode, router])

  useEffect(() => {
    if (!shouldConfirmLeaveQuickDeclaration) {
      return undefined
    }

    const handleDocumentClick = event => {
      if (
        event.defaultPrevented
        || event.button !== 0
        || event.metaKey
        || event.ctrlKey
        || event.shiftKey
        || event.altKey
      ) {
        return
      }

      const anchor = event.target?.closest?.('a[href]')

      if (!anchor) {
        return
      }

      const href = anchor.getAttribute('href')

      if (
        !href
        || href.startsWith('#')
        || href.startsWith('mailto:')
        || href.startsWith('tel:')
        || (anchor.target && anchor.target !== '_self')
      ) {
        return
      }

      const url = new URL(href, window.location.href)

      if (url.origin !== window.location.origin || url.href === window.location.href) {
        return
      }

      event.preventDefault()
      setPendingMode(null)
      setPendingHref(url.href)
      setLeaveModalOpen(true)
    }

    document.addEventListener('click', handleDocumentClick, true)

    return () => {
      document.removeEventListener('click', handleDocumentClick, true)
    }
  }, [shouldConfirmLeaveQuickDeclaration])

  useEffect(() => {
    if (!shouldConfirmLeaveQuickDeclaration) {
      return undefined
    }

    const handleBeforeUnload = event => {
      if (skipQuickDeclarationLeaveConfirmationRef.current) {
        return
      }

      event.preventDefault()
      event.returnValue = ''
    }

    window.addEventListener('beforeunload', handleBeforeUnload)

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
    }
  }, [shouldConfirmLeaveQuickDeclaration])

  if (!quickAvailable && !fileAvailable) {
    return (
      <Alert
        severity='info'
        title='Aucun mode de déclaration disponible'
        description='La saisie rapide n’est pas activée pour ce déclarant et aucun type de déclaration par fichier n’est autorisé.'
      />
    )
  }

  return (
    <>
      {quickAvailable && fileAvailable && (
        <SegmentedControl
          className='fr-mb-2w'
          legend='Mode de déclaration'
          segments={[
            {
              iconId: 'fr-icon-edit-line',
              label: 'Saisie rapide',
              nativeInputProps: {
                checked: mode === 'quick',
                onChange: () => changeMode('quick')
              }
            },
            {
              iconId: 'fr-icon-upload-line',
              label: 'Dépôt de fichier',
              nativeInputProps: {
                checked: mode === 'file',
                onChange: () => changeMode('file')
              }
            }
          ]}
        />
      )}

      {mode === 'quick' && quickAvailable ? (
        <QuickDeclarationForm
          allowedDeclarationTypes={allowedDeclarationTypes}
          availablePreleveurs={availablePreleveurs}
          declarantRole={declarantRole}
          quickDeclarationEnabled={quickDeclarationEnabled}
          canCreateQuickDeclaration={canCreateQuickDeclaration}
          onDirtyChange={setQuickDeclarationDirty}
          onSubmitted={handleQuickDeclarationSubmitted}
        />
      ) : (
        <>
          {!quickAvailable && (
            <Alert
              className='fr-mb-3w'
              severity='info'
              title='Saisie rapide indisponible'
              description='La saisie rapide n’est pas activée pour ce déclarant ou aucun préleveur accessible ne peut l’utiliser.'
            />
          )}
          <NewDeclarationForm
            allowedDeclarationTypes={allowedDeclarationTypes}
          />
        </>
      )}

      <UnsavedQuickDeclarationModal
        close={closeLeaveModal}
        confirm={confirmLeaveQuickDeclaration}
        open={leaveModalOpen}
      />
    </>
  )
}

export default NewDeclarationEntry
