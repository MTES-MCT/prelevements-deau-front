'use client'

import {useState} from 'react'

import {CampaignCard, CampaignField, CampaignNotice} from '@/components/campaigns/campaign-ui.js'
import {
  campaignDate, campaignMeterName, campaignPointName, readingKey, unwrapCampaignResult
} from '@/lib/collection-campaigns.js'
import {getCampaignHistoryAction} from '@/server/actions/campaigns.js'

export const CampaignReceipt = ({submission, context, kind}) => {
  const snapshot = submission.snapshot || {}
  const pointName = targetId => campaignPointName(context.targets.find(target => target.id === targetId) || {})
  const meterName = (targetId, compteurId) => campaignMeterName(context.targets.find(target => target.id === targetId)?.meters?.find(meter => meter.compteurId === compteurId) || {})
  const actor = submission.createdBy?.label || [submission.createdBy?.firstName, submission.createdBy?.lastName].filter(Boolean).join(' ')
  return (
    <article id='campaign-submission-receipt' className='border border-gray-200 bg-white p-4'>
      <h3 className='fr-h5'>Confirmation de transmission — {kind === 'INDEX' ? 'Index de prélèvement' : 'Besoins'}</h3>
      <p>{context.campaign.name} — {context.campaign.year}</p>
      <p>Transmis le <time dateTime={submission.submittedAt}>{campaignDate(submission.submittedAt, true, context.campaign.timezone)}</time>{actor ? ` par ${actor}` : ''}.</p>
      {kind === 'INDEX' ? <>
        {(snapshot.readings || []).map(reading => <p key={readingKey(reading)} className='text-sm'>{pointName(reading.targetId)}{reading.compteurId ? ` — ${meterName(reading.targetId, reading.compteurId)}` : ''}, {campaignDate(reading.readingDate)} : {reading.value ?? 'Non relevé'}{reading.value === null ? ` (${reading.missingReason || 'Motif non renseigné'})` : ' m³'}{reading.correctionOfChunkValueId ? ` · Correction : ${reading.correctionReason}` : ''}</p>)}
        {(snapshot.meterEvents || []).map(event => <p key={`${event.targetId}-${event.at}-${event.previousCompteurId}`} className='text-sm'>{pointName(event.targetId)} — {event.type === 'RESET' ? 'Remise à zéro' : 'Remplacement'} le {campaignDate(event.at)} : {event.previousIndex ?? 'Index indisponible'} → {event.nextIndex ?? 'Index indisponible'} ; {event.reason}</p>)}
        {(submission.publication?.totals || []).map(total => <p key={`${total.targetId}-${total.periodId}`} className='font-bold'>{pointName(total.targetId)} — {context.campaign.periods.find(period => period.id === total.periodId)?.label || 'Période'} : {total.value === null ? 'Volume non calculable' : `${total.value} m³`}</p>)}
      </> : (snapshot.needs || []).map(need => <p key={`${need.targetId}-${need.periodId}`} className='text-sm'>{pointName(need.targetId)} — {context.campaign.periods.find(period => period.id === need.periodId)?.label || 'Période'} : {need.requestedFlow} m³/h ; {need.requestedVolume} m³</p>)}
      {snapshot.comment && <p className='whitespace-pre-wrap'>Commentaire : {snapshot.comment}</p>}
      <p className='fr-hint-text'>Référence : {submission.id} — version {submission.version}.</p>
    </article>
  )
}

const CampaignHistory = ({context, kind}) => {
  const latest = context.responses?.[kind]?.latestSubmission
  const [items, setItems] = useState(latest ? [latest] : [])
  const [selectedId, setSelectedId] = useState(latest?.id || '')
  const [loaded, setLoaded] = useState(false)
  const [cursor, setCursor] = useState(null)
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)
  const submission = items.find(item => item.id === selectedId)
  const load = async nextCursor => {
    setBusy(true)
    setError(null)
    try {
      const data = unwrapCampaignResult(await getCampaignHistoryAction(context.campaign.id, kind, context.preleveurUserId, nextCursor))
      setItems(previous => [...new Map([...(nextCursor ? previous : []), ...data.items].map(item => [item.id, item])).values()])
      setCursor(data.nextCursor)
      setLoaded(true)
      if (!selectedId) {
        setSelectedId(data.items[0]?.id || '')
      }
    } catch (error_) {
      setError(error_.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <details className='fr-mb-3w'>
      <summary className='cursor-pointer font-bold'>Consulter les réponses déjà transmises</summary>
      <CampaignCard title='Réponses transmises'>
        <CampaignNotice error>{error}</CampaignNotice>
        <div className='mb-3 flex flex-wrap gap-3'>
          <button className='fr-btn fr-btn--secondary' type='button' disabled={busy} onClick={() => load(null)}>{loaded ? 'Actualiser' : 'Voir les réponses précédentes'}</button>
          {cursor && <button className='fr-btn fr-btn--tertiary' type='button' disabled={busy} onClick={() => load(cursor)}>Charger les versions précédentes</button>}
        </div>
        {items.length > 0 && <CampaignField label='Réponse à consulter' value={selectedId} options={items.map(item => ({value: item.id, label: `${campaignDate(item.submittedAt, true, context.campaign.timezone)} — version ${item.version}`}))} onChange={setSelectedId} />}
        {loaded && items.length === 0 && <p>Aucune réponse transmise.</p>}
        {submission && <>
          <style>{'@media print { body * { visibility: hidden; } #campaign-submission-receipt, #campaign-submission-receipt * { visibility: visible; } #campaign-submission-receipt { position: absolute; inset: 0 auto auto 0; width: 100%; border: 0; } }'}</style>
          <CampaignReceipt submission={submission} context={context} kind={kind} />
          <button className='fr-btn fr-btn--secondary fr-mt-2w print:hidden' type='button' onClick={() => window.print()}>Imprimer ou enregistrer en PDF</button>
        </>}
      </CampaignCard>
    </details>
  )
}

export default CampaignHistory
