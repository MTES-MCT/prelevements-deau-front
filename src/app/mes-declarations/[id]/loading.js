'use client'

import {
  useEffect,
  useRef,
  useState,
  useTransition
} from 'react'

import {useRouter} from 'next/navigation'

import PageLoading from '@/components/ui/page-loading.js'

const Loading = () => {
  const router = useRouter()
  const attemptsRef = useRef(0)
  const timeoutRef = useRef(null)
  const [visibilityVersion, setVisibilityVersion] = useState(0)
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState !== 'visible' && timeoutRef.current) {
        clearTimeout(timeoutRef.current)
        timeoutRef.current = null
      }

      if (document.visibilityState === 'visible') {
        attemptsRef.current = 0
      }

      setVisibilityVersion(version => version + 1)
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [])

  useEffect(() => {
    if (isPending || document.visibilityState !== 'visible') {
      return undefined
    }

    const delays = [3000, 5000, 10_000]
    const delay = delays[Math.min(attemptsRef.current, delays.length - 1)]
    const timeout = setTimeout(() => {
      timeoutRef.current = null
      if (document.visibilityState !== 'visible') {
        return
      }

      attemptsRef.current += 1
      startTransition(() => router.refresh())
    }, delay)
    timeoutRef.current = timeout

    return () => {
      clearTimeout(timeout)
      if (timeoutRef.current === timeout) {
        timeoutRef.current = null
      }
    }
  }, [isPending, router, startTransition, visibilityVersion])

  return (
    <PageLoading message={isPending
      ? 'Vérification de l’avancement de l’importation...'
      : 'La déclaration est en cours d’importation...'} />
  )
}

export default Loading
