const MapPopupCard = ({
  actionHref,
  actionLabel,
  children,
  dismissable = false,
  eyebrow,
  subtitle,
  title,
  width = '19rem',
  onAction
}) => (
  <article
    className='overflow-hidden bg-white text-gray-900'
    style={{width: `min(${width}, calc(100vw - 2rem))`}}
  >
    <header className={`border-b border-gray-200 bg-gray-50 py-2.5 pl-3 ${dismissable ? 'pr-9' : 'pr-3'}`}>
      {eyebrow}
      <h3 className='fr-mb-0 min-w-0 break-words text-sm font-semibold leading-5'>
        {title}
      </h3>

      {subtitle && (
        <p className='fr-mb-0 mt-1 break-words text-xs leading-4 text-gray-600'>
          {subtitle}
        </p>
      )}
    </header>

    <div className='px-3 py-2.5'>
      {children}
    </div>

    {actionLabel && (actionHref || onAction) && (
      <footer className='border-t border-gray-200 bg-gray-50 px-3 py-2.5'>
        {actionHref ? <a
          className='fr-btn fr-btn--sm w-full justify-center'
          href={actionHref}
          onClick={event => {
            if (onAction && !event.defaultPrevented && event.button === 0
              && !event.ctrlKey && !event.metaKey && !event.shiftKey && !event.altKey) {
              event.preventDefault()
              onAction(event)
            }
          }}
        >
          {actionLabel}
        </a> : <button
          className='fr-btn fr-btn--sm w-full justify-center'
          type='button'
          onClick={onAction}
        >
          {actionLabel}
        </button>}
      </footer>
    )}
  </article>
)

export default MapPopupCard
