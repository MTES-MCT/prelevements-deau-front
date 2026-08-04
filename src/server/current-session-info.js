export function buildCurrentSessionInfo(session) {
  if (!session?.user?.token) {
    return null
  }

  return {
    role: session.user.role,
    permissions: session.user.permissions || [],
    impersonation: session.user.impersonation || null,
    declarantRole: session.user.declarantRole,
    user: session.user
  }
}
