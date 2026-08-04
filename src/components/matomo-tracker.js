'use client'

import {useEffect} from 'react'

import {usePathname} from 'next/navigation'

const MatomoTracker = ({enabled = false}) => {
  const pathname = usePathname()

  useEffect(() => {
    if (!enabled) {
      return
    }

    const {search} = window.location
    const url = `${pathname}${search}`

    window._paq ||= []
    window._paq.push(['setCustomUrl', url], ['setDocumentTitle', document.title], ['trackPageView'])
  }, [enabled, pathname])

  return null
}

export default MatomoTracker
