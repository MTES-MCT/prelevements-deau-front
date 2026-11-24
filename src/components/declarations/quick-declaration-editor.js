'use client'

import {useEffect, useMemo, useRef, useState, useSyncExternalStore} from 'react'

import {Alert} from '@codegouvfr/react-dsfr/Alert'
import {Button} from '@codegouvfr/react-dsfr/Button'
import {SegmentedControl} from '@codegouvfr/react-dsfr/SegmentedControl'

import DateRangePicker from '@/components/ui/date-range-picker.js'
import {formatDateInput} from '@/lib/date-range.js'
import {formatNumberInput, normalizeNumberInput} from '@/lib/decimal-input.js'
import {withCountingCode} from '@/lib/exploitation-identity.js'
import {
  buildQuickEditorDraft, createQuickEditorRows, getQuickEditorInitialDates, getQuickEditorLabel, getQuickEditorMapPoints,
  getQuickEditorRowKey, getQuickMeasureBadge, getQuickMeasurementDates, hasQuickEditorMeasure, hasQuickEntryChanged, switchQuickRowValue
} from '@/lib/quick-declaration-draft.js'
import {getMyDeclarationURL} from '@/lib/urls.js'

import QuickDeclarationMapPanel, {QuickDeclarationLayout} from './quick-declaration-map-panel.js'
import QuickDeclarationReview, {formatQuickDate} from './quick-declaration-review.js'

const subscribeToHydration = () => () => {}
const getClientSnapshot = () => true
const getServerSnapshot = () => false

function RowReading({row, measurementType}) {
  const dates = measurementType === 'INDEX'
    ? `le ${formatQuickDate(row.readingDate)}`
    : `du ${formatQuickDate(row.periodStartDate)} au ${formatQuickDate(row.periodEndDate)}`
  return <>{formatNumberInput(row.value)} m³ {dates}</>
}

function EditorRow({row, original, originalType, measurementType, dates, showOriginalDates, editing, hydrated,
  highlighted, onFocusPoint, onHoverPoint, onLocate, onEdit, onChange, onRemove}) {
  const valueInput = useRef(null)
  const focusRequested = useRef(false)
  useEffect(() => {
    if (editing && focusRequested.current) {
      valueInput.current?.focus()
      focusRequested.current = false
    }
  }, [editing])

  const changed = hasQuickEntryChanged(original, row, measurementType, originalType, dates)
  const point = withCountingCode(row.pointName || 'Point de prélèvement', row)
  const isIndex = measurementType === 'INDEX'
  const hasMeasure = hasQuickEditorMeasure(row)
  const removed = original && !hasMeasure
  const badge = getQuickMeasureBadge(original, row, measurementType, originalType)
  const showInitial = original && (showOriginalDates || badge)

  return (
    <fieldset tabIndex={-1} data-point-id={row.pointPrelevementId} data-map-highlighted={highlighted}
      className={`scroll-mt-4 border px-4 pb-4 ${highlighted ? 'border-[var(--border-action-high-blue-france)] bg-[var(--background-alt-blue-france)]' : 'border-[var(--border-default-grey)]'}`}
      onMouseEnter={() => onHoverPoint(row.pointPrelevementId)} onMouseLeave={() => onHoverPoint(null)} onFocus={() => onFocusPoint(row.pointPrelevementId)}>
      <legend className='px-1 font-bold'>{point}</legend>
      <div className='mb-2 flex flex-wrap items-center gap-3'>
        {(row.compteurName || row.serialNumber) && <span>Compteur {row.compteurName || row.serialNumber}</span>}
        {badge && <span className='fr-badge fr-badge--info fr-badge--no-icon'>{badge}</span>}
      </div>

      {editing && !row.removed ? (
        <label className='fr-label max-w-xs'>
          {isIndex ? 'Index (m³)' : 'Volume (m³)'}
          <input ref={valueInput} className='fr-input' type='text' inputMode='decimal' disabled={!hydrated} value={formatNumberInput(row.value)} onChange={event => onChange({value: normalizeNumberInput(event.target.value)})} />
        </label>
      ) : !row.removed && (
        <p className='fr-mb-1w'>{formatNumberInput(row.value)} m³</p>
      )}
      {showInitial && <p className='fr-hint-text fr-mt-1w'>Saisie initiale · {showOriginalDates || removed ? <RowReading row={original} measurementType={originalType} /> : <>{formatNumberInput(original.value)} m³</>}</p>}
      {isIndex && row.previousReading?.date && row.previousReading.value != null && !changed && (
        <p className='fr-hint-text'>Index précédent · {formatNumberInput(row.previousReading.value)} m³ le {formatQuickDate(row.previousReading.date)}</p>
      )}
      <div className='fr-mt-2w flex flex-wrap items-center gap-2'>
        {!editing && !row.removed && (
          <Button
            size='small' priority='tertiary no outline' iconId='fr-icon-edit-line'
            nativeButtonProps={{'aria-label': `Modifier la saisie de ${point}`}}
            onClick={() => {
              focusRequested.current = true
              onEdit()
            }}
          >
            Modifier
          </Button>
        )}
        {(original || hasMeasure) && <Button
          size='small' priority='tertiary no outline'
          iconId={removed ? 'fr-icon-arrow-go-back-line' : 'fr-icon-delete-line'}
          nativeButtonProps={{'aria-label': `${removed ? 'Rétablir' : original ? 'Supprimer' : 'Effacer'} la saisie de ${point}`}}
          onClick={onRemove}
        >
          {removed ? 'Rétablir' : original ? 'Supprimer' : 'Effacer'}
        </Button>}
        {onLocate && <Button size='small' priority='tertiary no outline' iconId='fr-icon-focus-3-line'
          nativeButtonProps={{'aria-label': `Localiser ${point} sur la carte`}} onClick={onLocate}>Localiser sur la carte</Button>}
      </div>
    </fieldset>
  )
}

export default function QuickDeclarationEditor({declaration, returnHref = getMyDeclarationURL(declaration)}) {
  const hydrated = useSyncExternalStore(subscribeToHydration, getClientSnapshot, getServerSnapshot)
  const [rows, setRows] = useState(() => createQuickEditorRows(declaration))
  const [measurementType, setMeasurementType] = useState(declaration.measurementType)
  const initial = useMemo(() => getQuickEditorInitialDates(declaration), [declaration])
  const [draftDates, setDraftDates] = useState(initial.dates)
  const dates = getQuickMeasurementDates(measurementType, draftDates)
  const [editingIds, setEditingIds] = useState(() => new Set())
  const mapPoints = useMemo(() => getQuickEditorMapPoints(declaration), [declaration])
  const locatedIds = useMemo(() => new Set(mapPoints.filter(point => point.coordinates).map(point => point.pointPrelevementId)), [mapPoints])
  const selectedPointIds = useMemo(() => [...new Set(rows.filter(hasQuickEditorMeasure).map(row => row.pointPrelevementId))], [rows])
  const declaredPointIds = useMemo(() => [...new Set(declaration.entries.map(row => row.pointPrelevementId))], [declaration.entries])
  const [activePointId, setActivePointId] = useState(null)
  const [hoveredPointId, setHoveredPointId] = useState(null)
  const [focusRequestId, setFocusRequestId] = useState(0)
  const rowList = useRef(null)
  const maxDate = formatDateInput(new Date())
  const draft = useMemo(
    () => buildQuickEditorDraft(declaration, rows, measurementType, draftDates, maxDate),
    [declaration, rows, measurementType, draftDates, maxDate]
  )
  const originalEntries = useMemo(() => new Map(declaration.entries.map(entry => [entry.id, entry])), [declaration.entries])
  const seriesLabels = useMemo(() => Object.fromEntries(rows.map(row => {
    const exploitation = row.exploitationId || row.effectiveExploitationId || row.pointPrelevementId
    const key = row.compteurId ? `${exploitation}/${row.compteurId}` : exploitation
    return [key, getQuickEditorLabel(row)]
  })), [rows])
  const isConverting = measurementType !== declaration.measurementType
  const removedAll = selectedPointIds.length === 0
  const needsCommonDate = initial.requiresDateSelection && !isConverting && !removedAll && Object.values(dates).some(value => !value)
  const dateHint = measurementType === 'INDEX'
    ? needsCommonDate ? 'Les relevés initiaux ont des dates différentes. Choisissez la date commune à tous les points.' : 'Cette date s’applique à tous les relevés de la déclaration.'
    : needsCommonDate ? 'Les volumes initiaux couvrent des périodes différentes. Choisissez la période commune à tous les points.' : 'Cette période s’applique à tous les volumes de la déclaration.'

  function changeType(nextType) {
    if (nextType === measurementType) return
    setRows(previous => previous.map(row => switchQuickRowValue(row, measurementType, nextType)))
    setMeasurementType(nextType)
    setEditingIds(new Set(rows.map(getQuickEditorRowKey)))
  }

  function updateRow(id, changes) {
    setRows(previous => previous.map(row => getQuickEditorRowKey(row) === id ? {...row, ...changes} : row))
  }

  function locatePoint(pointId) {
    setActivePointId(pointId)
    setFocusRequestId(previous => previous + 1)
  }

  function focusFromMap(pointId) {
    locatePoint(pointId)
    const fieldsets = [...rowList.current.querySelectorAll('fieldset[data-point-id]')].filter(node => node.dataset.pointId === pointId)
    // A marker can represent several countings. Highlight them all without choosing one for the user.
    if (fieldsets.length === 1) fieldsets[0].focus({preventScroll: true})
  }

  function showUpdatedDeclaration() {
    const url = new URL(returnHref, window.location.origin)
    url.searchParams.set('updated', '1')
    window.location.assign(url.toString())
  }

  if (declaration.entries.length === 0) return <p>Cette déclaration ne contient plus de mesure active.</p>

  return (
    <QuickDeclarationLayout
      toolbar={(
        <>
          <p>Déclaration n°{declaration.code} · saisie le {formatQuickDate(declaration.createdAt?.slice(0, 10))}</p>
          <div className='border border-gray-200 bg-white p-3 shadow-xs md:p-4'>
            <SegmentedControl className='quick-declaration-measurement-segmented'
              legend='Type de mesure de la déclaration'
              segments={[['INDEX', 'Relevé d’index'], ['VOLUME', 'Volume']].map(([type, label]) => ({
                label,
                nativeInputProps: {checked: measurementType === type, onChange: () => changeType(type)}
              }))}
            />
            {isConverting && (
              <Alert className='fr-my-2w' severity='info' title='Changement de type pour toute la déclaration'
                description='Les chiffres sont repris pour chaque point. Vérifiez les valeurs et choisissez la date ou la période commune.' />
            )}
            <div className='fr-mt-2w max-w-sm'>
              {measurementType === 'INDEX' ? (
                <div className='fr-input-group fr-mb-0'>
                  <label className='fr-label' htmlFor='quick-reading-date'>Date du relevé d’index</label>
                  <input id='quick-reading-date' className='fr-input' type='date' required aria-describedby='quick-reading-date-hint' disabled={!hydrated || removedAll}
                    max={maxDate} value={draftDates.readingDate} onChange={event => {
                      const readingDate = event.target.value
                      setDraftDates(previous => ({...previous, readingDate}))
                    }} />
                  <p id='quick-reading-date-hint' className='fr-hint-text fr-mt-1v'>{dateHint}</p>
                </div>
              ) : (
                <DateRangePicker startDate={draftDates.periodStartDate} endDate={draftDates.periodEndDate} maxDate={maxDate} hint={dateHint} disabled={!hydrated || removedAll}
                  onChange={({startDate, endDate}) => setDraftDates(previous => ({...previous, periodStartDate: startDate, periodEndDate: endDate}))} />
              )}
            </div>
          </div>
        </>
      )}
      map={(
        <QuickDeclarationMapPanel fitAllInitially points={mapPoints} activePointId={activePointId} hoveredPointId={hoveredPointId}
          selectedPointIds={selectedPointIds} declaredPointIds={declaredPointIds} focusRequestId={focusRequestId}
          onHoverPoint={setHoveredPointId} onFocusPoint={focusFromMap} />
      )}
    >
      <div ref={rowList} className='fr-my-3w grid gap-4'>
        {rows.map(row => {
          const key = getQuickEditorRowKey(row)
          return <EditorRow key={key}
            row={row} original={originalEntries.get(row.id)} originalType={declaration.measurementType} measurementType={measurementType}
            dates={dates} showOriginalDates={initial.requiresDateSelection} hydrated={hydrated}
            highlighted={row.pointPrelevementId === hoveredPointId || row.pointPrelevementId === activePointId}
            onHoverPoint={setHoveredPointId} onFocusPoint={setActivePointId}
            onLocate={locatedIds.has(row.pointPrelevementId) ? () => locatePoint(row.pointPrelevementId) : null}
            editing={!row.id || editingIds.has(key)}
            onEdit={() => setEditingIds(previous => new Set([...previous, key]))}
            onChange={changes => updateRow(key, changes)}
            onRemove={() => {
              if (!row.id) updateRow(key, {value: '', valueDrafts: {}})
              else if (hasQuickEditorMeasure(row)) updateRow(key, {removed: true})
              else updateRow(key, {removed: false, value: row.value || String(originalEntries.get(row.id).value)})
            }}
          />
        })}
      </div>
      {removedAll && <p role='status'>Toutes les mesures seront retirées de cette déclaration.</p>}
      {draft.errors.length > 0 && <Alert severity='error' className='fr-mb-2w' title='Saisie à compléter' description={<ul>{draft.errors.map(message => <li key={message}>{message}</li>)}</ul>} />}
      <div className='fr-mb-2w'>
        <QuickDeclarationReview
          declarationId={declaration.id}
          seriesLabels={seriesLabels}
          payload={draft.payload}
          submitLabel='Vérifier les modifications'
          reviewEntries={draft.reviewEntries}
          originalDates={{type: declaration.measurementType, ...getQuickMeasurementDates(declaration.measurementType, initial.dates)}}
          onSaved={showUpdatedDeclaration}
        />
      </div>
      <Button linkProps={{href: returnHref}} priority='secondary'>Annuler</Button>
    </QuickDeclarationLayout>
  )
}
