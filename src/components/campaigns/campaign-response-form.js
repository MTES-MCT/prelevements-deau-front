'use client'

import {useEffect, useRef, useState} from 'react'

import Link from 'next/link'

import CampaignHistory from '@/components/campaigns/campaign-history.js'
import CampaignPointChangeRequest from '@/components/campaigns/campaign-point-change-request.js'
import {
  CampaignCard, CampaignField, CampaignNotice, CampaignShell
} from '@/components/campaigns/campaign-ui.js'
import {createCampaignDraftQueue} from '@/lib/campaign-draft.js'
import {
  campaignCalculationIssue,
  campaignConfirmPointMeter,
  campaignDate,
  campaignDeadlineLabel,
  campaignDraftErrors,
  campaignDraftForSave,
  campaignEditableTargets,
  campaignInitialDraft,
  campaignInclusiveEnd,
  campaignMeterName,
  campaignPointName,
  campaignPointMeterConfirmed,
  campaignPointReadings,
  campaignReferenceReading,
  campaignResponseHref,
  campaignUpdateReading,
  CAMPAIGN_KIND_LABELS,
  decimalInput,
  getCampaignCapabilities,
  meterAppliesOnDate,
  needKey,
  readingKey,
  replaceCampaignRow,
  confirmCampaignAction, unwrapCampaignResult
} from '@/lib/collection-campaigns.js'
import {reopenCampaignResponseAction, saveCampaignResponseAction, submitCampaignResponseAction} from '@/server/actions/campaigns.js'

const HistoricalReading = ({candidates, meter, value, disabled, onChange}) => {
  const [candidateId, setCandidateId] = useState('')
  if (candidates.length === 0) {
    return null
  }

  const selected = candidates.find(item => item.sourceChunkValueId === candidateId)
  return (
    <details className='mb-3 rounded border border-blue-100 bg-blue-50 p-3'>
      <summary className='cursor-pointer text-sm'>Relevés existants à cette date ({candidates.length}){value.sourceChunkValueId ? ' · relevé repris' : ''}</summary>
      <CampaignField label='Choisir un relevé' disabled={disabled} value={candidateId} options={[{value: '', label: 'Choisir un relevé'}, ...candidates.map(candidate => ({value: candidate.sourceChunkValueId, label: `${candidate.value} m³ — ${candidate.sourceType === 'CAMPAIGN' ? 'Campagne précédente' : 'Déclaration'}${candidate.declarationCode ? ` ${candidate.declarationCode}` : ''}`}))]} onChange={setCandidateId} />
      {selected?.requiresMeterConfirmation && meter.compteurId && <p className='text-sm'>En reprenant ce relevé, vous confirmez qu’il concerne « {campaignMeterName(meter)} ».</p>}
      <button type='button' className='fr-btn fr-btn--secondary fr-btn--sm' disabled={disabled || !selected} onClick={() => {
        onChange(campaignReferenceReading(selected, meter.compteurId))
        setCandidateId('')
      }}
      >Reprendre ce relevé</button>
    </details>
  )
}

function IndexRows({context, draft, disabled, onChange}) {
  return context.targets.map(target => {
    const targetDisabled = disabled || !campaignEditableTargets(context, 'INDEX').includes(target.id)
    const hasMeters = Boolean(target.meters?.length)
    const unassignedReadings = campaignPointReadings(draft, target.id)
    return (
      <CampaignCard key={target.id} title={campaignPointName(target)}>
        {context.campaign.indexDates.flatMap(readingDate => {
          const date = readingDate.slice(0, 10)
          const meters = hasMeters ? target.meters.filter(meter => meterAppliesOnDate(meter, date)) : [{compteurId: null}]
          if (meters.length === 0) {
            return <p key={date} className='text-sm'>Aucun compteur en service au {campaignDate(date)}.</p>
          }

          return meters.map(meter => {
            const identity = {targetId: target.id, compteurId: meter.compteurId, readingDate: date}
            const value = (draft.readings || []).find(reading => readingKey(reading) === readingKey(identity)) || {...identity, value: null}
            const candidates = (context.existingReadings || []).filter(candidate => candidate.targetId === target.id && candidate.readingDate.slice(0, 10) === date && (!candidate.compteurId || candidate.compteurId === meter.compteurId))
            const setReading = reading => onChange(campaignUpdateReading(draft, reading))
            return (
              <fieldset key={readingKey(identity)} className='mb-3 border-t border-gray-200 pt-3' disabled={targetDisabled}>
                {hasMeters && <legend className='font-bold'>{campaignMeterName(meter)}</legend>}
                <HistoricalReading candidates={candidates} meter={meter} value={value} disabled={targetDisabled} onChange={setReading} />
                <CampaignField label={`Index au ${campaignDate(date)} (m³)`} disabled={Boolean(value.sourceChunkValueId)} inputMode='decimal' value={value.value ?? ''} hint={value.sourceChunkValueId ? 'Ce relevé a déjà été déclaré.' : undefined} onChange={input => setReading({...value, value: input === '' ? null : decimalInput(input), missingReason: undefined})} />
                {value.sourceChunkValueId && !targetDisabled && (
                  <button type='button' className='fr-btn fr-btn--tertiary fr-btn--sm fr-mb-2w' onClick={() => {
                    const {sourceChunkValueId, ...reading} = value
                    setReading({...reading, correctionOfChunkValueId: sourceChunkValueId, correctionReason: ''})
                  }}
                  >Corriger ce relevé</button>
                )}
                {value.correctionOfChunkValueId && <CampaignField label='Pourquoi corrigez-vous ce relevé ?' value={value.correctionReason || ''} onChange={correctionReason => setReading({...value, correctionReason})} />}
                {(value.value === null || value.value === '') && <details open={value.missingReason ? true : undefined} className='mb-3'>
                  <summary className='cursor-pointer text-sm'>Je n’ai pas ce relevé</summary>
                  <CampaignField label='Pourquoi ce relevé est-il indisponible ?' value={value.missingReason || ''} onChange={missingReason => setReading({...identity, value: null, missingReason})} />
                </details>}
              </fieldset>
            )
          })
        })}
        {!hasMeters && unassignedReadings.length > 0 && <fieldset disabled={targetDisabled} className='mt-3'>
          <label className='flex items-start gap-2'><input type='checkbox' checked={campaignPointMeterConfirmed(draft, target.id)} onChange={event => onChange(campaignConfirmPointMeter(draft, target.id, event.target.checked))} />Ces relevés concernent le même compteur, sans remplacement ni remise à zéro.</label>
          <p className='fr-hint-text mt-2'>Si le compteur a changé ou si plusieurs compteurs sont concernés, précisez-le en commentaire et conservez votre brouillon.</p>
        </fieldset>}
      </CampaignCard>
    )
  })
}

const MeterEvents = ({context, draft, disabled, onChange}) => {
  const [event, setEvent] = useState({
    targetId: '', type: 'RESET', at: '', previousCompteurId: '', nextCompteurId: '', previousIndex: '', nextIndex: '', reason: ''
  })
  const editableTargets = context.targets.filter(item => campaignEditableTargets(context, 'INDEX').includes(item.id) && item.meters?.length)
  const target = editableTargets.find(item => item.id === event.targetId)
  const meters = target?.meters || []
  const options = [{value: '', label: 'Choisir le compteur'}, ...meters.map(meter => ({value: meter.compteurId, label: campaignMeterName(meter)}))]
  const complete = event.targetId && event.at && event.previousCompteurId && (event.type === 'RESET' || event.nextCompteurId) && event.previousIndex !== '' && event.nextIndex !== '' && event.reason.trim()
  if (!context.targets.some(item => item.meters?.length)) {
    return null
  }

  return (
    <details className='fr-mb-3w'>
      <summary className='cursor-pointer font-bold'>Un compteur a été remplacé ou remis à zéro ?</summary>
      <CampaignCard title='Changement de compteur'>
        <p>Renseignez les index avant et après le changement.</p>
        {(draft.meterEvents || []).map((item, index) => (
          <div key={`${item.targetId}-${item.at}-${item.previousCompteurId}-${item.nextCompteurId}`} className='mb-2 border border-gray-200 p-3'>
            <p>{campaignPointName(context.targets.find(target_ => target_.id === item.targetId) || {})} — {item.type === 'RESET' ? 'Remise à zéro' : 'Remplacement'} le {campaignDate(item.at)} : {item.previousIndex ?? 'Indisponible'} → {item.nextIndex ?? 'Indisponible'} m³</p>
            <p className='text-sm'>{item.reason}</p>
            {!disabled && editableTargets.some(target_ => target_.id === item.targetId) && <button type='button' className='fr-btn fr-btn--tertiary-no-outline fr-btn--sm' onClick={() => onChange({...draft, meterEvents: draft.meterEvents.filter((_, position) => position !== index)})}>Retirer ce changement</button>}
          </div>
        ))}
        {!disabled && <details>
          <summary className='cursor-pointer font-bold'>Ajouter un changement</summary>
          <fieldset disabled={disabled} className='mt-3'>
            <CampaignField label='Point concerné' value={event.targetId} options={[{value: '', label: 'Choisir un point'}, ...editableTargets.map(item => ({value: item.id, label: campaignPointName(item)}))]} onChange={targetId => setEvent({
              ...event, targetId, previousCompteurId: '', nextCompteurId: ''
            })} />
            <div className='grid gap-3 md:grid-cols-2'>
              <CampaignField label='Que s’est-il passé ?' value={event.type} options={[{value: 'RESET', label: 'Remise à zéro du même compteur'}, {value: 'REPLACEMENT', label: 'Remplacement de compteur'}]} onChange={type => setEvent({...event, type})} />
              <CampaignField label='Date de l’intervention' type='date' value={event.at} onChange={at => setEvent({...event, at})} />
              <CampaignField label='Compteur avant intervention' value={event.previousCompteurId} options={options} onChange={previousCompteurId => setEvent({...event, previousCompteurId})} />
              {event.type === 'REPLACEMENT' && <CampaignField label='Compteur après intervention' value={event.nextCompteurId} options={options} onChange={nextCompteurId => setEvent({...event, nextCompteurId})} />}
              <div>
                <CampaignField label='Dernier index avant intervention (m³)' inputMode='decimal' disabled={event.previousIndex === null} value={event.previousIndex ?? ''} onChange={value => setEvent({...event, previousIndex: decimalInput(value)})} />
                <label><input type='checkbox' checked={event.previousIndex === null} onChange={change => setEvent({...event, previousIndex: change.target.checked ? null : ''})} /> Index avant intervention indisponible</label>
              </div>
              <div>
                <CampaignField label='Premier index après intervention (m³)' inputMode='decimal' disabled={event.nextIndex === null} value={event.nextIndex ?? ''} onChange={value => setEvent({...event, nextIndex: decimalInput(value)})} />
                <label><input type='checkbox' checked={event.nextIndex === null} onChange={change => setEvent({...event, nextIndex: change.target.checked ? null : ''})} /> Index après intervention indisponible</label>
              </div>
            </div>
            <CampaignField multiline label='Précisions' value={event.reason} onChange={reason => setEvent({...event, reason})} />
            <button type='button' className='fr-btn fr-btn--secondary' disabled={!complete} onClick={() => {
              onChange({...draft, meterEvents: [...(draft.meterEvents || []), {...event, nextCompteurId: event.type === 'RESET' ? event.previousCompteurId : event.nextCompteurId}]})
              setEvent({
                ...event, at: '', previousIndex: '', nextIndex: '', reason: ''
              })
            }}
            >Enregistrer ce changement</button>
          </fieldset>
        </details>}
      </CampaignCard>
    </details>
  )
}

function NeedsRows({context, draft, disabled, onChange}) {
  const periods = context.campaign.periods.filter(period => period.kind === 'NEEDS')
  return context.targets.map(target => (
    <CampaignCard key={target.id} title={campaignPointName(target)}>
      {periods.map(period => {
        const identity = {targetId: target.id, periodId: period.id}
        const value = (draft.needs || []).find(item => needKey(item) === needKey(identity)) || {...identity, requestedFlow: '', requestedVolume: ''}
        const update = changes => onChange({...draft, needs: replaceCampaignRow(draft.needs || [], {...value, ...changes}, needKey)})
        return (
          <fieldset key={period.id} disabled={disabled || !campaignEditableTargets(context, 'NEEDS').includes(target.id)} className='mb-3 border-t border-gray-200 pt-3'>
            <legend className='font-bold'>{period.label} — {campaignDate(period.startDate)} au {campaignDate(campaignInclusiveEnd(period.endDate))}</legend>
            <div className='grid gap-3 md:grid-cols-2'>
              <CampaignField label='Débit demandé (m³/h)' inputMode='decimal' value={value.requestedFlow} onChange={input => update({requestedFlow: decimalInput(input)})} />
              <CampaignField label='Volume demandé (m³)' inputMode='decimal' value={value.requestedVolume} onChange={input => update({requestedVolume: decimalInput(input)})} />
            </div>
          </fieldset>
        )
      })}
    </CampaignCard>
  ))
}

const CalculationSummary = ({context, calculation}) => (
  <details className='fr-mb-3w'>
    <summary className='cursor-pointer font-bold'>Voir les volumes calculés</summary>
    <CampaignCard title='Volumes prélevés'>
      {(calculation?.totals || []).map(total => {
        const target = context.targets.find(item => item.id === total.targetId)
        const period = context.campaign.periods.find(item => item.id === total.periodId)
        return (
          <div key={`${total.targetId}-${total.periodId}`} className='mb-2 border border-gray-200 p-3'>
            <h3 className='text-base font-bold'>{campaignPointName(target || {})} — {period?.label || 'Période'}</h3>
            <p>{total.status === 'COMPLETE' ? `${total.value} m³` : (total.status === 'CONFLICT' ? 'À compléter ou à vérifier' : 'Volume non calculable : relevé indisponible')}</p>
            {[...new Set([...(total.missing || []), ...(total.conflicts || [])].map(issue => `${campaignCalculationIssue(issue)}${issue.readingDate ? ` (${campaignDate(issue.readingDate)})` : ''}`))].map(message => <p key={message} className='text-sm'>{message}</p>)}
          </div>
        )
      })}
      {!calculation?.totals?.length && <p>Les volumes apparaîtront après la saisie des index.</p>}
    </CampaignCard>
  </details>
)

const CampaignResponseForm = ({initialContext, kind}) => {
  const [context, setContext] = useState(initialContext)
  const [draft, setDraft] = useState(() => campaignInitialDraft(initialContext, kind))
  const [calculation, setCalculation] = useState(initialContext.calculation)
  const [saveState, setSaveState] = useState({status: 'saved', dirty: false})
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState(null)
  const [confirmTransmit, setConfirmTransmit] = useState(false)
  const [reopenReason, setReopenReason] = useState('')
  const queue = useRef(null)
  const timer = useRef(null)
  const idempotencyKey = useRef(null)
  const mounted = useRef(true)
  const response = context.responses?.[kind]
  const permissions = getCampaignCapabilities(context, kind)
  const otherKind = kind === 'INDEX' ? 'NEEDS' : 'INDEX'
  const otherResponseHref = response?.status === 'SUBMITTED' && context.campaign.periods.some(period => period.kind === otherKind) && getCampaignCapabilities(context, otherKind).canRead
    ? campaignResponseHref(context.campaign.id, otherKind, context.preleveurUserId)
    : null
  const requestingOrganization = context.campaign.owner?.label || context.campaign.ownerContact?.label
  const disabled = !permissions.canEdit || busy || saveState.status === 'conflict'
  const localErrors = campaignDraftErrors(draft, kind)

  queue.current ||= createCampaignDraftQueue({
    revision: response?.version || 0,
    async save(data, expectedVersion) {
      const errors = campaignDraftErrors(data, kind)
      if (errors.length > 0) {
        throw new Error(errors[0])
      }

      const saved = unwrapCampaignResult(await saveCampaignResponseAction(context.campaign.id, kind, {preleveurUserId: context.preleveurUserId, expectedVersion, data: campaignDraftForSave(context, kind, data)}))
      return {...saved, revision: saved.response.version}
    },
    onState(state) {
      if (!mounted.current) {
        return
      }

      setSaveState(state)
      if (state.result) {
        setCalculation(state.result.calculation)
        setContext(previous => ({...previous, responses: {...previous.responses, [kind]: state.result.response}}))
      }
    }
  })

  useEffect(() => {
    mounted.current = true
    const beforeUnload = event => {
      if (queue.current.getState().dirty) {
        event.preventDefault()
        event.returnValue = ''
      }
    }

    window.addEventListener('beforeunload', beforeUnload)
    const beforeNavigate = event => {
      const link = event.target.closest?.('a[href]')
      if (link && !link.hasAttribute('download') && link.target !== '_blank' && queue.current.getState().dirty && !confirmCampaignAction('Quitter abandonnera les modifications non enregistrées. Continuer ?')) {
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
    }
  }, [])

  const change = value => {
    if (disabled) {
      return
    }

    setDraft(value)
    setError(null)
    setConfirmTransmit(false)
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

  const reload = async () => {
    if (queue.current.getState().dirty && !confirmCampaignAction('Recharger abandonnera les modifications locales non enregistrées. Continuer ?')) {
      return
    }

    window.location.reload()
  }

  const save = async () => {
    if (disabled) {
      return
    }

    clearTimeout(timer.current)
    try {
      if ((!response?.id || response.status === 'SUBMITTED') && !queue.current.getState().dirty) {
        queue.current.change(draft)
      }

      await queue.current.retry()
    } catch (error_) {
      setError(error_.message)
    }
  }

  const transmit = async () => {
    if (!permissions.canSubmit || !confirmTransmit) {
      return
    }

    setBusy(true)
    setError(null)
    clearTimeout(timer.current)
    try {
      // An untouched prefill must also be persisted before transmission.
      if (!response?.id || response.status === 'SUBMITTED') {
        queue.current.change(draft)
      }

      const expectedVersion = await queue.current.flush()
      idempotencyKey.current ||= crypto.randomUUID()
      const submitted = unwrapCampaignResult(await submitCampaignResponseAction(context.campaign.id, kind, {preleveurUserId: context.preleveurUserId, expectedVersion, idempotencyKey: idempotencyKey.current}))
      queue.current.setRevision(submitted.response.version)
      setContext(previous => ({...previous, responses: {...previous.responses, [kind]: submitted.response}}))
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
      setBusy(false)
      setConfirmTransmit(false)
    }
  }

  const reopen = async () => {
    if (!permissions.canReopen || !reopenReason.trim()) {
      return
    }

    setBusy(true)
    try {
      unwrapCampaignResult(await reopenCampaignResponseAction(context.campaign.id, kind, {preleveurUserId: context.preleveurUserId, expectedVersion: response?.version ?? 0, reason: reopenReason}))
      window.location.reload()
    } catch (error_) {
      setError(error_.message)
      setBusy(false)
    }
  }

  return (
    <CampaignShell title={CAMPAIGN_KIND_LABELS[kind]} description={`${context.campaign.name} — ${context.campaign.year}`} backHref='/mes-declarations#demandes' backLabel='Mes déclarations'>
      {requestingOrganization && <p className='fr-text--sm'>Demandé par <strong>{requestingOrganization}</strong>.</p>}
      {context.campaign.closesAt && <p className='fr-text--sm'>Date limite de réponse : {campaignDeadlineLabel(context.campaign.closesAt, context.campaign.timezone)}.</p>}
      <CampaignNotice error>{error}</CampaignNotice>
      <CampaignNotice>{message}</CampaignNotice>
      {otherResponseHref && <p className='fr-mb-3w'><Link className='fr-link fr-icon-arrow-right-line fr-link--icon-right' href={otherResponseHref}>{otherKind === 'NEEDS' ? 'Passer aux besoins en eau' : 'Passer aux relevés de compteurs'}</Link></p>}
      <CampaignPointChangeRequest context={context} />
      {response?.status === 'SUBMITTED' && permissions.canEdit && <CampaignNotice>Vous pouvez encore corriger votre réponse jusqu’à la date limite. Pensez à la transmettre à nouveau après modification.</CampaignNotice>}
      {(context.availablePreleveurs || []).length > 1 && <CampaignField label='Répondre pour' value={context.preleveurUserId} disabled={busy} options={context.availablePreleveurs.map(preleveur => ({value: preleveur.userId, label: preleveur.label}))} onChange={preleveurUserId => {
        if (!queue.current.getState().dirty || confirmCampaignAction('Changer de préleveur abandonnera la saisie non enregistrée. Continuer ?')) {
          window.location.href = `?${new URLSearchParams({preleveurUserId})}`
        }
      }} />}
      {!permissions.canEdit && <CampaignNotice>{response?.status === 'SUBMITTED' ? 'Votre réponse a été transmise.' : 'Vous pouvez consulter cette réponse, mais pas la modifier.'}</CampaignNotice>}
      <div role='status' className='fr-mb-2w text-sm'>{{
        saving: 'Enregistrement en cours…', dirty: 'Enregistrement en attente…', conflict: 'Cette réponse a été modifiée ailleurs. Votre saisie reste dans cet écran.', error: 'L’enregistrement a échoué. Votre saisie reste dans cet écran.'
      }[saveState.status] || 'Enregistrement automatique.'}</div>
      {['error', 'conflict'].includes(saveState.status) && <CampaignNotice error>{saveState.error?.message || 'Vérifiez votre saisie.'} <button className='fr-btn fr-btn--tertiary fr-btn--sm' type='button' onClick={reload}>Recharger la version enregistrée</button></CampaignNotice>}
      {localErrors.map(item => <CampaignNotice key={item} error>{item}</CampaignNotice>)}
      {kind === 'INDEX' ? <>
        <p className='fr-mb-3w'>Recopiez les index affichés sur votre compteur aux dates indiquées, en m³. Si vous n’avez pas un relevé, indiquez pourquoi.</p>
        <IndexRows context={context} draft={draft} disabled={disabled} onChange={change} />
        <MeterEvents context={context} draft={draft} disabled={disabled} onChange={change} />
        <CalculationSummary context={context} calculation={calculation} />
      </> : <NeedsRows context={context} draft={draft} disabled={disabled} onChange={change} />}
      <CampaignCard title={kind === 'NEEDS' ? 'Commentaire de la demande' : 'Commentaire'}>
        <CampaignField multiline label='Commentaire facultatif' disabled={disabled || campaignEditableTargets(context, kind).length < context.targets.length} value={draft.comment || ''} onChange={comment => change({...draft, comment})} />
      </CampaignCard>
      {context.preleveurUserId && response?.latestSubmission && <CampaignHistory key={`${kind}-${response.latestSubmission.id}`} context={context} kind={kind} />}
      {permissions.canEdit && <button type='button' className='fr-btn fr-btn--secondary fr-mb-2w' disabled={busy || saveState.status === 'conflict' || localErrors.length > 0} onClick={save}>Enregistrer le brouillon</button>}
      {permissions.canSubmit && <CampaignCard title='Transmettre la réponse'>
        <p>Tant que vous ne la transmettez pas, votre réponse reste un brouillon.</p>
        <label className='mb-3 flex items-start gap-2'><input type='checkbox' checked={confirmTransmit} disabled={busy} onChange={event => setConfirmTransmit(event.target.checked)} />Je confirme les informations et souhaite transmettre cette réponse.</label>
        <button type='button' className='fr-btn' disabled={busy || !confirmTransmit || localErrors.length > 0 || saveState.status === 'conflict'} onClick={transmit}>{busy ? 'Transmission…' : 'Transmettre'}</button>
      </CampaignCard>}
      {permissions.canReopen && <CampaignCard title='Réouvrir le brouillon'>
        <p>Le préleveur disposera de 7 jours pour corriger cette réponse.</p>
        <CampaignField multiline label='Pourquoi faut-il corriger cette réponse ?' value={reopenReason} onChange={setReopenReason} />
        <button type='button' className='fr-btn fr-btn--secondary' disabled={busy || !reopenReason.trim()} onClick={reopen}>Réouvrir pour correction</button>
      </CampaignCard>}
    </CampaignShell>
  )
}

export default CampaignResponseForm
