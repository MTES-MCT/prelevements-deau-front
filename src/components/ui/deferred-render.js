'use client'

import {useEffect, useRef, useState} from 'react'

const DeferredRender = ({
  children,
  className = '',
  placeholder = null,
  rootMargin = '300px 0px',
  minHeight
}) => {
  const containerRef = useRef(null)
  const [shouldRender, setShouldRender] = useState(false)

  useEffect(() => {
    const container = containerRef.current

    if (!container || typeof IntersectionObserver === 'undefined') {
      setShouldRender(true)
      return undefined
    }

    const observer = new IntersectionObserver(entries => {
      if (!entries.some(entry => entry.isIntersecting)) {
        return
      }

      setShouldRender(true)
      observer.disconnect()
    }, {rootMargin})

    observer.observe(container)

    return () => observer.disconnect()
  }, [rootMargin])

  return (
    <div
      ref={containerRef}
      aria-busy={!shouldRender}
      className={className}
      style={minHeight ? {minHeight} : undefined}
    >
      {shouldRender ? children : placeholder}
    </div>
  )
}

export default DeferredRender
