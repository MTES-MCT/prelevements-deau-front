'use client'

import {
  useCallback,
  useEffect,
  useRef
} from 'react'

import {usePathname} from 'next/navigation'
import {useReportWebVitals} from 'next/web-vitals'

import {useAuth} from '@/contexts/auth-context.js'
import {
  getMatomoMetricValue,
  normalizeRoutePattern,
  REPORTED_WEB_VITALS
} from '@/lib/performance.js'

const BUILD_SHA = process.env.NEXT_PUBLIC_BUILD_SHA?.slice(0, 12) || 'local'

function getDeviceClass() {
  return window.matchMedia('(max-width: 48rem)').matches ? 'mobile' : 'desktop'
}

function getNavigationType(metric) {
  if (metric.navigationType) {
    return metric.navigationType
  }

  return performance.getEntriesByType('navigation')[0]?.type || 'navigate'
}

const WebVitalsReporter = ({enabled = false}) => {
  const pathname = usePathname()
  const {user} = useAuth()
  const contextRef = useRef({pathname, role: user?.role || 'ANONYMOUS'})

  useEffect(() => {
    contextRef.current = {
      pathname,
      role: user?.role || 'ANONYMOUS'
    }
  }, [pathname, user?.role])

  const reportWebVital = useCallback(metric => {
    if (!enabled || !REPORTED_WEB_VITALS.has(metric.name)) {
      return
    }

    const {pathname: currentPathname, role} = contextRef.current
    const dimensions = [
      normalizeRoutePattern(currentPathname),
      role,
      getDeviceClass(),
      getNavigationType(metric),
      metric.rating || 'unknown',
      BUILD_SHA
    ].join('|')

    window._paq ||= []
    window._paq.push([
      'trackEvent',
      'Web Vitals',
      metric.name,
      dimensions,
      getMatomoMetricValue(metric)
    ])
  }, [enabled])

  useReportWebVitals(reportWebVital)

  return null
}

export default WebVitalsReporter
