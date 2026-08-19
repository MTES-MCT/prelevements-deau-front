function toSearchValue(value) {
  return String(value ?? '')
}

function toCanonicalSearchValue(value) {
  return toSearchValue(value).trim()
}

export function createSearchDraftState(canonicalValue = '') {
  return {
    pendingNavigations: [],
    revision: 0,
    value: toSearchValue(canonicalValue)
  }
}

export function editSearchDraft(state, value) {
  return {
    ...state,
    revision: state.revision + 1,
    value: toSearchValue(value)
  }
}

export function registerLocalSearchNavigation(state, value) {
  const canonicalValue = toCanonicalSearchValue(value)
  const pendingNavigations = state.pendingNavigations
    .filter(navigation => navigation.value !== canonicalValue)

  pendingNavigations.push({
    revision: state.revision,
    value: canonicalValue
  })

  return {
    ...state,
    pendingNavigations
  }
}

export function receiveCanonicalSearchValue(
  state,
  value,
  {externalNavigation = false} = {}
) {
  const canonicalValue = toCanonicalSearchValue(value)

  if (externalNavigation) {
    return {
      ...state,
      revision: state.revision + 1,
      value: canonicalValue
    }
  }

  const acknowledgedNavigationIndex = state.pendingNavigations.findIndex(navigation => (
    navigation.value === canonicalValue
    && navigation.revision <= state.revision
  ))

  if (acknowledgedNavigationIndex >= 0) {
    return {
      ...state,
      pendingNavigations: state.pendingNavigations.filter(
        (navigation, index) => index !== acknowledgedNavigationIndex
      )
    }
  }

  if (toCanonicalSearchValue(state.value) === canonicalValue) {
    return state
  }

  return {
    ...state,
    revision: state.revision + 1,
    value: canonicalValue
  }
}
