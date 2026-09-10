'use client'

import {
  useEffect, useId, useRef, useState
} from 'react'

import styles from './campaign-meter-events.module.css'

import {CampaignField} from '@/components/campaigns/campaign-ui.js'
import {campaignMeterEventIssues, validateCampaignMeterEvent} from '@/lib/campaign-meter-event-validation.js'
import {campaignHasUnreferencedMeter} from '@/lib/campaign-response-readings.js'
import {
  campaignDate, campaignEditableTargets, campaignMeterName, campaignPointName, decimalInput
} from '@/lib/collection-campaigns.js'

const emptyEvent = {
  type: '', targetId: '', at: '', previousCompteurId: '', nextCompteurId: '', previousIndex: '', nextIndex: '', reason: '', serialNumber: '', identifier: ''
}
const newMeterValue = '__new_meter__'
const unreferencedMeterValue = '__unreferenced_meter__'
const unreferencedMeterLabel = 'Compteur non identifié'
const eventTypes = [
  {
    type: 'REPLACEMENT', label: 'Compteur remplacé', icon: 'fr-icon-arrow-right-line', color: styles.replacement
  },
  {
    type: 'RESET', label: 'Compteur remis à zéro', icon: 'fr-icon-refresh-line', color: styles.reset
  }
]
const meterOptions = meters => [{value: '', label: 'Choisir un compteur'}, ...meters.map(meter => ({value: meter.compteurId, label: campaignMeterName(meter)}))]
const indexFormatter = new Intl.NumberFormat('fr-FR', {maximumFractionDigits: 4})
const indexLabel = value => value === null || value === undefined || value === '' ? 'Index inconnu' : `${indexFormatter.format(value)} m³`
const sameEvent = (left, right) => Boolean(left && right && left.targetId === right.targetId && left.at === right.at && left.previousCompteurId === right.previousCompteurId)
const sameReading = (left, right) => left.targetId === right.targetId && left.compteurId === right.compteurId && left.readingDate === right.readingDate

function removalDraft(draft, event, target, candidate = event) {
  const events = draft.meterEvents || []
  const pending = event?.nextMeter && target?.meters?.find(meter => meter.pending && meter.pendingEvent?.previousCompteurId === event.previousCompteurId && meter.pendingEvent?.at === event.at)
  const readings = pending ? (draft.readings || []).filter(reading => reading.targetId === target.id && reading.compteurId === pending.compteurId) : []
  if (pending && events.some(item => !sameEvent(item, event) && !sameEvent(item, candidate) && item.targetId === target.id && [item.previousCompteurId, item.nextCompteurId].includes(pending.compteurId))) {
    return {blocked: 'Supprimez d’abord le changement suivant qui utilise ce compteur.'}
  }

  const collision = readings.find(reading => (draft.readings || []).some(candidate => sameReading(candidate, {...reading, compteurId: event.previousCompteurId})))
  if (collision) {
    return {blocked: `Deux relevés existent au ${campaignDate(collision.readingDate)}. Vérifiez-les avant de supprimer ce changement.`}
  }

  const previousMeters = target?.meters?.filter(meter => meter.compteurId === event.previousCompteurId) || []
  const outside = event.previousCompteurId === null ? null : readings.find(reading => !previousMeters.some(meter =>
    (!meter.startDate || reading.readingDate.slice(0, 10) >= meter.startDate.slice(0, 10))
    && (!meter.endDate || reading.readingDate.slice(0, 10) <= meter.endDate.slice(0, 10))))
  if (outside) {
    return {blocked: `Le compteur précédent n’était pas en service au ${campaignDate(outside.readingDate)}. Vérifiez ce relevé avant de supprimer le changement.`}
  }

  return {
    draft: {
      ...draft, meterEvents: events.filter(item => !sameEvent(item, event) && !sameEvent(item, candidate)),
      readings: (draft.readings || []).map(reading => pending && reading.targetId === target.id && reading.compteurId === pending.compteurId ? {...reading, compteurId: event.previousCompteurId} : reading)
    }
  }
}

function restoreAttempt(draft, attempt) {
  const events = draft.meterEvents || []
  const position = events.findIndex(item => sameEvent(item, attempt.candidate) || sameEvent(item, attempt.original))
  const restoredEvents = events.filter(item => !sameEvent(item, attempt.candidate) && !sameEvent(item, attempt.original))
  if (attempt.original) {
    const originalPosition = attempt.before.meterEvents.findIndex(item => sameEvent(item, attempt.original))
    restoredEvents.splice(position >= 0 ? position : originalPosition, 0, attempt.original)
  }

  const changedReadings = (attempt.before.readings || []).flatMap((reading, index) => {
    const next = attempt.next.readings?.[index]
    return next && reading.compteurId !== next.compteurId && reading.targetId === next.targetId && reading.readingDate === next.readingDate ? [{before: reading, next}] : []
  })
  const readings = (draft.readings || []).map(reading => {
    const change = changedReadings.find(change => sameReading(reading, change.next))
    if (!change) {
      return reading
    }

    if (draft.readings.some(candidate => candidate !== reading && sameReading(candidate, change.before))) {
      throw new Error('Deux relevés existent à la même date. Vérifiez-les avant d’annuler.')
    }

    return {...reading, compteurId: change.before.compteurId}
  })
  return {...draft, meterEvents: restoredEvents, readings}
}

function formEvent(event) {
  const {serialNumber, identifier, nextCompteurId, ...values} = event
  return {
    ...values, reason: event.reason.trim(), ...(event.type === 'REPLACEMENT' && nextCompteurId === newMeterValue
      ? {nextMeter: {...(serialNumber.trim() ? {serialNumber: serialNumber.trim()} : {}), ...(identifier.trim() ? {identifier: identifier.trim()} : {})}}
      : {nextCompteurId: event.type === 'RESET' ? event.previousCompteurId : nextCompteurId})
  }
}

const EventIndex = ({side, event, error, disabled, onChange}) => {
  const before = side === 'previous'
  const field = `${side}Index`
  return (
    <div className={styles.index}>
      <CampaignField
        label={`${before ? 'Dernier' : 'Premier'} index (m³)`}
        inputMode='decimal'
        disabled={disabled || event[field] === null}
        value={event[field] ?? ''}
        error={error}
        onChange={value => onChange(field, decimalInput(value))}
      />
      <label className={styles.unknown}>
        <input type='checkbox' disabled={disabled} checked={event[field] === null} onChange={change => onChange(field, change.target.checked ? null : '')} />
        Index {before ? 'avant' : 'après'} inconnu
      </label>
    </div>
  )
}

const SavedEvent = ({event, target, canEdit, disabled, deleting, messages, removal, editButtonRef, onEdit, onDelete}) => {
  const id = useId()
  const type = eventTypes.find(type => type.type === event.type)
  const previous = event.previousCompteurId === null ? {identifier: unreferencedMeterLabel} : target?.meters?.find(meter => meter.compteurId === event.previousCompteurId)
  const next = event.nextMeter || target?.meters?.find(meter => meter.compteurId === event.nextCompteurId)
  return (
    <li className={`${styles.saved}${messages.length > 0 ? ` ${styles.invalid}` : ''}`} aria-busy={deleting} aria-label={`${type?.label || 'Changement de compteur'} du ${campaignDate(event.at)}`}>
      <div className={styles.savedHeading}>
        <div>
          <span className={`${styles.badge} ${type?.color || ''}`}>{type?.label || 'Changement de compteur'}</span>
          <p className={styles.date}>Le {campaignDate(event.at)}</p>
        </div>
        {canEdit && <div className={styles.savedActions}>
          <button ref={editButtonRef} type='button' className='fr-btn fr-btn--tertiary-no-outline fr-btn--sm' aria-label={`Modifier le changement du ${campaignDate(event.at)}`} disabled={disabled.edit} onClick={onEdit}>Modifier</button>
          <button type='button' className={`${styles.deleteAction} fr-btn fr-btn--tertiary-no-outline fr-btn--sm`} aria-label={`Supprimer le changement du ${campaignDate(event.at)}`} aria-describedby={removal.blocked ? `${id}-removal` : undefined} disabled={disabled.delete || Boolean(removal.blocked)} onClick={onDelete}>{deleting ? 'Suppression…' : 'Supprimer'}</button>
        </div>}
      </div>
      <div className={styles.savedIndexes}>
        <div><span>Avant · {previous ? campaignMeterName(previous) : 'Compteur'}</span><strong>{indexLabel(event.previousIndex)}</strong></div>
        <span className={`${styles.arrow} fr-icon-arrow-right-line`} aria-hidden='true' />
        <div><span>Après · {next ? campaignMeterName(next) : (previous ? campaignMeterName(previous) : 'Compteur')}</span><strong>{indexLabel(event.nextIndex)}</strong></div>
      </div>
      <p className={styles.reason}>{event.reason}</p>
      {messages.length > 0 && <div role='alert' className={styles.cardErrors}>{messages.map(message => <p key={message} className='fr-error-text'>{message}</p>)}</div>}
      {canEdit && removal.blocked && <p id={`${id}-removal`} className={styles.draftHint}>{removal.blocked}</p>}
    </li>
  )
}

const CampaignMeterEvents = ({context, target: point, compteurId, draft, disabled, issues = [], recoveredEditor, onRecoveryChange, onChange, onPendingChange, onSaveMeterEvent}) => {
  const [open, setOpen] = useState(false)
  const [event, setEvent] = useState({...emptyEvent})
  const [editing, setEditing] = useState(null)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [feedback, setFeedback] = useState('')
  const [errors, setErrors] = useState({})
  const [touched, setTouched] = useState({})
  const [attempted, setAttempted] = useState(false)
  const [deleting, setDeleting] = useState(null)
  const [deletionError, setDeletionError] = useState(null)
  const id = useId()
  const triggerRef = useRef(null)
  const editButtonRef = useRef(null)
  const returnToEvent = useRef(null)
  const headingRef = useRef(null)
  const mountedRef = useRef(false)
  const savingRef = useRef(false)
  const lastAttempt = useRef(null)
  const editingPosition = useRef(0)
  const deletionPosition = useRef(0)
  const draftRef = useRef(draft)
  const recoveryApplied = useRef(false)
  draftRef.current = draft
  const editableIds = new Set(campaignEditableTargets(context, 'INDEX'))
  const target = context.targets.find(target => target.id === point?.id)
  const canEdit = !disabled && Boolean(target) && editableIds.has(target.id)
  const canEditRef = useRef(canEdit)
  canEditRef.current = canEdit
  const meters = target?.meters || []
  const selectedMeter = meters.find(meter => meter.compteurId === event.previousCompteurId)
  const events = draft.meterEvents || []
  const targetEvents = events.filter(item => item.targetId === target?.id)
  const hasUnreferencedMeter = Boolean(target && campaignHasUnreferencedMeter(target))
  const dates = (context.campaign.indexDates || []).map(date => date.slice(0, 10)).sort()
  const replacement = event.type === 'REPLACEMENT'
  const creatingMeter = replacement && event.nextCompteurId === newMeterValue
  const currentEditing = editing && events.find(item => sameEvent(item, editing) || sameEvent(item, lastAttempt.current?.candidate))
  const removal = editing ? removalDraft(draft, editing, target, currentEditing || editing) : null
  const retainedDeletion = deleting || deletionError?.event
  const displayedEvents = targetEvents.filter(item => editing || !sameEvent(item, lastAttempt.current?.candidate))
  if (retainedDeletion && !targetEvents.some(item => sameEvent(item, retainedDeletion))) {
    displayedEvents.splice(deletionPosition.current, 0, retainedDeletion)
  }

  if (editing && !displayedEvents.some(item => sameEvent(item, editing) || sameEvent(item, lastAttempt.current?.candidate))) {
    displayedEvents.splice(editingPosition.current, 0, editing)
  }

  const availableMeters = [...new Map(meters.filter(meter => meter.compteurId !== event.previousCompteurId
    && !(editing && meter.pending && sameEvent({...meter.pendingEvent, targetId: target.id}, editing))).map(meter => [meter.compteurId, meter])).values()]
  const otherEvents = events.filter(item => !sameEvent(item, editing) && !sameEvent(item, lastAttempt.current?.candidate))
  const editorValidation = event.type ? validateCampaignMeterEvent({
    event: formEvent(event), context, target, draft: {...draft, meterEvents: otherEvents}, originalEvent: editing
  }) : {fieldErrors: {}}
  const displayErrors = {...errors, ...Object.fromEntries(Object.entries(editorValidation.fieldErrors).filter(([field]) => editing || attempted || touched[field] || (field === 'at' && event.at)))}
  useEffect(() => {
    if (recoveredEditor && canEdit && !recoveryApplied.current) {
      recoveryApplied.current = true
      setEvent(recoveredEditor.event)
      setEditing(recoveredEditor.editing)
      lastAttempt.current = recoveredEditor.lastAttempt
      editingPosition.current = recoveredEditor.editingPosition || 0
      setOpen(true)
    }
  }, [recoveredEditor, canEdit])
  useEffect(() => {
    // Keep unfinished editor fields separately: they must not become a saved
    // event merely because the user traverses the browser history.
    if (open && canEdit) {
      onRecoveryChange?.({
        event, editing, lastAttempt: lastAttempt.current, editingPosition: editingPosition.current
      })
    }
  }, [open, canEdit, event, editing, saving, onRecoveryChange])
  useEffect(() => {
    onPendingChange?.(open && canEdit)
    return () => onPendingChange?.(false)
  }, [open, canEdit, onPendingChange])
  useEffect(() => {
    if (mountedRef.current) {
      if (open) {
        headingRef.current?.focus({preventScroll: true})
      } else {
        (editButtonRef.current || triggerRef.current)?.focus({preventScroll: true})
      }
    }

    mountedRef.current = true
  }, [open])
  if (!target || (!canEdit && targetEvents.length === 0 && !open)) {
    return null
  }

  const update = (field, value) => {
    if (!canEditRef.current || savingRef.current) {
      return
    }

    setEvent(previous => ({...previous, [field]: value}))
    setTouched(previous => ({...previous, [field]: true}))
    setErrors({})
  }

  const chooseType = type => {
    if (!canEditRef.current || savingRef.current) {
      return
    }

    const previousCompteurId = [event.previousCompteurId, compteurId].find(id => meters.some(meter => meter.compteurId === id)) ?? (hasUnreferencedMeter ? null : (meters.length === 1 ? meters[0].compteurId : ''))
    setEvent({
      ...emptyEvent, type, at: event.at, targetId: target.id, previousCompteurId, nextCompteurId: type === 'REPLACEMENT' && (meters.length <= 1 || previousCompteurId === null) ? newMeterValue : ''
    })
    setErrors({})
    setTouched({})
    setAttempted(false)
  }

  const closeEditor = () => {
    onRecoveryChange?.(null)
    setEvent({...emptyEvent})
    setEditing(null)
    setErrors({})
    setTouched({})
    setAttempted(false)
    setSaveError('')
    setOpen(false)
    lastAttempt.current = null
  }

  const cancel = () => {
    if (savingRef.current || !canEditRef.current) {
      return
    }

    try {
      if (lastAttempt.current) {
        onChange(restoreAttempt(draftRef.current, lastAttempt.current))
      }

      closeEditor()
    } catch (error) {
      setSaveError(error.message)
    }
  }

  const editEvent = item => {
    if (!canEditRef.current || savingRef.current || open) {
      return
    }

    const {nextMeter, ...values} = item
    returnToEvent.current = item
    editingPosition.current = targetEvents.findIndex(event => sameEvent(event, item))
    setEditing(structuredClone(item))
    setEvent({
      ...emptyEvent, ...values, nextCompteurId: nextMeter ? newMeterValue : (item.nextCompteurId ?? ''), serialNumber: nextMeter?.serialNumber || '', identifier: nextMeter?.identifier || ''
    })
    setErrors({})
    setTouched({})
    setAttempted(false)
    setSaveError('')
    setFeedback('')
    setDeletionError(previous => sameEvent(previous?.event, item) ? null : previous)
    lastAttempt.current = null
    setOpen(true)
  }

  const saveChanges = (nextDraft, candidate, message) => {
    if (!canEditRef.current || savingRef.current) {
      return
    }

    const before = lastAttempt.current?.before || structuredClone(draftRef.current)
    lastAttempt.current = {
      before, next: structuredClone(nextDraft), candidate, original: editing
    }
    savingRef.current = true
    setSaving(true)
    setSaveError('')
    setFeedback('')
    const success = () => {
      if (editing) {
        returnToEvent.current = candidate
      }

      closeEditor()
      setFeedback(message)
    }

    const failure = error => {
      setSaveError(error.message || 'L’enregistrement a échoué. Réessayez.')
      const issues = error.details?.data?.issues ?? error.details?.issues ?? []
      const matching = issues.filter(issue => candidate && issue.targetId === candidate.targetId && issue.at === candidate.at
        && (issue.compteurId === undefined || issue.compteurId === candidate.previousCompteurId) && issue.field && issue.message)
      setErrors(Object.fromEntries(matching.map(issue => [issue.field, issue.message])))
    }

    const finish = () => {
      savingRef.current = false
      setSaving(false)
    }

    let deferred = false
    try {
      if (typeof onSaveMeterEvent !== 'function') {
        throw new TypeError('L’enregistrement est indisponible. Rechargez la page.')
      }

      const result = onSaveMeterEvent(nextDraft)
      if (result?.then) {
        deferred = true
        return (async () => {
          try {
            await result
            success()
          } catch (error) {
            failure(error)
          } finally {
            finish()
          }
        })()
      }

      success()
    } catch (error) {
      failure(error)
    } finally {
      // A promise releases the lock only after the server has replied.
      if (!deferred) {
        finish()
      }
    }
  }

  const addEvent = () => {
    if (!canEditRef.current || savingRef.current || !eventTypes.some(type => type.type === event.type)) {
      return
    }

    const others = events.filter(item => !sameEvent(item, editing) && !sameEvent(item, lastAttempt.current?.candidate))
    const nextErrors = editorValidation.fieldErrors
    setAttempted(true)
    setErrors({})
    if (Object.keys(nextErrors).length > 0) {
      return
    }

    const followingReadings = replacement && event.previousCompteurId === null
      ? (draft.readings || []).filter(reading => reading.targetId === target.id && reading.compteurId === null && reading.readingDate.slice(0, 10) > event.at)
      : []
    if (followingReadings.some(reading => (draft.readings || []).some(candidate => candidate.targetId === target.id && candidate.compteurId === event.nextCompteurId && candidate.readingDate.slice(0, 10) === reading.readingDate.slice(0, 10)))) {
      setErrors({...nextErrors, nextCompteurId: 'Un relevé existe déjà pour ce nouveau compteur à la même date. Vérifiez les relevés avant d’ajouter ce remplacement.'})
      return
    }

    const candidate = {
      ...formEvent(event),
      ...(followingReadings.length > 0 ? {reassignFollowingReadings: true} : {}),
      ...(editing ? {previousEvent: {at: editing.at, previousCompteurId: editing.previousCompteurId, ...(editing.nextMeter ? {nextMeter: editing.nextMeter} : {})}} : {})
    }
    const position = events.findIndex(item => sameEvent(item, editing) || sameEvent(item, lastAttempt.current?.candidate))
    const meterEvents = [...others]
    meterEvents.splice(position >= 0 ? position : meterEvents.length, 0, candidate)
    return saveChanges({...draft, meterEvents}, candidate, 'Brouillon enregistré.')
  }

  const deleteEvent = () => {
    if (!canEditRef.current || savingRef.current || !editing || removal.blocked) {
      return
    }

    return saveChanges(removal.draft, null, 'Changement supprimé.')
  }

  const deleteSavedEvent = async item => {
    if (!canEditRef.current || savingRef.current) {
      return
    }

    const before = structuredClone(draftRef.current)
    const removal = removalDraft(before, item, target)
    if (removal.blocked) {
      return
    }

    const attempt = {
      before, next: removal.draft, candidate: null, original: item
    }
    deletionPosition.current = targetEvents.findIndex(event => sameEvent(event, item))
    savingRef.current = true
    setSaving(true)
    setDeleting(item)
    setDeletionError(null)
    setFeedback('')
    try {
      await onSaveMeterEvent(removal.draft)
      setFeedback('Changement supprimé.')
    } catch (error) {
      setDeletionError({event: item, message: error.message || 'La suppression a échoué. Réessayez.'})
      // Restaurer seulement l’événement supprimé, jamais les autres saisies.
      try {
        onChange(restoreAttempt(draftRef.current, attempt))
      } catch (restoreError) {
        setDeletionError({event: item, message: restoreError.message})
      }
    } finally {
      savingRef.current = false
      setSaving(false)
      setDeleting(null)
    }
  }

  const editor = open && <div id={`${id}-panel`} className={styles.expanded} aria-busy={saving}>
    <div className={styles.heading}>
      <h3 ref={headingRef} tabIndex={-1}>{editing ? `Modifier le changement du ${campaignDate(editing.at)}` : (displayedEvents.length > 0 ? 'Autre changement de compteur' : 'Changement de compteur')}</h3>
    </div>
    <fieldset className={styles.formFields} disabled={saving || !canEdit}>
      <div className={styles.choices} role='group' aria-label='Que s’est-il passé ?' aria-describedby={displayErrors.type ? `${id}-type-error` : undefined}>
        {eventTypes.map(type => (
          <button key={type.type} type='button' aria-pressed={event.type === type.type} aria-controls={`${id}-editor`} className={`${styles.choice} ${event.type === type.type ? styles.selected : ''}`} onClick={() => {
            if (event.type !== type.type) {
              chooseType(type.type)
            }
          }}
          >
            <span className={`${styles.choiceIcon} ${type.icon}`} aria-hidden='true' />
            <strong>{type.label}</strong>
            <span className={`${styles.check} ${event.type === type.type ? 'fr-icon-check-line' : ''}`} aria-hidden='true' />
          </button>
        ))}
      </div>
      {displayErrors.type && <p id={`${id}-type-error`} role='alert' className='fr-error-text'>{displayErrors.type}</p>}
      <div id={`${id}-editor`}>
        {event.type && <div className={styles.editor}>
          <div className={styles.context}>
            <CampaignField required label='Date du changement' type='date' min={dates[0]} max={dates.at(-1)} value={event.at} error={displayErrors.at} onChange={value => update('at', value)} />
          </div>
          <div className={styles.beforeAfter}>
            <div className={`${styles.stage} ${styles.before}`}>
              <div className={styles.stageHeading}><span>1</span><h4>Avant</h4></div>
              {meters.length === 0 ? <CampaignField disabled label={replacement ? 'Ancien compteur' : 'Compteur concerné'} value={unreferencedMeterLabel} /> : <CampaignField required label={replacement ? 'Ancien compteur' : 'Compteur concerné'} value={event.previousCompteurId === null ? unreferencedMeterValue : event.previousCompteurId} error={displayErrors.previousCompteurId} options={[...meterOptions(meters), ...(hasUnreferencedMeter ? [{value: unreferencedMeterValue, label: unreferencedMeterLabel}] : [])]} onChange={value => {
                if (canEditRef.current && !savingRef.current) {
                  setEvent({
                    ...event, previousCompteurId: value === unreferencedMeterValue ? null : value, nextCompteurId: replacement && (meters.length === 1 || value === unreferencedMeterValue) ? newMeterValue : '', previousIndex: '', nextIndex: '', serialNumber: '', identifier: ''
                  })
                  setErrors({})
                }
              }} />}
              {creatingMeter && <div className={`${styles.newMeter} ${styles.previousMeter}`}>
                <CampaignField disabled label='Numéro de série' value={selectedMeter?.compteur?.serialNumber || ''} placeholder='Non renseigné' />
                <CampaignField disabled label='Nom ou repère du compteur' value={selectedMeter?.compteur?.identifier || ''} placeholder='Non renseigné' />
              </div>}
              <EventIndex side='previous' event={event} error={displayErrors.previousIndex} disabled={!canEdit || saving} onChange={update} />
            </div>
            <span className={`${styles.arrow} fr-icon-arrow-right-line`} aria-hidden='true' />
            <div className={`${styles.stage} ${styles.after}`}>
              <div className={styles.stageHeading}><span>2</span><h4>Après</h4></div>
              {replacement ? <div className={styles.meterSelection}>
                <div className={styles.meterModes} role='group' aria-label='Compteur après le remplacement'>
                  <button type='button' className={`${styles.meterMode}${creatingMeter ? '' : ` ${styles.selectedMode}`}`} aria-pressed={!creatingMeter} aria-controls={`${id}-meter-identity`} disabled={saving || !canEdit || availableMeters.length === 0} onClick={() => {
                    if (canEditRef.current && !savingRef.current && availableMeters.length > 0 && creatingMeter) {
                      update('nextCompteurId', '')
                      update('nextIndex', '')
                    }
                  }}
                  >Compteur déjà enregistré</button>
                  <button type='button' className={`${styles.meterMode}${creatingMeter ? ` ${styles.selectedMode}` : ''}`} aria-pressed={creatingMeter} aria-controls={`${id}-meter-identity`} disabled={saving || !canEdit} onClick={() => {
                    if (canEditRef.current && !savingRef.current && !creatingMeter) {
                      update('nextCompteurId', newMeterValue)
                      update('nextIndex', '')
                    }
                  }}
                  >Nouveau compteur</button>
                </div>
                {!creatingMeter && <div id={`${id}-meter-identity`}>
                  <CampaignField required label='Compteur déjà enregistré' value={event.nextCompteurId} error={displayErrors.nextCompteurId} options={meterOptions(availableMeters)} onChange={value => {
                    update('nextCompteurId', value)
                    update('nextIndex', '')
                  }} />
                </div>}
              </div> : <div className={styles.sameMeter}><span>Le même compteur</span><strong>{event.previousCompteurId === null ? unreferencedMeterLabel : (selectedMeter ? campaignMeterName(selectedMeter) : 'Choisissez le compteur dans « Avant »')}</strong></div>}
              {creatingMeter && <div id={`${id}-meter-identity`} className={styles.newMeter}>
                <CampaignField label='Numéro de série' value={event.serialNumber} maxLength={200} error={displayErrors.serialNumber} onChange={value => update('serialNumber', value)} />
                <CampaignField label='Nom ou repère du compteur' value={event.identifier} maxLength={200} error={displayErrors.identifier} placeholder='Si le numéro de série est inconnu' onChange={value => update('identifier', value)} />
              </div>}
              <EventIndex side='next' event={event} error={displayErrors.nextIndex} disabled={!canEdit || saving} onChange={update} />
            </div>
          </div>
          {(event.previousIndex === null || event.nextIndex === null) && <p className={styles.info}>Un index inconnu empêche le calcul de certains volumes.</p>}
          <div className={styles.reasonField}>
            <CampaignField required multiline rows={2} maxLength={2000} label='Motif du changement' placeholder={replacement ? 'Ex. : compteur défectueux' : 'Ex. : maintenance'} value={event.reason} error={displayErrors.reason} onChange={value => update('reason', value)} />
          </div>
          {Object.values(displayErrors).some(Boolean) && <p role='alert' className='fr-error-text'>Vérifiez les champs indiqués.</p>}
          <div className={styles.actions}>
            <button type='button' className='fr-btn fr-btn--icon-left fr-icon-save-line' disabled={saving || !canEdit} onClick={addEvent}>{saving ? 'Enregistrement…' : 'Enregistrer le changement'}</button>
            <button type='button' className='fr-btn fr-btn--tertiary-no-outline' disabled={saving || !canEdit} onClick={cancel}>Annuler</button>
            {editing && <button type='button' className={`${styles.deleteAction} fr-btn fr-btn--tertiary-no-outline fr-btn--icon-left fr-icon-delete-line`} disabled={saving || !canEdit || Boolean(removal.blocked)} onClick={deleteEvent}>Supprimer</button>}
          </div>
          {editing && removal.blocked && <p className={styles.draftHint}>{removal.blocked}</p>}
        </div>}
      </div>
      {!event.type && (
        <button type='button' className='fr-btn fr-btn--tertiary-no-outline fr-btn--sm fr-mt-2w' onClick={cancel}>Annuler</button>
      )}
    </fieldset>
    {saveError && <p role='alert' className='fr-error-text'>{saveError}</p>}
  </div>

  return (
    <section className={styles.section} aria-label={`Changements de compteur · ${campaignPointName(target)}`}>
      {displayedEvents.length > 0 && (
        <div className={styles.savedList}>
          <ul>{displayedEvents.map(item => {
            const isEditing = editing && (sameEvent(item, editing) || sameEvent(item, lastAttempt.current?.candidate))
            const identity = isEditing ? editing : item
            const key = `${identity.targetId}-${identity.at}-${identity.previousCompteurId}`
            if (isEditing) {
              return <li key={key} className={styles.editingCard}>{editor}</li>
            }

            const validation = validateCampaignMeterEvent({
              event: item, context, target, draft, originalEvent: item
            })
            const messages = [...new Set([...validation.messages, ...campaignMeterEventIssues({
              event: item, target, draft, issues
            }), ...(sameEvent(item, deletionError?.event) ? [deletionError.message] : [])])]
            return <SavedEvent key={key} event={item} target={target} canEdit={canEdit} disabled={{edit: open || saving, delete: saving}} deleting={sameEvent(item, deleting)} messages={messages} removal={removalDraft(draft, item, target)} editButtonRef={sameEvent(item, returnToEvent.current) ? editButtonRef : undefined} onEdit={() => editEvent(item)} onDelete={() => deleteSavedEvent(item)} />
          })}</ul>
        </div>
      )}
      {canEdit && !open && (
        <button ref={triggerRef} type='button' className={`${styles.trigger} fr-btn fr-btn--tertiary-no-outline fr-btn--sm${targetEvents.length > 0 ? ' fr-btn--icon-left fr-icon-add-line' : ''}`} disabled={saving} aria-expanded={false} aria-controls={`${id}-panel`} onClick={() => {
          if (canEditRef.current && !savingRef.current) {
            returnToEvent.current = null
            setFeedback('')
            setSaveError('')
            setOpen(true)
          }
        }}
        >{targetEvents.length > 0 ? 'Déclarer un autre changement de compteur' : 'Déclarer un changement de compteur'}</button>
      )}
      {!editing && editor}
      {feedback && <p role='status' className='fr-valid-text fr-mb-0'>{feedback}</p>}
    </section>
  )
}

export default CampaignMeterEvents
