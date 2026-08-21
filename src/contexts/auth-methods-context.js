'use client'

import {createContext, useContext, useMemo} from 'react'

const AuthMethodsContext = createContext({
  available: false,
  methods: []
})

export const AuthMethodsProvider = ({available, children, methods}) => {
  const value = useMemo(() => ({
    available,
    methods
  }), [available, methods])

  return (
    <AuthMethodsContext.Provider value={value}>
      {children}
    </AuthMethodsContext.Provider>
  )
}

export function useAuthMethods() {
  return useContext(AuthMethodsContext)
}
