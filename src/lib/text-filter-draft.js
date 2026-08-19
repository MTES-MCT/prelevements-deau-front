export function getCanonicalTextFilterValue(value) {
  return String(value ?? '').trim()
}

export function reconcileTextFilterDraft(currentValue, externalValue, pendingValues = []) {
  const current = String(currentValue ?? '')
  const external = String(externalValue ?? '')
  const canonicalExternal = getCanonicalTextFilterValue(external)
  const isOwnResponse = pendingValues
    .some(value => getCanonicalTextFilterValue(value) === canonicalExternal)

  if (isOwnResponse || getCanonicalTextFilterValue(current) === canonicalExternal) {
    return current
  }

  return external
}

export function getCanonicalTextFilterSnapshot(values = {}) {
  return {
    declarant: getCanonicalTextFilterValue(values.declarant),
    dossierNumber: getCanonicalTextFilterValue(values.dossierNumber)
  }
}

export function textFilterSnapshotsAreEqual(left, right) {
  const canonicalLeft = getCanonicalTextFilterSnapshot(left)
  const canonicalRight = getCanonicalTextFilterSnapshot(right)

  return canonicalLeft.declarant === canonicalRight.declarant
    && canonicalLeft.dossierNumber === canonicalRight.dossierNumber
}

export function registerPendingTextFilterNavigation(
  pendingNavigations,
  values,
  {limit = 8} = {}
) {
  const navigation = getCanonicalTextFilterSnapshot(values)
  const withoutDuplicate = pendingNavigations.filter(pendingNavigation => (
    !textFilterSnapshotsAreEqual(pendingNavigation, navigation)
  ))

  return [...withoutDuplicate, navigation].slice(-Math.max(1, limit))
}

export function withTextFilterSnapshot(filters, values) {
  const snapshot = getCanonicalTextFilterSnapshot(values)

  return {
    ...filters,
    declarant: snapshot.declarant || undefined,
    dossierNumber: snapshot.dossierNumber || undefined
  }
}

export function reconcileTextFilterSnapshotDrafts(drafts, externalValues, pendingNavigations = []) {
  const external = getCanonicalTextFilterSnapshot(externalValues)
  const ownResponseIndex = pendingNavigations.findIndex(navigation => (
    textFilterSnapshotsAreEqual(navigation, external)
  ))
  const isOwnResponse = ownResponseIndex >= 0

  return {
    drafts: Object.fromEntries(
      Object.entries(external).map(([name, externalValue]) => [
        name,
        reconcileTextFilterDraft(
          drafts[name],
          externalValue,
          isOwnResponse ? [externalValue] : []
        )
      ])
    ),
    isOwnResponse,
    pendingNavigations: isOwnResponse
      ? pendingNavigations.filter((navigation, index) => index !== ownResponseIndex)
      : []
  }
}
