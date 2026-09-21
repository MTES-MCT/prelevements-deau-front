export function areSameSelections(first, second) {
  const firstSet = new Set(first)
  const secondSet = new Set(second)
  return firstSet.size === secondSet.size && [...firstSet].every(value => secondSet.has(value))
}

// Only the enabled, visible options are passed here. Hidden/disabled selections
// must survive a bulk action on search results.
export function updateVisibleSelection(current, visibleValues, selected) {
  const next = new Set(current)
  for (const value of visibleValues) {
    if (selected) {
      next.add(value)
    } else {
      next.delete(value)
    }
  }

  return [...next]
}
