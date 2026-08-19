'use client'

import {useEffect, useRef, useState} from 'react'

import {copyTextToClipboard} from '@/lib/clipboard.js'

const FEEDBACK_DURATION_MS = 2000

function getLiveMessage(status) {
  if (status === 'copied') {
    return 'Adresse e-mail copiée.'
  }

  if (status === 'error') {
    return 'La copie de l’adresse e-mail a échoué.'
  }

  return ''
}

export const CopyEmailButton = ({className = '', email, revealOnHover = false}) => {
  const normalizedEmail = String(email ?? '').trim()
  const [status, setStatus] = useState('idle')
  const resetTimer = useRef(null)

  useEffect(() => () => {
    globalThis.clearTimeout(resetTimer.current)
  }, [])

  if (!normalizedEmail) {
    return null
  }

  const liveMessage = getLiveMessage(status)
  const visibilityClassName = revealOnHover
    ? 'pointer-events-none opacity-0 group-hover:pointer-events-auto group-hover:opacity-100 group-focus-within:pointer-events-auto group-focus-within:opacity-100 [@media(hover:none)]:pointer-events-auto [@media(hover:none)]:opacity-100'
    : ''
  const handleCopy = async event => {
    event.preventDefault()
    event.stopPropagation()
    globalThis.clearTimeout(resetTimer.current)

    const copied = await copyTextToClipboard(normalizedEmail)
    setStatus(copied ? 'copied' : 'error')
    resetTimer.current = globalThis.setTimeout(() => {
      setStatus('idle')
    }, FEEDBACK_DURATION_MS)
  }

  return (
    <span className={`inline-flex shrink-0 items-center transition-opacity ${visibilityClassName} ${className}`}>
      <button
        aria-label={`Copier l’adresse e-mail ${normalizedEmail}`}
        className={`fr-btn fr-btn--sm fr-btn--tertiary-no-outline !h-6 !min-h-6 !w-6 !min-w-6 !p-1 opacity-70 transition-opacity hover:opacity-100 focus-visible:opacity-100 ${status === 'copied' ? 'fr-icon-check-line' : 'ri-file-copy-line'}`}
        style={{color: status === 'copied' ? 'var(--text-default-success)' : 'var(--text-mention-grey)'}}
        type='button'
        onClick={handleCopy}
      />
      <span aria-live='polite' className='sr-only' role='status'>
        {liveMessage}
      </span>
    </span>
  )
}

const CopyableEmail = ({className = '', email, textClassName = ''}) => {
  const normalizedEmail = String(email ?? '').trim()

  if (!normalizedEmail) {
    return null
  }

  return (
    <span className={`group inline-flex min-w-0 items-center gap-0.5 ${className}`}>
      <span className={`min-w-0 truncate ${textClassName}`}>
        {normalizedEmail}
      </span>
      <CopyEmailButton revealOnHover email={normalizedEmail} />
    </span>
  )
}

export default CopyableEmail
