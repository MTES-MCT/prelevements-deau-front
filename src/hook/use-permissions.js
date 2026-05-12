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

  const role = user?.role || null

  const canRead = Boolean(role)
  const canEdit = role === 'INSTRUCTOR' || role === 'ADMIN'

  return {
    canRead,
    canEdit,
    role,
    isLoading,
    isAuthenticated
  }
}

export default usePermissions
