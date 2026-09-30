import {getParameterMetadata} from '@/components/PrelevementsSeriesExplorer/constants/parameters.js'
import {buildChartSeriesQuery} from '@/lib/chart-series.js'
import {pickAvailableFrequency} from '@/utils/frequency.js'
import {resolveSelectedParametersDateRange} from './series-date-range.js'
import {resolveInitialDisplayFrequency} from './series-display-frequency.js'

const parameterId = parameter => parameter.value ?? parameter.id ?? parameter.metricTypeCode ?? parameter.code ?? parameter.name
const metricCode = parameter => parameter.metricTypeCode ?? parameter.code ?? parameter.name

export function resolveDefaultSeriesParameterIds(parameters = []) {
  const selected = ['volume', 'débit'].map(metric => parameters.find(parameter => metricCode(parameter)?.toLowerCase() === metric))
    .filter(Boolean).map(parameterId)
  return selected.length ? selected : parameters[0] ? [parameterId(parameters[0])] : []
}

// Shared by server preloading and the client: never invent a shorter history,
// change the selected metrics, or preload a different frequency/date window.
export function buildInitialChartRequests({parameters = [], ...scope}) {
  const selectedParameters = resolveDefaultSeriesParameterIds(parameters)
  const range = resolveSelectedParametersDateRange({parameters, selectedParameters, startDate: scope.startDate, endDate: scope.endDate})
  const target = resolveInitialDisplayFrequency({startDate: range.start, endDate: range.end})
  return selectedParameters.flatMap(id => {
    const parameter = parameters.find(parameter => parameterId(parameter) === id)
    // Physical indexes need their existing bounded pagination, not aggregation.
    if (!parameter || parameter.readingSeries) return []
    const metadata = getParameterMetadata(parameter.name) ?? {}
    const operators = parameter.temporalOperators?.length ? parameter.temporalOperators : metadata.temporalOperators ?? []
    const preferred = parameter.defaultTemporalOperator ?? metadata.defaultTemporalOperator ?? operators[0]
    const temporalOperator = operators.includes(preferred) ? preferred : operators[0]
    if (!temporalOperator) return []
    return [{parameterId: id, query: buildChartSeriesQuery({
      ...scope,
      exploitationId: parameter.exploitationId || scope.exploitationId,
      metricTypeCode: metricCode(parameter), pointFlowType: parameter.flowType,
      startDate: range.start, endDate: range.end,
      aggregationFrequency: pickAvailableFrequency(target, parameter.availableFrequencies) ?? target,
      temporalOperator
    })}]
  })
}

export function mergeDetailedSeriesOptions(initial, detailed) {
  const existing = new Set(initial.parameters.map(parameterId))
  return {...initial, detailsDeferred: false, parameters: [
    ...initial.parameters,
    ...detailed.parameters.filter(parameter => !existing.has(parameterId(parameter)))
  ]}
}

// Promise props are streamed by React/Next. Start every request now but never
// await the slowest series before sending the options and the first graph.
export function preloadInitialChartSeries(options, fetchSeries) {
  return buildInitialChartRequests(options).map(({query}) => ({
    query,
    response: (async () => {
      try {
        return await fetchSeries(query)
      } catch (error) {
        const code = Number(error?.code) || 500
        return {code, error: code === 401 ? 'Votre session a expiré. Reconnectez-vous pour charger les données.'
          : code === 403 ? 'Vous ne pouvez pas consulter les données de ce périmètre.'
            : 'Impossible de charger les séries agrégées'}
      }
    })()
  }))
}
