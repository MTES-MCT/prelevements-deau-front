import {isManualQuickDeclarationSource} from '@/lib/declaration.js'
import {
  getPointPrelevementDisplayName,
  getPointPrelevementTechnicalReference
} from '@/utils/point-prelevement.js'

function shouldPreferUsageName(source, preferUsageName) {
  return preferUsageName && isManualQuickDeclarationSource(source)
}

export function getDeclarationPointDisplayName(chunk, source, {
  fallback = 'Point de prélèvement',
  preferUsageName = false
} = {}) {
  if (!chunk?.pointPrelevement) {
    return chunk?.pointPrelevementName || fallback
  }

  return getPointPrelevementDisplayName(chunk.pointPrelevement, {
    fallback: chunk.pointPrelevementName || fallback,
    preferUsageName: shouldPreferUsageName(source, preferUsageName)
  })
}

export function getDeclarationPointTechnicalReference(chunk, source, {
  preferUsageName = false
} = {}) {
  if (!chunk?.pointPrelevement) {
    return null
  }

  return getPointPrelevementTechnicalReference(chunk.pointPrelevement, {
    preferUsageName: shouldPreferUsageName(source, preferUsageName)
  })
}
