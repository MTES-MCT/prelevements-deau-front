function hasPermission(item, permission) {
  return item?.right?.permissions?.includes(permission) === true
}

function hasAdminOrPermission(item, permission) {
  return item?.right?.isAdmin === true || hasPermission(item, permission)
}

function getDeclarantProfile(item) {
  return item?.declarant && typeof item.declarant === 'object'
    ? item.declarant
    : item ?? {}
}

function getPointCount(item, profile, declarantRole) {
  const explicitCount = item?.pointCount ?? item?.pointsCount

  if (Number.isInteger(explicitCount) && explicitCount >= 0) {
    return explicitCount
  }

  if (declarantRole === 'COLLECTEUR') {
    return profile?._count?.collecteurExploitations
      ?? profile?.collecteurExploitations?.length
      ?? 0
  }

  return profile?._count?.pointPrelevements ?? 0
}

function getDeclarantIdentity(item, profile) {
  return {
    id: item?.id ?? item?.userId ?? item?.user?.id ?? null,
    email: item?.email ?? item?.user?.email ?? null,
    civility: item?.civility ?? profile.civility ?? null,
    firstName: item?.firstName ?? item?.user?.firstName ?? null,
    lastName: item?.lastName ?? item?.user?.lastName ?? null
  }
}

function getDeclarantBusinessProfile(item, profile) {
  return {
    declarantType: item?.declarantType ?? profile.declarantType ?? null,
    preleveurType: item?.preleveurType ?? profile.preleveurType ?? null,
    socialReason: item?.socialReason ?? profile.socialReason ?? null,
    city: item?.city ?? profile.city ?? null,
    lastDeclarationAt: item?.lastDeclarationAt ?? profile.lastDeclarationAt ?? null
  }
}

function getDeclarantCapabilities(item) {
  return {
    canReadDetail: item?.canReadDetail ?? hasPermission(item, 'declarant.detail.read'),
    canDisplayPoints: item?.canDisplayPoints
      ?? hasAdminOrPermission(item, 'exploitation.list'),
    canDisplayActivity: item?.canDisplayActivity
      ?? hasAdminOrPermission(item, 'declaration.list')
  }
}

export function toDeclarantListItem(item) {
  const profile = getDeclarantProfile(item)
  const declarantRole = item?.declarantRole ?? profile.declarantRole ?? 'PRELEVEUR'

  return {
    ...getDeclarantIdentity(item, profile),
    declarantRole,
    ...getDeclarantBusinessProfile(item, profile),
    pointCount: getPointCount(item, profile, declarantRole),
    usages: item?.usages ?? item?.searchSummary?.usages ?? [],
    ...getDeclarantCapabilities(item)
  }
}

/**
 * Projects both the historical hydrated API result and the compact result to
 * the small, stable model rendered by the client list.
 */
export function toDeclarantsListResult(result) {
  if (!result || typeof result !== 'object') {
    return result
  }

  return {
    items: Array.isArray(result.items)
      ? result.items.map(item => toDeclarantListItem(item))
      : result.items,
    page: result.page,
    pageSize: result.pageSize,
    total: result.total,
    totalPages: result.totalPages,
    facets: result.facets ?? {}
  }
}
