export const REUNION_FILE_TYPES = new Set(['camion-citerne', 'aep-zre', 'icpe-hors-zre', 'reunion_camion_citerne', 'reunion_multi_param', 'reunion-camion-citerne', 'reunion-multi-param'])

export function isNativeDeclaration(source) {
  return source?.metadata?.nativeTemporal === true || source?.chunks?.some(chunk => chunk.metadata?.nativeTemporal === true) === true
}

const nativeAssociationWarnings = {
  EXPLOITATION_NOT_FOUND: 'aucune exploitation n’est enregistrée pour ce préleveur.',
  EXPLOITATION_PERIOD_NOT_COVERED: 'aucune exploitation ne couvre toute la période déclarée.',
  EXPLOITATION_AMBIGUOUS: 'plusieurs exploitations couvrent la période déclarée.',
  OVERLAPPING_SERIES: 'une ou plusieurs séries recouvrent des données déjà présentes ; elles sont exclues du calcul pour éviter les doubles comptes.'
}

export function getNativeAssociationWarnings(chunks = []) {
  const warnings = new Map()
  for (const chunk of chunks) {
    if (chunk.metadata?.nativeTemporal !== true || chunk.metadata?.superseded || !chunk.pointPrelevementId) continue
    for (const issue of chunk.parsingInfo?.issues ?? []) {
      const code = issue?.code
      const message = Object.hasOwn(nativeAssociationWarnings, code) ? nativeAssociationWarnings[code] : null
      if (!message) continue
      if (code === 'OVERLAPPING_SERIES' && chunk.instructionStatus !== 'REJECTED') continue
      const key = `${chunk.pointPrelevementId}:${code}`
      if (!warnings.has(key)) warnings.set(key, {
        key,
        pointName: chunk.pointPrelevement?.name || chunk.pointPrelevementName || 'Point de prélèvement',
        message
      })
    }
  }
  return [...warnings.values()]
}

export function formatNativeDate(value) {
  if (!value) return 'Non renseignée'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? String(value) : new Intl.DateTimeFormat('fr-FR', {
    timeZone: 'Indian/Reunion', dateStyle: 'short', timeStyle: 'medium'
  }).format(date)
}
