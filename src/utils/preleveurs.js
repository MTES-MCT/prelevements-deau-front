export function displayPreleveur(preleveur) {
  const socialReason = preleveur?.socialReason || preleveur?.declarant?.socialReason

  if (socialReason) {
    return socialReason
  }

  const firstName = preleveur?.firstName || preleveur?.user?.firstName || ''
  const lastName = preleveur?.lastName || preleveur?.user?.lastName || ''
  const fullName = `${firstName} ${lastName}`.trim()

  return fullName || preleveur?.email || preleveur?.user?.email || 'Déclarant sans nom'
}
