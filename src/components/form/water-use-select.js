'use client'

import {
  useCallback, useEffect, useId, useMemo, useState
} from 'react'

import {Alert} from '@codegouvfr/react-dsfr/Alert'
import {Button} from '@codegouvfr/react-dsfr/Button'

import ExploitationUsageChips from '@/components/exploitations/exploitation-usage-chips.js'
import UsageCombobox from '@/components/form/usage-combobox.js'
import GroupedMultiselect from '@/components/ui/GroupedMultiselect/index.js'
import {
  areExploitationUsagesRelated,
  changePrimaryUsage,
  flattenExploitationWaterUses,
  getExploitationUsageParentId,
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
  const [search, setSearch] = useState(null)
  const primaryId = useId()

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

  const usages = useMemo(() => flattenExploitationWaterUses(waterUses), [waterUses])
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
    const removedChildren = [previousUsage, ...selectedSecondaryUsages]
      .filter(usage => getExploitationUsageParentId(usage) === nextUsageId)

    setSearch(null)
    onChange(transition.usageId)
    onSecondaryChange(transition.secondaryUsageIds)

    if (removedChildren.length > 0) {
      setAnnouncement(`Usage principal remplacé par ${getUsageLabel(nextUsage)}. Sous-usages retirés pour éviter un doublon avec leur parent : ${removedChildren.map(getUsageLabel).join(', ')}.`)
    } else if (transition.secondaryUsageIds.includes(value) && value !== nextUsageId) {
      setAnnouncement(`${getUsageLabel(previousUsage)} est maintenant un usage secondaire.`)
    } else {
      setAnnouncement(`Usage principal remplacé par ${getUsageLabel(nextUsage)}.`)
    }
  }, [normalizedSecondaryValues, onChange, onSecondaryChange, selectedSecondaryUsages, usagesById, value])

  const handleSecondaryChange = useCallback(nextSecondaryIds => {
    onSecondaryChange(normalizeSecondaryUsageIds({
      usageId: value,
      secondaryUsageIds: nextSecondaryIds,
      waterUses: [...usagesById.values()]
    }))
  }, [onSecondaryChange, usagesById, value])

  const primaryOptions = usages.map(usage => {
    const parent = usagesById.get(getExploitationUsageParentId(usage))
    return {
      value: getUsageId(usage),
      code: getUsageCode(usage),
      label: formatOptionLabel(usage),
      color: getUsageColor(usage),
      parentUsage: parent ? {value: getUsageId(parent), code: getUsageCode(parent), label: formatOptionLabel(parent), color: getUsageColor(parent)} : null,
      disabled: isExclusiveUsage(usage) && hasRealUsage && getUsageId(usage) !== value
    }
  })
  const secondaryGroups = new Map()
  for (const usage of usages.filter(usage => !isExclusiveUsage(usage) && getUsageId(usage) !== value)) {
    const parent = usagesById.get(getExploitationUsageParentId(usage))
    const root = parent ?? usage
    const rootId = getUsageId(root)
    if (!secondaryGroups.has(rootId)) secondaryGroups.set(rootId, {label: formatOptionLabel(root), options: []})
    const disabled = !normalizedSecondaryValues.includes(usage.id)
      && [selectedPrimaryUsage, ...selectedSecondaryUsages].some(selected => areExploitationUsagesRelated(selected, usage))
    secondaryGroups.get(rootId).options.push({
      value: getUsageId(usage),
      label: formatOptionLabel(usage),
      title: [parent && formatOptionLabel(parent), formatOptionLabel(usage)].filter(Boolean).join(' : '),
      disabled,
      content: (
        <span className={`flex min-w-0 items-center gap-2${parent ? ' pl-4' : ''}`}>
          <span
            aria-hidden='true'
            className='h-2 w-2 shrink-0 rounded-full'
            style={{backgroundColor: getUsageColor(usage)}}
          />
          <span className='min-w-0 whitespace-normal break-words'>{formatOptionLabel(usage)}</span>
        </span>
      )
    })
  }
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

      <div className={state === 'error' ? 'fr-input-group fr-input-group--error' : 'fr-input-group'}>
        <label className='fr-label fr-mb-1w' htmlFor={primaryId}>{label}</label>
        <UsageCombobox
          id={primaryId}
          disabled={loadingState !== 'ready'}
          invalid={state === 'error'}
          describedBy={stateRelatedMessage ? `${primaryId}-message` : undefined}
          options={primaryOptions}
          placeholder={isLoading ? 'Chargement…' : placeholder}
          selectedValue={value || ''}
          selectOnExactMatch={false}
          value={search ?? (selectedPrimaryUsage ? formatOptionLabel(selectedPrimaryUsage) : '')}
          variant='campaign'
          onBlur={() => setSearch(null)}
          onUsageChange={({usageId, usageSearch}) => {
            setSearch(usageSearch)
            if (usageId && usagesById.has(usageId)) handlePrimaryChange(usageId)
          }}
        />
        {stateRelatedMessage && (
          <p id={`${primaryId}-message`} className={state === 'error' ? 'fr-error-text' : 'fr-info-text'} role={state === 'error' ? 'alert' : undefined}>
            {stateRelatedMessage}
          </p>
        )}
      </div>

      <GroupedMultiselect
        disabled={loadingState !== 'ready' || !value || isExclusiveUsage(selectedPrimaryUsage)}
        hint='Ajoutez les autres usages ou sous-usages exercés sur cette exploitation. Un usage et ses sous-usages ne peuvent pas être associés ensemble. « Usage inconnu » et « Pas d’usage » restent exclusifs.'
        label='Usages secondaires'
        options={[...secondaryGroups.values()]}
        placeholder='Aucun usage secondaire'
        searchable={usages.length > 8}
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
