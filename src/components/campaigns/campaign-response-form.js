'use client'

import {
  useCallback, useEffect, useRef, useState
} from 'react'

import Link from 'next/link'

import {IndexRows, NeedsRows, RecoveredMeterEditors} from '@/components/campaigns/campaign-response-entries.js'
import CampaignResponseHeader from '@/components/campaigns/campaign-response-header.js'
import CampaignResponseWorkspace from '@/components/campaigns/campaign-response-workspace.js'
import {
  CampaignField, CampaignNotice, CampaignShell
} from '@/components/campaigns/campaign-ui.js'
import useCampaignResponseRecovery from '@/components/campaigns/use-campaign-response-recovery.js'
import {createCampaignDraftQueue} from '@/lib/campaign-draft.js'
import {
  campaignDate,
  campaignDraftErrors,
  campaignDraftForSave,
  campaignEditableTargets,
  campaignInitialDraft,
  campaignResponseHref,
  getCampaignCapabilities,
  confirmCampaignAction, unwrapCampaignResult
} from '@/lib/collection-campaigns.js'
import {saveCampaignResponseAction, submitCampaignResponseAction} from '@/server/actions/campaigns.js'

const PENDING_METER_EVENT_MESSAGE = 'Validez ou annulez le changement de compteur pour continuer.'

const CampaignResponseForm = ({initialContext, kind}) => {
  const [context, setContext] = useState(initialContext)
  const [draft, setDraft] = useState(() => campaignInitialDraft(initialContext, kind))
  const [calculation, setCalculation] = useState(initialContext.calculation)
  const [saveState, setSaveState] = useState({status: 'saved', dirty: false})
  const [validationIssues, setValidationIssues] = useState([])
  const [savingDraft, setSavingDraft] = useState(false)
  const [draftSaveFeedback, setDraftSaveFeedback] = useState(null)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState(null)
  const [hasPendingMeterEvent, setHasPendingMeterEvent] = useState(false)
  const queue = useRef(null)
  const timer = useRef(null)
  const idempotencyKey = useRef(null)
  const mounted = useRef(true)
  const pendingMeterEvent = useRef(false)
  const pendingMeterEventTargets = useRef(new Set())
  const manualSave = useRef({pending: false, version: 0})
  const submissionPending = useRef(false)
  const submissionFinished = useRef(null)
  const savedDraftResult = useRef(null)
  const editingState = useRef(null)
  const latestContext = useRef(context)
  latestContext.current = context
  const recovery = useCampaignResponseRecovery({
    context, kind, queue,
    onRestore({context: fresh, recovery: saved, conflict}) {
      latestContext.current = fresh
      setContext(fresh)
      setCalculation(fresh.calculation)
      const value = saved?.draft || campaignInitialDraft(fresh, kind)
      setDraft(value)
      queue.current.setRevision(fresh.responses?.[kind]?.version || 0)
      if (conflict) {
        setSaveState({status: 'conflict', dirty: true})
      } else if (saved?.dirty) {
        queue.current.change(value)
      }
    }
  })
  const recoveryRef = useRef(recovery)
  recoveryRef.current = recovery
  const response = context.responses?.[kind]
  const permissions = getCampaignCapabilities(context, kind)
  const otherKind = kind === 'INDEX' ? 'NEEDS' : 'INDEX'
  const otherResponseHref = response?.status === 'SUBMITTED' && context.campaign.periods.some(period => period.kind === otherKind) && getCampaignCapabilities(context, otherKind).canRead
    ? campaignResponseHref(context.campaign.id, otherKind, context.preleveurUserId)
    : null
  const disabled = !permissions.canEdit || !recovery.ready || busy || saveState.status === 'conflict'
  editingState.current = {disabled: disabled || campaignEditableTargets(context, kind).length === 0, kind}
  const localErrors = campaignDraftErrors(draft, kind)
  const meterIssues = [...(saveState.dirty ? [] : calculation?.issues || []), ...validationIssues]
  const onPendingMeterEventChange = useCallback((targetId, targetPending) => {
    if (targetPending) {
      pendingMeterEventTargets.current.add(targetId)
    } else {
      pendingMeterEventTargets.current.delete(targetId)
    }

    const pending = pendingMeterEventTargets.current.size > 0
    pendingMeterEvent.current = pending
    setHasPendingMeterEvent(pending)
    if (pending) {
      manualSave.current.version++
      setDraftSaveFeedback(null)
      idempotencyKey.current = null
    } else {
      setError(previous => previous === PENDING_METER_EVENT_MESSAGE ? null : previous)
    }
  }, [])

  queue.current ||= createCampaignDraftQueue({
    revision: response?.version || 0,
    async save(data, expectedVersion) {
      const errors = campaignDraftErrors(data, kind)
      if (errors.length > 0) {
        throw new Error(errors[0])
      }

      const currentContext = latestContext.current
      const saved = unwrapCampaignResult(await saveCampaignResponseAction(currentContext.campaign.id, kind, {preleveurUserId: currentContext.preleveurUserId, expectedVersion, data: campaignDraftForSave(currentContext, kind, data)}))
      return {...saved, revision: saved.response.version}
    },
    onState(state) {
      recoveryRef.current.recordSave(state)
      if (state.result) {
        savedDraftResult.current = state.result
      }

      if (!mounted.current) {
        return
      }

      setSaveState(state)
      if (state.error) {
        setValidationIssues(state.error.details?.data?.issues ?? state.error.details?.issues ?? [])
      }

      if (state.result) {
        setValidationIssues([])
        setCalculation(state.result.calculation)
        setContext(previous => ({...previous, ...(state.result.targets ? {targets: state.result.targets} : {}), responses: {...previous.responses, [kind]: state.result.response}}))
        if (!state.dirty && state.result.response?.draft) {
          // Apply server-assigned meter identities only once every newer edit is saved.
          setDraft(previous => ({...previous, ...structuredClone(state.result.response.draft)}))
        }
      }
    }
  })

  useEffect(() => {
    mounted.current = true
    const beforeUnload = event => {
      if (queue.current.getState().dirty || pendingMeterEvent.current || recoveryRef.current.hasChanges()) {
        event.preventDefault()
        event.returnValue = ''
      }
    }

    window.addEventListener('beforeunload', beforeUnload)
    const beforeNavigate = event => {
      const link = event.target.closest?.('a[href]')
      if (link && !link.hasAttribute('download') && link.target !== '_blank' && (queue.current.getState().dirty || pendingMeterEvent.current || recoveryRef.current.hasChanges()) && !confirmCampaignAction('Des modifications ne sont pas encore enregistrées. Quitter cette page ?')) {
        event.preventDefault()
        event.stopPropagation()
      }
    }

    document.addEventListener('click', beforeNavigate, true)
    return () => {
      mounted.current = false
      window.removeEventListener('beforeunload', beforeUnload)
      document.removeEventListener('click', beforeNavigate, true)
      clearTimeout(timer.current)
      recoveryRef.current.depart(submissionFinished.current)
    }
  }, [])

  const change = value => {
    if (disabled || submissionPending.current) {
      return
    }

    setDraft(value)
    recovery.recordDraft(value)
    manualSave.current.version++
    setDraftSaveFeedback(null)
    setError(null)
    idempotencyKey.current = null
    queue.current.change(value)
    clearTimeout(timer.current)
    timer.current = setTimeout(async () => {
      try {
        await queue.current.retry()
      } catch {
        // The queue keeps the draft and exposes the error/conflict without a blind retry.
      }
    }, 900)
  }

  const saveMeterEvent = async value => {
    if (!mounted.current || editingState.current.disabled || editingState.current.kind !== 'INDEX') {
      throw new Error('Vous ne pouvez pas modifier cette réponse.')
    }

    if (manualSave.current.pending) {
      throw new Error('Un enregistrement est déjà en cours. Réessayez dans un instant.')
    }

    manualSave.current.pending = true
    setSavingDraft(true)
    try {
      change(value)
      clearTimeout(timer.current)
      await queue.current.retry()
      return savedDraftResult.current
    } finally {
      manualSave.current.pending = false
      if (mounted.current) {
        setSavingDraft(false)
      }
    }
  }

  const reload = async () => {
    if ((queue.current.getState().dirty || pendingMeterEvent.current || recovery.hasChanges()) && !confirmCampaignAction('Recharger abandonnera les modifications locales non enregistrées. Continuer ?')) {
      return
    }

    recovery.clear({discard: true})
    window.location.reload()
  }

  const save = async () => {
    if (disabled || manualSave.current.pending || submissionPending.current) {
      return
    }

    if (pendingMeterEvent.current) {
      setError(PENDING_METER_EVENT_MESSAGE)
      return
    }

    const version = ++manualSave.current.version
    manualSave.current.pending = true
    setSavingDraft(true)
    setDraftSaveFeedback({version, status: 'saving', message: 'Enregistrement en cours…'})
    setError(null)
    clearTimeout(timer.current)
    try {
      if ((!response?.id || response.status === 'SUBMITTED') && !queue.current.getState().dirty) {
        recovery.recordDraft(draft)
        queue.current.change(draft)
      }

      await queue.current.retry()
      if (mounted.current && manualSave.current.version === version) {
        setDraftSaveFeedback({version, status: 'saved', message: 'Brouillon enregistré.'})
      }
    } catch (error_) {
      if (mounted.current && manualSave.current.version === version) {
        setError(error_.message)
        setDraftSaveFeedback({
          version, status: 'error', message: error_.code === 409 ? 'Ce brouillon a été modifié ailleurs. Rechargez les données enregistrées.' : 'L’enregistrement du brouillon a échoué. Votre saisie reste dans cette page.'
        })
      }
    } finally {
      manualSave.current.pending = false
      if (mounted.current) {
        setSavingDraft(false)
      }
    }
  }

  const transmit = async () => {
    if (manualSave.current.pending || submissionPending.current) {
      return
    }

    if (pendingMeterEvent.current) {
      setError(PENDING_METER_EVENT_MESSAGE)
      return
    }

    if (!permissions.canSubmit || editingState.current.disabled || localErrors.length > 0) {
      return
    }

    submissionPending.current = true
    let finishSubmission
    submissionFinished.current = new Promise(resolve => {
      finishSubmission = resolve
    })
    manualSave.current.version++
    setDraftSaveFeedback(null)
    editingState.current.disabled = true
    setBusy(true)
    setError(null)
    clearTimeout(timer.current)
    try {
      // An untouched prefill must also be persisted before transmission.
      if (!response?.id || response.status === 'SUBMITTED') {
        recovery.recordDraft(draft)
        queue.current.change(draft)
      }

      const expectedVersion = await queue.current.retry()
      idempotencyKey.current ||= crypto.randomUUID()
      const submitted = unwrapCampaignResult(await submitCampaignResponseAction(context.campaign.id, kind, {preleveurUserId: context.preleveurUserId, expectedVersion, idempotencyKey: idempotencyKey.current}))
      queue.current.setRevision(submitted.response.version)
      recovery.clear({response: submitted.response})
      setContext(previous => ({...previous, ...(submitted.targets ? {targets: submitted.targets} : {}), responses: {...previous.responses, [kind]: submitted.response}}))
      setDraft(structuredClone(submitted.response.draft))
      setCalculation(submitted.calculation)
      idempotencyKey.current = null
      setMessage('Votre réponse a bien été transmise.')
    } catch (error_) {
      if (error_.code === 409) {
        setSaveState(previous => ({...previous, status: 'conflict', error: error_}))
      }

      setError(error_.code === 409 ? 'Cette réponse a été modifiée entre-temps. Rechargez la page pour la vérifier avant de transmettre.' : error_.message)
    } finally {
      finishSubmission()
      submissionFinished.current = null
      submissionPending.current = false
      setBusy(false)
    }
  }

  return (
    <CampaignShell header={<CampaignResponseHeader campaign={context.campaign} kind={kind} />} backHref='/mes-declarations#demandes' backLabel='Mes déclarations'>
      {(context.availablePreleveurs || []).length > 1 && <CampaignField label='Répondre pour' value={context.preleveurUserId} disabled={busy} options={context.availablePreleveurs.map(preleveur => ({value: preleveur.userId, label: preleveur.label}))} onChange={preleveurUserId => {
        if ((!queue.current.getState().dirty && !pendingMeterEvent.current) || confirmCampaignAction('Des modifications ne sont pas encore enregistrées. Changer de préleveur ?')) {
          window.location.href = `?${new URLSearchParams({preleveurUserId})}`
        }
      }} />}
      <CampaignNotice error>{error}</CampaignNotice>
      <CampaignNotice>{message}</CampaignNotice>
      <CampaignNotice>{recovery.notice}</CampaignNotice>
      <RecoveredMeterEditors context={context} editors={recovery.conflictEditors} />
      {otherResponseHref && <p className='fr-mb-3w'><Link className='fr-link fr-icon-arrow-right-line fr-link--icon-right' href={otherResponseHref}>{otherKind === 'NEEDS' ? 'Passer aux besoins en eau' : 'Passer aux relevés de compteurs'}</Link></p>}
      {response?.status === 'SUBMITTED' && permissions.canEdit && <CampaignNotice>Vous pouvez encore corriger votre réponse jusqu’à la date limite. Pensez à la transmettre à nouveau après modification.</CampaignNotice>}
      {!permissions.canEdit && <CampaignNotice>{response?.status === 'SUBMITTED' ? 'Votre réponse a été transmise.' : 'Vous pouvez consulter cette réponse, mais pas la modifier.'}</CampaignNotice>}
      {permissions.canEdit && <div role='status' className={saveState.status === 'saved' ? undefined : 'fr-mb-2w text-sm'}>{{
        saving: 'Enregistrement en cours…', dirty: 'Enregistrement en attente…', conflict: 'Cette réponse a été modifiée ailleurs. Votre saisie reste dans cet écran.', error: 'L’enregistrement a échoué. Votre saisie reste dans cet écran.'
      }[saveState.status] || ''}</div>}
      {['error', 'conflict'].includes(saveState.status) && <CampaignNotice error>{saveState.error?.message || 'Vérifiez votre saisie.'} <button className='fr-btn fr-btn--tertiary fr-btn--sm' type='button' onClick={reload}>Recharger les données enregistrées</button></CampaignNotice>}
      {localErrors.map(item => <CampaignNotice key={item} error>{item}</CampaignNotice>)}
      {response?.latestSubmission?.submittedAt && <p className='fr-mb-2w text-sm text-gray-600'>Dernière transmission le {campaignDate(response.latestSubmission.submittedAt, true, context.campaign.timezone)}.</p>}
      <CampaignResponseWorkspace targets={context.targets}>{({pointProps}) => (
        <>
          {kind === 'INDEX'
            ? <IndexRows context={context} draft={draft} disabled={disabled} pointProps={pointProps} issues={meterIssues} ignoredReadings={saveState.dirty ? [] : calculation?.ignoredReadings} recoveredEditors={recovery.editors} onEditorChange={recovery.onEditorChange} onChange={change} onSaveMeterEvent={saveMeterEvent} onPendingMeterEventChange={onPendingMeterEventChange} />
            : <NeedsRows context={context} draft={draft} disabled={disabled} pointProps={pointProps} onChange={change} />}
          <div className='fr-mt-2w'>
            <CampaignField multiline rows={2} label='Commentaire facultatif' disabled={disabled || campaignEditableTargets(context, kind).length < context.targets.length} value={draft.comment || ''} onChange={comment => change({...draft, comment})} />
          </div>
          {(permissions.canEdit || permissions.canSubmit) && <section aria-label='Enregistrement et transmission' className='mb-5 border-t border-gray-200 pt-3'>
            {hasPendingMeterEvent && <p role='status' className='fr-info-text fr-mb-2w'>{PENDING_METER_EVENT_MESSAGE}</p>}
            <div className='flex flex-col gap-2 sm:flex-row sm:items-center'>
              {permissions.canEdit && <button type='button' className='fr-btn fr-btn--secondary' disabled={disabled || savingDraft || hasPendingMeterEvent || localErrors.length > 0} onClick={save}>{savingDraft ? 'Enregistrement…' : 'Enregistrer le brouillon'}</button>}
              {permissions.canSubmit && <button type='button' className='fr-btn' disabled={disabled || savingDraft || hasPendingMeterEvent || localErrors.length > 0} onClick={transmit}>{busy ? 'Soumission…' : 'Soumettre'}</button>}
            </div>
            {permissions.canSubmit && <p className='fr-text--xs fr-mt-1w fr-mb-0 text-[var(--text-mention-grey)]'>Vous pourrez modifier votre réponse tant que la saisie est ouverte.</p>}
            <div role='status' aria-atomic='true'>
              {draftSaveFeedback && <p key={draftSaveFeedback.version} className={`fr-mb-0 mt-2 ${draftSaveFeedback.status === 'saved' ? 'fr-valid-text' : (draftSaveFeedback.status === 'error' ? 'fr-error-text' : 'fr-info-text')}`}>{draftSaveFeedback.message}</p>}
            </div>
          </section>}
        </>
      )}</CampaignResponseWorkspace>
    </CampaignShell>
  )
}

export default CampaignResponseForm
