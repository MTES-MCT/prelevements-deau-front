export function buildPageTitle(parts, fallback) {
  const title = parts
    .map(part => String(part || '').trim())
    .filter(Boolean)
    .join(' - ')

  return {
    title: title || fallback
  }
}
