'use client'

import {useCallback, useEffect, useState} from 'react'

import {
  createSearchDraftState,
  editSearchDraft,
  receiveCanonicalSearchValue,
  registerLocalSearchNavigation
} from '@/lib/search-draft.js'

const getLocationSearchValue = parameter => (
  new URLSearchParams(globalThis.location?.search ?? '').get(parameter) ?? ''
)

export default function useSearchDraft(canonicalValue, parameter) {
  const [state, setState] = useState(() => createSearchDraftState(canonicalValue))

  useEffect(() => {
    setState(current => receiveCanonicalSearchValue(current, canonicalValue))
  }, [canonicalValue])

  useEffect(() => {
    const handlePopState = () => {
      const value = getLocationSearchValue(parameter)
      setState(current => receiveCanonicalSearchValue(
        current,
        value,
        {externalNavigation: true}
      ))
    }

    globalThis.addEventListener('popstate', handlePopState)
    return () => globalThis.removeEventListener('popstate', handlePopState)
  }, [parameter])

  const setValue = useCallback(value => {
    setState(current => editSearchDraft(current, value))
  }, [])

  const registerLocalNavigation = useCallback(value => {
    setState(current => registerLocalSearchNavigation(current, value))
  }, [])

  return {
    registerLocalNavigation,
    setValue,
    value: state.value
  }
}
