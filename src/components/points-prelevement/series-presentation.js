import {withCountingCode} from '@/lib/exploitation-identity.js'

const METER_COLORS = ['#009099', '#A558A0', '#B34000', '#18753C', '#3558A2', '#A94645', '#716043', '#6956A5']
const UUID = /[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}/i

function getMeterNumber(parameter) {
  const number = parameter.meter?.serialNumber ?? parameter.meter?.identifier
  if (number && !UUID.test(String(number))) {
    return String(number)
  }

  // Compatibility with options served before structured meter information.
  const legacyNumber = parameter.label?.match(/^Index\s*—\s*compteur\s+(.+)$/i)?.[1]
  return legacyNumber && !UUID.test(legacyNumber) ? legacyNumber : null
}

export function buildSeriesPresentations(parameters = []) {
  const meters = parameters.filter(parameter => parameter.readingSeries === true)
    .sort((a, b) => String(a.meterId ?? a.id).localeCompare(String(b.meterId ?? b.id)))
  const meterPositions = new Map(meters.map((parameter, index) => [parameter.id, index]))

  return parameters.map(parameter => {
    if (parameter.readingSeries === true) {
      const position = meterPositions.get(parameter.id)
      const number = getMeterNumber(parameter)
      return {
        ...parameter,
        label: number ? `Compteur n° ${number}` : `Compteur ${position + 1} (numéro non renseigné)`,
        color: METER_COLORS[position % METER_COLORS.length]
      }
    }

    const metric = parameter.metricTypeCode ?? parameter.code ?? parameter.name
    if (metric === 'index') {
      const baseLabel = `Index déclarés${parameter.flowType === 'REJET' ? ' — rejets' : ''}`
      return {
        ...parameter,
        label: parameter.exploitationId
          ? parameter.label || baseLabel
          : withCountingCode(baseLabel, parameter.exploitation || parameter)
      }
    }

    return parameter
  })
}
