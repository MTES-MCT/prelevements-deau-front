'use client'

import {useEffect} from 'react'

import {usePathname} from 'next/navigation'

const MatomoTracker = () => {
  const pathname = usePathname()

  useEffect(() => {
    if (!window._paq) {
      return
    }

    const {search} = window.location
    const url = `${pathname}${search}`

    window._paq.push(['setCustomUrl', url], ['setDocumentTitle', document.title], ['trackPageView'])
  }, [pathname])

  return null
}

export default MatomoTracker
