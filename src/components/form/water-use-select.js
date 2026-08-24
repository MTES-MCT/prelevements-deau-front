'use client'

import {
  useCallback, useEffect, useMemo, useState
} from 'react'

import {Alert} from '@codegouvfr/react-dsfr/Alert'
import {Button} from '@codegouvfr/react-dsfr/Button'
import {Select} from '@codegouvfr/react-dsfr/SelectNext'

import ExploitationUsageChips from '@/components/exploitations/exploitation-usage-chips.js'
import GroupedMultiselect from '@/components/ui/GroupedMultiselect/index.js'
import {
  changePrimaryUsage,
  compareExploitationUsages,
  isExclusiveUsage,
  normalizeSecondaryUsageIds
} from '@/lib/exploitation-usages.js'
import {
  getUsageCode,
  getUsageColor,
  getUsageId,
  getUsageLabel
} from '@/lib/water-uses.js'
import {getWaterUsesAction} from '@/server/actions/referentiels.js'

function rootWaterUses(waterUses = []) {
  return waterUses
    .filter(usage => usage?.kind === 'USAGE' && getUsageId(usage))
    .sort(compareExploitationUsages)
}

function formatOptionLabel(usage) {
  return [getUsageCode(usage), getUsageLabel(usage)].filter(Boolean).join(' — ')
}

const WaterUseSelect = ({
  value,
  onChange,
  secondaryValues = [],
  onSecondaryChange = () => {},
  selectedUsages = [],
  label = 'Usage principal *',
  placeholder = 'Sélectionner un usage principal',
  state,
  stateRelatedMessage,
  secondaryState,
  secondaryStateRelatedMessage
}) => {
  const [waterUses, setWaterUses] = useState([])
  const [loadingState, setLoadingState] = useState('loading')
  const [loadError, setLoadError] = useState(null)
  const [retryCount, setRetryCount] = useState(0)
  const [announcement, setAnnouncement] = useState('')

  useEffect(() => {
    let ignore = false

    async function loadWaterUses() {
      setLoadingState('loading')
      setLoadError(null)

      try {
        const result = await getWaterUsesAction()
        const items = result?.data?.items ?? []

        if (ignore) {
          return
        }

        if (!result?.success || !Array.isArray(items) || items.length === 0) {
          setLoadingState('error')
          setLoadError(result?.error || 'Le référentiel ne contient aucun usage disponible.')
          return
        }

        setWaterUses(items)
        setLoadingState('ready')
      } catch (error) {
        if (!ignore) {
          setLoadingState('error')
          setLoadError(error.message || 'Le référentiel des usages ne peut pas être chargé.')
        }
      }
    }

    loadWaterUses()

    return () => {
      ignore = true
    }
  }, [retryCount])

  const usages = useMemo(() => rootWaterUses(waterUses), [waterUses])
  const usagesById = useMemo(() => new Map(
    [...selectedUsages, ...usages]
      .map(usage => [getUsageId(usage), usage])
      .filter(([id]) => id)
  ), [selectedUsages, usages])
  const selectedPrimaryUsage = usagesById.get(value) ?? null
  const normalizedSecondaryValues = useMemo(() => normalizeSecondaryUsageIds({
    usageId: value,
    secondaryUsageIds: secondaryValues,
    waterUses: [...usagesById.values()]
  }), [secondaryValues, usagesById, value])
  const selectedSecondaryUsages = normalizedSecondaryValues
    .map(id => usagesById.get(id))
    .filter(Boolean)
  const hasRealUsage = Boolean(selectedPrimaryUsage && !isExclusiveUsage(selectedPrimaryUsage))
    || selectedSecondaryUsages.some(usage => !isExclusiveUsage(usage))

  const handlePrimaryChange = useCallback(nextUsageId => {
    const transition = changePrimaryUsage({
      usageId: value,
      secondaryUsageIds: normalizedSecondaryValues,
      nextUsageId,
      waterUses: [...usagesById.values()]
    })

    if (transition.blocked) {
      setAnnouncement('Un usage réel ne peut pas être remplacé par « Usage inconnu » ou « Pas d’usage ».')
      return
    }

    const previousUsage = usagesById.get(value)
    const nextUsage = usagesById.get(nextUsageId)

    onChange(transition.usageId)
    onSecondaryChange(transition.secondaryUsageIds)

    if (previousUsage && nextUsage && !isExclusiveUsage(previousUsage) && !isExclusiveUsage(nextUsage)) {
      setAnnouncement(`${getUsageLabel(previousUsage)} est maintenant un usage secondaire.`)
    } else {
      setAnnouncement(`Usage principal remplacé par ${getUsageLabel(nextUsage)}.`)
    }
  }, [normalizedSecondaryValues, onChange, onSecondaryChange, usagesById, value])

  const handleSecondaryChange = useCallback(nextSecondaryIds => {
    onSecondaryChange(normalizeSecondaryUsageIds({
      usageId: value,
      secondaryUsageIds: nextSecondaryIds,
      waterUses: [...usagesById.values()]
    }))
  }, [onSecondaryChange, usagesById, value])

  const primaryOptions = usages.map(usage => ({
    value: getUsageId(usage),
    label: formatOptionLabel(usage),
    disabled: isExclusiveUsage(usage) && hasRealUsage && getUsageId(usage) !== value
  }))
  const secondaryOptions = usages
    .filter(usage => !isExclusiveUsage(usage) && getUsageId(usage) !== value)
    .map(usage => ({
      value: getUsageId(usage),
      label: formatOptionLabel(usage),
      title: formatOptionLabel(usage),
      content: (
        <span className='flex min-w-0 items-center gap-2'>
          <span
            aria-hidden='true'
            className='h-2 w-2 shrink-0 rounded-full'
            style={{backgroundColor: getUsageColor(usage)}}
          />
          <span className='min-w-0 whitespace-normal break-words'>{formatOptionLabel(usage)}</span>
        </span>
      )
    }))
  const selectedExploitation = {
    usage: selectedPrimaryUsage,
    secondaryUsages: selectedSecondaryUsages
  }
  const isLoading = loadingState === 'loading'

  return (
    <div className='flex flex-col gap-4' aria-busy={isLoading}>
      {isLoading && (
        <p className='fr-hint-text fr-mb-0' role='status'>Chargement du référentiel des usages…</p>
      )}

      {loadingState === 'error' && (
        <Alert
          small
          severity='error'
          title='Référentiel des usages indisponible'
          description={(
            <span className='flex flex-col items-start gap-2'>
              <span>{loadError}</span>
              <Button
                priority='secondary'
                size='small'
                onClick={() => setRetryCount(count => count + 1)}
              >
                Réessayer
              </Button>
            </span>
          )}
        />
      )}

      <Select
        disabled={loadingState !== 'ready'}
        label={label}
        options={primaryOptions}
        placeholder={isLoading ? 'Chargement…' : placeholder}
        state={state}
        stateRelatedMessage={stateRelatedMessage}
        nativeSelectProps={{
          value: value || '',
          onChange: event => handlePrimaryChange(event.target.value)
        }}
      />

      <GroupedMultiselect
        disabled={loadingState !== 'ready' || !value || isExclusiveUsage(selectedPrimaryUsage)}
        hint='Ajoutez les autres usages exercés sur cette exploitation. Les choix « Usage inconnu » et « Pas d’usage » sont exclusifs et ne peuvent pas être secondaires.'
        label='Usages secondaires'
        options={[{label: 'Usages disponibles', options: secondaryOptions}]}
        placeholder='Aucun usage secondaire'
        searchable={secondaryOptions.length > 8}
        state={secondaryState}
        stateRelatedMessage={secondaryStateRelatedMessage}
        value={normalizedSecondaryValues}
        onChange={handleSecondaryChange}
      />

      {(selectedPrimaryUsage || selectedSecondaryUsages.length > 0) && (
        <ExploitationUsageChips
          compact
          exploitation={selectedExploitation}
          onRemoveSecondary={usage => handleSecondaryChange(
            normalizedSecondaryValues.filter(id => id !== getUsageId(usage))
          )}
        />
      )}

      <p className='sr-only' aria-live='polite'>{announcement}</p>
    </div>
  )
}

export default WaterUseSelect
