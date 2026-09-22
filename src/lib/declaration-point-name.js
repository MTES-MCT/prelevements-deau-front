import {isManualQuickDeclarationSource} from '@/lib/declaration.js'
import {withCountingCode} from '@/lib/exploitation-identity.js'
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
  const exploitation = chunk?.exploitation || {countingCode: chunk?.countingCode || chunk?.metadata?.countingCode}
  if (!chunk?.pointPrelevement) {
    return withCountingCode(chunk?.pointPrelevementName || fallback, exploitation)
  }

  return withCountingCode(getPointPrelevementDisplayName(chunk.pointPrelevement, {
    fallback: chunk.pointPrelevementName || fallback,
    preferUsageName: shouldPreferUsageName(source, preferUsageName)
  }), exploitation)
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
