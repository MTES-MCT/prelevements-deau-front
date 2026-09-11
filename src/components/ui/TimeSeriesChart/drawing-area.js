export function isPointInDrawingArea({x, y}, {left, top, width, height}) {
  return Number.isFinite(x) && Number.isFinite(y)
    && x >= left && x <= left + width
    && y >= top && y <= top + height
}
