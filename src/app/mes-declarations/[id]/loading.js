'use client'

import {useEffect} from 'react'

import {useRouter} from 'next/navigation'

import PageLoading from '@/components/ui/page-loading.js'

const Loading = () => {
  const router = useRouter()

  useEffect(() => {
    const interval = setInterval(() => {
      router.refresh()
    }, 3000)

    return () => clearInterval(interval)
  }, [router])

  return <PageLoading message='La déclaration est en cours d’importation...' />
}

export default Loading
