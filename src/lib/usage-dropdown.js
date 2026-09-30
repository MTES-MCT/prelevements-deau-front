// Coordinates are relative to the layout viewport, including a mobile visual
// viewport narrowed by zoom or the on-screen keyboard.
export function usageDropdownPosition(rect, viewport) {
  const leftEdge = (viewport.offsetLeft || 0) + 8
  const topEdge = (viewport.offsetTop || 0) + 12
  const rightEdge = leftEdge + Math.max(0, viewport.width - 16)
  const bottomEdge = topEdge + Math.max(0, viewport.height - 24)
  const width = Math.min(rect.width, rightEdge - leftEdge)
  const below = Math.max(0, bottomEdge - Math.max(topEdge, rect.bottom) - 4)
  const above = Math.max(0, Math.min(bottomEdge, rect.top) - topEdge - 4)
  const openAbove = below < 220 && above > below
  const maxHeight = Math.min(360, Math.max(0, openAbove ? above : below))
  const top = openAbove ? rect.top - maxHeight - 4 : rect.bottom + 4
  return {
    left: `${Math.round(Math.max(leftEdge, Math.min(rect.left, rightEdge - width)))}px`,
    top: `${Math.round(Math.max(topEdge, Math.min(top, bottomEdge - maxHeight)))}px`,
    width: `${Math.round(width)}px`,
    maxHeight: `${Math.round(maxHeight)}px`
  }
}
