'use client'

import {Alert} from '@codegouvfr/react-dsfr/Alert'
import {Box, Typography} from '@mui/material'

import MeterSeriesRangeForm from '@/components/points-prelevement/meter-series-range-form.js'
import AggregatedSeriesExplorer from '@/components/PrelevementsSeriesExplorer/aggregated-series-explorer.js'

const SeriesExplorer = ({
  hasParameters, title, titleComponent, subtitle, limitedScope, selectionScope,
  loadDetailedOptions, detailsLoading, detailsError,
  fullDateRange, dateRange, onMeterRangeApply, selectedParameters, explorerStateKey,
  aggregatedSeriesMap, parameterOptions, derivedDefaultParameters,
  temporalOperatorOptionsByParameter, resolvedTemporalOperatorsByParameter,
  defaultTemporalOperatorsByParameter, selectablePeriods, defaultPeriods,
  getVolumeValuesForRange, loadError, isLoading, parameterErrors, pendingParameters, seriesOptions,
  handleFiltersChange, handleDisplayResolutionChange, parameterDefinitionMap
}) => {
  return hasParameters ? (
    <Box className='flex flex-col gap-4'>
      <Box>
        <Typography variant='h5' component={titleComponent}>
          {title}
        </Typography>

        {subtitle && (
          <Typography color='text.secondary' variant='body2'>
            {subtitle}
          </Typography>
        )}
      </Box>

      {limitedScope === selectionScope && <MeterSeriesRangeForm
        key={selectionScope}
        bounds={fullDateRange}
        value={dateRange}
        onApply={onMeterRangeApply}
      />}

      {selectedParameters.length > 0 && (
        <AggregatedSeriesExplorer
          key={explorerStateKey}
          showRangeSlider
          showPeriodSelector={false}
          showCalendar={false}
          series={aggregatedSeriesMap}
          parameters={parameterOptions}
          selectedParameters={selectedParameters}
          defaultParameters={derivedDefaultParameters}
          temporalOperatorOptionsByParameter={temporalOperatorOptionsByParameter}
          selectedTemporalOperators={resolvedTemporalOperatorsByParameter}
          defaultTemporalOperators={defaultTemporalOperatorsByParameter}
          selectablePeriods={selectablePeriods}
          defaultPeriods={defaultPeriods}
          dateRangeOverride={dateRange}
          getVolumeValuesForRange={getVolumeValuesForRange}
          error={loadError}
          isLoading={isLoading}
          pendingParameters={pendingParameters}
          parameterErrors={parameterErrors}
          seriesOptions={seriesOptions}
          onFiltersChange={handleFiltersChange}
          onDisplayResolutionChange={handleDisplayResolutionChange}
          onParameterOptionsOpen={loadDetailedOptions}
          parameterOptionsLoading={detailsLoading}
          parameterOptionsError={detailsError}
        />
      )}
      {selectedParameters.some(parameter => parameterDefinitionMap.get(parameter)?.readingSeries) && (
        <Typography variant='body2' color='text.secondary'>
          Index du compteur, non répartis entre les exploitations.
        </Typography>
      )}
      {selectedParameters.map(parameter => {
        const count = aggregatedSeriesMap.get(parameter)?.metadata?.excludedReadingsCount
        return count > 0 && <Typography key={parameter} variant='body2' color='text.secondary'>
          {parameterOptions.find(option => option.value === parameter)?.label} : {count} relevé{count > 1 ? 's' : ''} exclu{count > 1 ? 's' : ''} du graphique. Les index reçus restent consultables dans le tableau du compteur sur la fiche exploitation.
        </Typography>
      })}
    </Box>
  ) : (
    <Box className='flex flex-col gap-4'>
      <Box>
        <Typography variant='h5' component={titleComponent}>
          {title}
        </Typography>

        {subtitle && (
          <Typography color='text.secondary' variant='body2'>
            {subtitle}
          </Typography>
        )}
      </Box>

      <Alert
        severity='info'
        description='Aucun prélèvement connu pour cette entité.'
      />
    </Box>
  )
}

export default SeriesExplorer
