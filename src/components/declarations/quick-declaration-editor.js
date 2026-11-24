'use client'

import {useEffect, useMemo, useRef, useState, useSyncExternalStore} from 'react'

import {Alert} from '@codegouvfr/react-dsfr/Alert'
import {Button} from '@codegouvfr/react-dsfr/Button'
import {Select} from '@codegouvfr/react-dsfr/Select'
import {SegmentedControl} from '@codegouvfr/react-dsfr/SegmentedControl'

import {formatDateInput} from '@/lib/date-range.js'
import {formatNumberInput, normalizeNumberInput} from '@/lib/decimal-input.js'
import {withCountingCode} from '@/lib/exploitation-identity.js'
import {
  addQuickEditorRow, buildQuickEditorDraft, createQuickEditorRows, getQuickEditorLabel, getQuickEditorOptions,
  getQuickEditorRowKey, hasQuickEntryChanged, switchQuickRowValue
} from '@/lib/quick-declaration-draft.js'
import {getMyDeclarationURL} from '@/lib/urls.js'

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

function EditorRow({row, original, originalType, measurementType, maxDate, editing, onEdit, onChange, onRemove}) {
  const firstDate = useRef(null)
  const focusRequested = useRef(!original)
  useEffect(() => {
    if (editing && focusRequested.current) {
      firstDate.current?.focus()
      focusRequested.current = false
    }
  }, [editing])

  const changed = hasQuickEntryChanged(original, row, measurementType, originalType)
  const point = withCountingCode(row.pointName || 'Point de prélèvement', row)
  const isIndex = measurementType === 'INDEX'
  const dateFields = isIndex
    ? [['readingDate', 'Date du relevé d’index']]
    : [['periodStartDate', 'Début de période'], ['periodEndDate', 'Fin de période']]

  return (
    <fieldset className='border border-[var(--border-default-grey)] px-4 pb-4'>
      <legend className='px-1 font-bold'>{point}</legend>
      <div className='mb-2 flex flex-wrap items-center gap-3'>
        {(row.compteurName || row.serialNumber) && <span>Compteur {row.compteurName || row.serialNumber}</span>}
        {changed && <span className='fr-badge fr-badge--info fr-badge--no-icon'>{row.removed ? 'Supprimé' : original ? 'Modifié' : 'Ajouté'}</span>}
      </div>

      {editing && !row.removed ? (
        <div className='grid gap-3 md:grid-cols-3'>
          {dateFields.map(([field, label], index) => (
            <label className='fr-label' key={field}>
              {label}
              <input
                ref={index === 0 ? firstDate : undefined}
                className='fr-input' type='date' required max={maxDate} value={row[field]}
                onChange={event => onChange({[field]: event.target.value})}
              />
            </label>
          ))}
          <label className='fr-label'>
            {isIndex ? 'Index (m³)' : 'Volume (m³)'}
            <input className='fr-input' type='text' inputMode='decimal' required value={formatNumberInput(row.value)} onChange={event => onChange({value: normalizeNumberInput(event.target.value)})} />
          </label>
        </div>
      ) : !row.removed && (
        <p className='fr-mb-1w'><RowReading row={row} measurementType={measurementType} /></p>
      )}
      {changed && original && <p className='fr-hint-text fr-mt-1w'>Valeur saisie initialement — <RowReading row={original} measurementType={originalType} /></p>}
      {isIndex && row.previousReading?.date && row.previousReading.value != null && !changed && (
        <p className='fr-hint-text'>Index précédent — {formatNumberInput(row.previousReading.value)} m³ le {formatQuickDate(row.previousReading.date)}</p>
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
        <Button
          size='small' priority='tertiary no outline'
          iconId={row.removed ? 'fr-icon-arrow-go-back-line' : 'fr-icon-delete-line'}
          nativeButtonProps={{'aria-label': original ? `${row.removed ? 'Rétablir' : 'Supprimer'} la saisie de ${point}` : `Annuler l’ajout de ${point}`}}
          onClick={onRemove}
        >
          {row.removed ? 'Rétablir' : original ? 'Supprimer' : 'Annuler l’ajout'}
        </Button>
      </div>
    </fieldset>
  )
}

export default function QuickDeclarationEditor({declaration, returnHref = getMyDeclarationURL(declaration)}) {
  const hydrated = useSyncExternalStore(subscribeToHydration, getClientSnapshot, getServerSnapshot)
  const [rows, setRows] = useState(() => createQuickEditorRows(declaration))
  const [measurementType, setMeasurementType] = useState(declaration.measurementType)
  const [editingIds, setEditingIds] = useState(() => new Set())
  const [selectedExploitation, setSelectedExploitation] = useState('')
  const availableOptions = useMemo(() => getQuickEditorOptions(declaration.availableEntries, rows), [declaration.availableEntries, rows])
  const selectedOption = availableOptions.find(({entry}) => entry.exploitationId === selectedExploitation)
  const maxDate = formatDateInput(new Date())
  const draft = useMemo(
    () => buildQuickEditorDraft(declaration, rows, measurementType, maxDate),
    [declaration, rows, measurementType, maxDate]
  )
  const originalEntries = useMemo(() => new Map(declaration.entries.map(entry => [entry.id, entry])), [declaration.entries])
  const seriesLabels = useMemo(() => Object.fromEntries(rows.map(row => {
    const exploitation = row.exploitationId || row.effectiveExploitationId || row.pointPrelevementId
    const key = row.compteurId ? `${exploitation}/${row.compteurId}` : exploitation
    return [key, getQuickEditorLabel(row)]
  })), [rows])
  const isConverting = measurementType !== declaration.measurementType
  const removedAll = rows.length > 0 && rows.every(row => row.removed)

  function changeType(nextType) {
    if (nextType === measurementType) return
    setRows(previous => previous.map(row => switchQuickRowValue(row, measurementType, nextType)))
    setMeasurementType(nextType)
    setEditingIds(new Set(rows.map(getQuickEditorRowKey)))
  }

  function updateRow(id, changes) {
    setRows(previous => previous.map(row => getQuickEditorRowKey(row) === id ? {...row, ...changes} : row))
  }

  function addSelectedPoint() {
    if (!selectedOption) return
    setRows(previous => addQuickEditorRow(previous, selectedOption))
    setSelectedExploitation('')
    if (selectedOption.restoreId) setEditingIds(previous => new Set([...previous, selectedOption.restoreId]))
  }

  function showUpdatedDeclaration() {
    const url = new URL(returnHref, window.location.origin)
    url.searchParams.set('updated', '1')
    window.location.assign(url.toString())
  }

  if (declaration.entries.length === 0) return <p>Cette déclaration ne contient plus de mesure active.</p>

  return (
    <div>
      <p>Déclaration n°{declaration.code} · saisie le {formatQuickDate(declaration.createdAt?.slice(0, 10))}</p>
      <SegmentedControl
        legend='Type de mesure de la déclaration'
        segments={[['INDEX', 'Relevé d’index'], ['VOLUME', 'Volume']].map(([type, label]) => ({
          label,
          nativeInputProps: {checked: measurementType === type, onChange: () => changeType(type)}
        }))}
      />
      {isConverting && (
        <Alert className='fr-my-2w' severity='info' title='Changement de type pour toute la déclaration'
          description='Les chiffres sont repris pour chaque point. Vérifiez leur valeur et renseignez les dates du nouveau type de mesure.' />
      )}
      <div className='fr-my-3w grid gap-4'>
        {rows.map(row => {
          const key = getQuickEditorRowKey(row)
          return <EditorRow key={key}
            row={row} original={originalEntries.get(row.id)} originalType={declaration.measurementType} measurementType={measurementType} maxDate={maxDate}
            editing={!row.id || editingIds.has(key)}
            onEdit={() => setEditingIds(previous => new Set([...previous, key]))}
            onChange={changes => updateRow(key, changes)}
            onRemove={() => {
              if (row.id) updateRow(key, {removed: !row.removed})
              else setRows(previous => previous.filter(existing => getQuickEditorRowKey(existing) !== key))
            }}
          />
        })}
      </div>
      {declaration.availableEntries?.length > 0 && (
        <div className='fr-mb-3w flex flex-wrap items-end gap-3'>
          <Select label='Point de prélèvement à ajouter' className='fr-mb-0' disabled={!hydrated || !availableOptions.length}
            nativeSelectProps={{value: selectedOption ? selectedExploitation : '', onChange: event => setSelectedExploitation(event.target.value)}}>
            <option value=''>{availableOptions.length ? 'Sélectionner un comptage' : 'Tous les comptages sont déjà dans la déclaration'}</option>
            {availableOptions.map(({entry, restoreId}) => (
              <option key={entry.exploitationId} value={entry.exploitationId}>{getQuickEditorLabel(entry)}{restoreId ? ' (à rétablir)' : ''}</option>
            ))}
          </Select>
          <Button disabled={!selectedOption} priority='secondary' iconId='fr-icon-add-line' onClick={addSelectedPoint}>Ajouter le point</Button>
        </div>
      )}
      {removedAll && <p role='status'>Toutes les lignes seront supprimées de cette déclaration.</p>}
      {draft.errors.length > 0 && <Alert severity='error' className='fr-mb-2w' title='Saisie à compléter' description={<ul>{draft.errors.map(message => <li key={message}>{message}</li>)}</ul>} />}
      <div className='fr-mb-2w'>
        <QuickDeclarationReview
          declarationId={declaration.id}
          seriesLabels={seriesLabels}
          payload={draft.payload}
          submitLabel='Vérifier les modifications'
          reviewEntries={draft.reviewEntries}
          onSaved={showUpdatedDeclaration}
        />
      </div>
      <Button linkProps={{href: returnHref}} priority='secondary'>Annuler</Button>
    </div>
  )
}
