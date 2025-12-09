'use client'

import {usePermissions} from '@/hook/use-permissions.js'

/**
 * Component that only renders its children if user has editor role
 * @param {object} props
 * @param {React.ReactNode} props.children - Content to render if user is editor
 * @param {React.ReactNode} [props.fallback] - Optional content to render if user is not editor
 */
export const RequireEditor = ({children, fallback = null}) => {
  const {canEdit, isLoading} = usePermissions()

  if (isLoading) {
    return null
  }

  if (!canEdit) {
    return fallback
  }

  return children
}

/**
 * Component that only renders its children if user has at least reader role
 * @param {object} props
 * @param {React.ReactNode} props.children - Content to render if user can read
 * @param {React.ReactNode} [props.fallback] - Optional content to render if user cannot read
 */
export const RequireReader = ({children, fallback = null}) => {
  const {canRead, isLoading} = usePermissions()

  if (isLoading) {
    return null
  }

  if (!canRead) {
    return fallback
  }

  return children
}

export default RequireEditor
