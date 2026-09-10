'use client'

import {useId} from 'react'

import Link from 'next/link'

export const CampaignShell = ({title, description, header, children, backHref = '/campagnes', backLabel = 'Retour'}) => (
  <div className='min-h-screen bg-[#f7f7fb] pb-12'>
    <div className={`fr-container ${header ? 'pt-8 md:pt-10' : 'pt-6 md:pt-8'}`}>
      <Link className='fr-link fr-icon-arrow-left-line fr-link--icon-left' href={backHref}>{backLabel}</Link>
      {header ?? <>
        <h1 className='fr-h3 fr-mt-3w fr-mb-1w'>{title}</h1>
        {description && <p className='fr-text--sm text-gray-700'>{description}</p>}
      </>}
      {children}
    </div>
  </div>
)

export const CampaignNotice = ({children, error = false}) => {
  if (!children) {
    return null
  }

  return <div role={error ? 'alert' : 'status'} className={`fr-alert fr-alert--${error ? 'error' : 'info'} fr-mb-2w`}><p>{children}</p></div>
}

export const CampaignField = ({label, hint, error, value, onChange, type = 'text', required = false, disabled = false, options, multiline = false, compact = false, ...props}) => {
  const id = useId()
  const nativeProps = {
    id, value: value ?? '', required, disabled, onChange: event => onChange(event.target.value),
    'aria-invalid': error ? true : undefined,
    'aria-describedby': [hint && `${id}-hint`, error && `${id}-error`].filter(Boolean).join(' ') || undefined, ...props
  }
  return (
    <div className={`fr-input-group fr-mb-2w${error ? ' fr-input-group--error' : ''}${compact ? ' [&_.fr-label]:text-xs [&_.fr-label]:leading-5 [&_.fr-input]:text-xs [&_.fr-select]:text-xs [&_input.fr-input]:h-9 [&_.fr-select]:h-9' : ''}`}>
      <label className='fr-label' htmlFor={id}>{label}{required ? ' *' : ''}</label>
      {hint && <p className='fr-hint-text fr-mb-1v' id={`${id}-hint`}>{hint}</p>}
      {options ? (
        <select className='fr-select' {...nativeProps}>
          {options.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
        </select>
      ) : (multiline ? <textarea className='fr-input' rows={3} {...nativeProps} /> : <input className='fr-input' type={type} {...nativeProps} />)}
      {error && <p className='fr-error-text' id={`${id}-error`}>{error}</p>}
    </div>
  )
}

export const CampaignCard = ({title, description, children, aside, headingLevel = 'h2'}) => {
  const Heading = headingLevel
  return (
    <section className='mb-5 rounded-lg border border-[var(--border-default-grey)] bg-[var(--background-default-grey)] p-5 md:p-6'>
      <div className='mb-4 flex flex-wrap items-start justify-between gap-3'>
        <div className='min-w-0'>
          <Heading className='fr-h5 fr-mb-0'>{title}</Heading>
          {description && <p className='fr-mb-0 mt-2 text-sm text-[var(--text-mention-grey)]'>{description}</p>}
        </div>
        {aside}
      </div>
      {children}
    </section>
  )
}
