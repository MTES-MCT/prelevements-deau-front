'use client'

import {useId} from 'react'

import Link from 'next/link'

export const CampaignShell = ({title, description, children, backHref = '/campagnes', backLabel = 'Retour'}) => (
  <div className='min-h-screen bg-[#f7f7fb] pb-12'>
    <div className='fr-container pt-6 md:pt-8'>
      <Link className='fr-link fr-icon-arrow-left-line fr-link--icon-left' href={backHref}>{backLabel}</Link>
      <h1 className='fr-h3 fr-mt-3w fr-mb-1w'>{title}</h1>
      {description && <p className='fr-text--sm text-gray-700'>{description}</p>}
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

export const CampaignField = ({label, hint, value, onChange, type = 'text', required = false, disabled = false, options, multiline = false, ...props}) => {
  const id = useId()
  const nativeProps = {
    id, value: value ?? '', required, disabled, onChange: event => onChange(event.target.value), 'aria-describedby': hint ? `${id}-hint` : undefined, ...props
  }
  return (
    <div className='fr-input-group fr-mb-2w'>
      <label className='fr-label' htmlFor={id}>{label}{required ? ' *' : ''}</label>
      {hint && <p className='fr-hint-text fr-mb-1v' id={`${id}-hint`}>{hint}</p>}
      {options ? (
        <select className='fr-select' {...nativeProps}>
          {options.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
        </select>
      ) : (multiline ? <textarea className='fr-input' rows={3} {...nativeProps} /> : <input className='fr-input' type={type} {...nativeProps} />)}
    </div>
  )
}

export const CampaignCard = ({title, children, aside}) => (
  <section className='mb-4 border border-gray-200 bg-white p-4 md:p-5'>
    <div className='flex flex-wrap items-start justify-between gap-2'>
      <h2 className='fr-h5 fr-mb-2w'>{title}</h2>
      {aside}
    </div>
    {children}
  </section>
)
