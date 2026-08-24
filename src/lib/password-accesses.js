export function getPasswordAccessActionAvailability({currentUserId, status, userId}) {
  const identityAvailable = typeof currentUserId === 'string' && currentUserId.length > 0
  const isOwnAccount = identityAvailable && currentUserId === userId

  return Object.freeze({
    identityAvailable,
    isOwnAccount,
    canCreateActivation: identityAvailable && !isOwnAccount,
    canRevoke: identityAvailable && !isOwnAccount && status !== 'NONE'
  })
}

export function getPasswordAccessCurrentUserId(currentUserData) {
  const currentUserId = currentUserData?.user?.id

  return typeof currentUserId === 'string' && currentUserId.length > 0
    ? currentUserId
    : null
}
