const DEFAULT_VISIBLE_USAGE_LIMIT = 2

export function getDeclarantUsageSummary(
  usages,
  {limit = DEFAULT_VISIBLE_USAGE_LIMIT} = {}
) {
  const uniqueUsages = []
  const seenCodes = new Set()

  for (const usage of Array.isArray(usages) ? usages : []) {
    const code = String(usage?.code ?? '').trim()

    if (!code || seenCodes.has(code)) {
      continue
    }

    seenCodes.add(code)
    uniqueUsages.push({
      code,
      label: usage?.label || code
    })
  }

  const visibleUsages = uniqueUsages.slice(0, Math.max(0, limit))

  return {
    visibleUsages,
    remainingCount: Math.max(0, uniqueUsages.length - visibleUsages.length)
  }
}
