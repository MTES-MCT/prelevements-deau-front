'use client'

import {useAuth} from '@/contexts/auth-context.js'

/**
 * Hook to check user permissions based on their role
 * @returns {{
 *   canRead: boolean,
 *   canEdit: boolean,
 *   userRole: 'reader' | 'editor' | null,
 *   territoire: {code: string, nom: string} | null,
 *   isLoading: boolean,
 *   isAuthenticated: boolean
 * }}
 */
export const usePermissions = () => {
  const {user, isAuthenticated, isLoading} = useAuth()

  const userRole = user?.role || null
  const territoire = user?.territoire || null

  // Reader and editor can read
  const canRead = userRole === 'reader' || userRole === 'editor'
  // Only editor can edit
  const canEdit = userRole === 'editor'

  return {
    canRead,
    canEdit,
    userRole,
    territoire,
    isLoading,
    isAuthenticated
  }
}

export default usePermissions
