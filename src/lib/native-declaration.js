export const REUNION_FILE_TYPES = new Set(['camion-citerne', 'aep-zre', 'icpe-hors-zre', 'reunion_camion_citerne', 'reunion_multi_param', 'reunion-camion-citerne', 'reunion-multi-param'])

export function isNativeDeclaration(source) {
  return source?.metadata?.nativeTemporal === true || source?.chunks?.some(chunk => chunk.metadata?.nativeTemporal === true) === true
}

export function formatNativeDate(value) {
  if (!value) return 'Non renseignée'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? String(value) : new Intl.DateTimeFormat('fr-FR', {
    timeZone: 'Indian/Reunion', dateStyle: 'short', timeStyle: 'medium'
  }).format(date)
}
