export function keepActiveIndexInRenderedRange(
  activeIndex,
  firstRenderedIndex,
  lastRenderedIndex
) {
  if (!Number.isInteger(firstRenderedIndex) || !Number.isInteger(lastRenderedIndex)) {
    return activeIndex
  }

  return Math.min(Math.max(activeIndex, firstRenderedIndex), lastRenderedIndex)
}
