'use client'

import {useEffect, useState, useTransition} from 'react'

import {useRouter} from 'next/navigation'

import {editPointUsageNameAction} from '@/server/actions/points-prelevement.js'
import {
  MAX_POINT_USAGE_NAME_LENGTH,
  normalizePointUsageName
} from '@/utils/point-prelevement.js'

const PointUsageNameEditor = ({pointId, usageName: initialUsageName}) => {
  const router = useRouter()
  const [isEditing, setIsEditing] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [savedUsageName, setSavedUsageName] = useState(normalizePointUsageName(initialUsageName))
  const [draft, setDraft] = useState(savedUsageName)
  const [feedback, setFeedback] = useState(null)
  const normalizedDraft = normalizePointUsageName(draft)
  const hasChanged = normalizedDraft !== savedUsageName

  useEffect(() => {
    const nextUsageName = normalizePointUsageName(initialUsageName)
    setSavedUsageName(nextUsageName)
    setDraft(nextUsageName)
  }, [initialUsageName])

  const startEditing = () => {
    setDraft(savedUsageName)
    setFeedback(null)
    setIsEditing(true)
  }

  const cancelEditing = () => {
    setDraft(savedUsageName)
    setFeedback(null)
    setIsEditing(false)
  }

  const submit = event => {
    event.preventDefault()

    if (!hasChanged || isPending) {
      return
    }

    setFeedback(null)
    startTransition(async () => {
      const result = await editPointUsageNameAction(pointId, normalizedDraft || null)

      if (!result.success) {
        setFeedback({severity: 'error', message: result.error || 'Le nom d’usage n’a pas pu être enregistré.'})
        return
      }

      const nextUsageName = normalizePointUsageName(result.data?.usageName)
      setSavedUsageName(nextUsageName)
      setDraft(nextUsageName)
      setIsEditing(false)
      setFeedback({severity: 'success', message: 'Nom d’usage enregistré.'})
      router.refresh()
    })
  }

  if (!isEditing) {
    return (
      <div className='mt-1 flex min-h-6 flex-wrap items-center gap-x-2 gap-y-1'>
        <button
          type='button'
          className='fr-link fr-icon-edit-line fr-link--icon-left text-sm'
          onClick={startEditing}
        >
          {savedUsageName ? 'Modifier le nom d’usage' : 'Ajouter un nom d’usage'}
        </button>
        {feedback?.severity === 'success' && (
          <span className='inline-flex items-center gap-1 text-xs text-[#18753c]' role='status'>
            <span className='fr-icon-check-line text-[0.65rem]' aria-hidden='true' />
            {feedback.message}
          </span>
        )}
      </div>
    )
  }

  return (
    <form className='point-usage-name-editor mt-2' onSubmit={submit}>
      <label className='text-xs font-medium text-gray-600' htmlFor={`point-usage-name-${pointId}`}>
        Nom d’usage
      </label>
      <div className='flex min-w-0 items-center gap-1'>
        <input
          autoFocus
          id={`point-usage-name-${pointId}`}
          className='point-usage-name-edit-input'
          disabled={isPending}
          maxLength={MAX_POINT_USAGE_NAME_LENGTH}
          placeholder='Ex. Forage de la source'
          type='text'
          value={draft}
          onChange={event => setDraft(event.target.value)}
        />
        <button
          aria-label='Enregistrer le nom d’usage'
          className='fr-btn fr-btn--sm fr-btn--tertiary-no-outline fr-icon-check-line fr-btn--icon-left shrink-0'
          disabled={!hasChanged || isPending}
          title='Enregistrer'
          type='submit'
        />
        <button
          aria-label='Annuler la modification'
          className='fr-btn fr-btn--sm fr-btn--tertiary-no-outline fr-icon-close-line fr-btn--icon-left shrink-0'
          disabled={isPending}
          title='Annuler'
          type='button'
          onClick={cancelEditing}
        />
      </div>
      {feedback?.severity === 'error' && (
        <p className='fr-error-text fr-mb-0 mt-1' role='alert'>{feedback.message}</p>
      )}
    </form>
  )
}

export default PointUsageNameEditor
