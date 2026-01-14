'use client'

import {useAuth} from '@/contexts/auth-context.js'

/**
 * Hook to check user permissions based on their role
 * @returns {{
 *   canRead: boolean,
 *   canEdit: boolean,
 *   userRole: 'reader' | 'editor' | null,
 *   isLoading: boolean,
 *   isAuthenticated: boolean
 * }}
 */
export const usePermissions = () => {
  const {user, isAuthenticated, isLoading} = useAuth()

  const userRoles = user?.roles || []

  const canRead = userRoles.includes('reader') || userRoles.includes('editor')
  const canEdit = userRoles.includes('editor')

  return {
    canRead,
    canEdit,
    userRoles,
    isLoading,
    isAuthenticated
  }
}

export default usePermissions
