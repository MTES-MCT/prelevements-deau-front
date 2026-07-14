'use client'

import {useState} from 'react'

import {useRouter} from '@bprogress/next/app'

import {
  deleteDeclarationAction,
  replayDeclarationAction
} from '@/server/actions/declarations.js'

function getActionError(result, fallback) {
  return result?.error || result?.data?.message || fallback
}

const actionConfig = {
  replay: {
    buttonLabel: 'Rejouer',
    busyLabel: 'Rejeu…',
    confirmLabel: 'Rejouer la déclaration',
    description: 'Les données issues du précédent traitement seront remplacées à la fin du retraitement.',
    icon: 'fr-icon-refresh-line',
    title: 'Rejouer par l’orchestrateur'
  },
  delete: {
    buttonLabel: 'Supprimer',
    busyLabel: 'Suppression…',
    confirmLabel: 'Supprimer définitivement',
    description: 'Les fichiers, les lignes importées et les volumes associés seront supprimés.',
    icon: 'fr-icon-delete-line',
    title: 'Supprimer la déclaration'
  }
}

const ConfirmationDialog = ({
  action,
  close,
  confirm,
  declarationLabel,
  isBusy
}) => {
  if (!action) {
    return null
  }

  const config = actionConfig[action]

  return (
    <div className='fixed inset-0 z-[1000] flex items-center justify-center bg-black/40 px-4' role='presentation'>
      <div
        aria-describedby='declaration-admin-action-description'
        aria-labelledby='declaration-admin-action-title'
        aria-modal='true'
        className='w-full max-w-lg bg-white p-6 shadow-xl'
        role='dialog'
      >
        <h2 id='declaration-admin-action-title' className='fr-h4 fr-mb-2w'>{config.title}</h2>
        <p id='declaration-admin-action-description' className='fr-text--sm'>
          Confirmer l’action sur la déclaration {declarationLabel} ? {config.description}
        </p>

        <div className='mt-4 flex flex-wrap justify-end gap-2'>
          <button
            type='button'
            className='fr-btn fr-btn--secondary'
            disabled={isBusy}
            onClick={close}
          >
            Annuler
          </button>
          <button
            type='button'
            className={`fr-btn ${action === 'delete' ? 'fr-btn--tertiary' : ''}`}
            disabled={isBusy}
            onClick={confirm}
          >
            {isBusy ? actionConfig[action].busyLabel : actionConfig[action].confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

const DeclarationAdminActions = ({
  canDelete = true,
  canReplay = false,
  declarationCode,
  declarationId,
  onSuccess,
  redirectOnDelete = true,
  sourceId
}) => {
  const router = useRouter()
  const [busyAction, setBusyAction] = useState(null)
  const [pendingAction, setPendingAction] = useState(null)
  const [message, setMessage] = useState(null)
  const isBusy = Boolean(busyAction)
  const declarationLabel = declarationCode ? `n°${declarationCode}` : 'sélectionnée'

  const closeDialog = () => {
    if (!isBusy) {
      setPendingAction(null)
    }
  }

  const confirmAction = async () => {
    if (!pendingAction || isBusy) {
      return
    }

    setBusyAction(pendingAction)
    setMessage(null)

    try {
      const result = pendingAction === 'replay'
        ? await replayDeclarationAction({declarationId, sourceId})
        : await deleteDeclarationAction({declarationId, sourceId})

      if (!result.success) {
        setMessage({
          type: 'error',
          text: getActionError(
            result,
            pendingAction === 'replay'
              ? 'La déclaration n’a pas pu être rejouée.'
              : 'La déclaration n’a pas pu être supprimée.'
          )
        })
        return
      }

      if (pendingAction === 'delete') {
        setPendingAction(null)
        onSuccess?.({
          action: pendingAction,
          result
        })

        if (redirectOnDelete) {
          router.push('/declarations')
        }

        router.refresh({showProgress: false})
        return
      }

      setMessage({
        type: 'success',
        text: 'Retraitement demandé à l’orchestrateur.'
      })
      setPendingAction(null)
      onSuccess?.({
        action: pendingAction,
        result
      })
      router.refresh({showProgress: false})
    } finally {
      setBusyAction(null)
    }
  }

  return (
    <>
      <div className='flex max-w-xs flex-col items-end gap-2'>
        <div className='flex flex-wrap justify-end gap-2'>
          {Object.entries(actionConfig)
            .filter(([action]) => action !== 'replay' || canReplay)
            .filter(([action]) => action !== 'delete' || canDelete)
            .map(([action, config]) => (
              <button
                key={action}
                type='button'
                className={`fr-btn fr-btn--sm fr-btn--icon-left ${config.icon} ${action === 'delete' ? 'fr-btn--tertiary' : 'fr-btn--secondary'}`}
                disabled={isBusy}
                onClick={() => setPendingAction(action)}
              >
                {busyAction === action ? config.busyLabel : config.buttonLabel}
              </button>
            ))}
        </div>

        {message && (
          <p className={`fr-text--xs fr-mb-0 text-right ${message.type === 'error' ? 'text-[#ce0500]' : 'text-[#18753c]'}`}>
            {message.text}
          </p>
        )}
      </div>

      <ConfirmationDialog
        action={pendingAction}
        close={closeDialog}
        confirm={confirmAction}
        declarationLabel={declarationLabel}
        isBusy={isBusy}
      />
    </>
  )
}

export default DeclarationAdminActions
