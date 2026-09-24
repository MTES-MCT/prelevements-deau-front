'use client'

import {useState} from 'react'

import {Alert} from '@codegouvfr/react-dsfr/Alert'
import {useRouter} from 'next/navigation'

import {campaignData} from '@/lib/campaigns.js'
import {approveCampaignMeterAction, getCampaignMeterReviewAction} from '@/server/actions/campaigns.js'

export default function CampaignMeterReview({campaignId, compteurId, serialNumber, onApproved}) {
  const router = useRouter()
  const [review, setReview] = useState(null)
  const [allocations, setAllocations] = useState([])
  const [canonicalResponseId, setCanonicalResponseId] = useState('')
  const [confirmed, setConfirmed] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)

  async function load() {
    setBusy(true)
    setError(null)
    setSuccess(null)
    try {
      const next = campaignData(await getCampaignMeterReviewAction(campaignId, compteurId))
      setReview(next)
      setConfirmed(false)
      setCanonicalResponseId('')
      setAllocations(next.beneficiaries.map(item => ({exploitationId: item.exploitationId, offSeasonPercentage: next.beneficiaries.length === 1 ? '100' : '', seasonPercentage: next.beneficiaries.length === 1 ? '100' : '', additive: false})))
    } catch (error) { setError(error.message) } finally { setBusy(false) }
  }
  function change(index, field, value) {
    setAllocations(previous => previous.map((item, row) => row === index ? {...item, [field]: value} : item))
  }
  async function approve() {
    setBusy(true)
    setError(null)
    try {
      const result = campaignData(await approveCampaignMeterAction(campaignId, compteurId, {expectedHash: review.expectedHash, confirmHistorical: confirmed, allocations, ...(canonicalResponseId ? {canonicalResponseId} : {})}))
      await onApproved?.()
      setSuccess(result.status === 'PUBLISHED' ? 'Rattachement et répartition validés. Les volumes sont publiés.' : 'Vérification enregistrée. Certains volumes restent en attente de vérification.')
      setReview(null)
      router.refresh()
    } catch (error) { setError(error.message) } finally { setBusy(false) }
  }
  const percentagesValid = ['offSeasonPercentage', 'seasonPercentage'].every(field => allocations.length && allocations.every(item => item[field] !== '' && Number.isFinite(Number(item[field])) && Number(item[field]) >= 0) && Math.abs(allocations.reduce((sum, item) => sum + Number(item[field]), 0) - 100) < 0.00001)
  return <div className='mt-4 border-t pt-3'>
    {!review && <button className='fr-btn fr-btn--sm fr-btn--secondary' type='button' disabled={busy} onClick={load}>Vérifier le compteur {serialNumber}</button>}
    {error && <Alert severity='error' title='Vérification non enregistrée' description={error} className='mt-3' />}
    {success && <Alert severity='success' title={success} className='mt-3' />}
    {review && <section className='mt-3 bg-[#f5f5fe] p-3' aria-label={`Vérification du compteur ${serialNumber}`}>
      <h4 className='fr-h6'>Rattachement et partage du compteur {serialNumber}</h4>
      <p className='fr-text--sm'>Vérifiez les bénéficiaires et la part de volume de chaque exploitation pour les deux périodes. Les pourcentages doivent totaliser 100 % par période.</p>
      {review.blockedReasons?.length > 0 && <Alert severity='warning' title='Informations à compléter' description={review.blockedReasons.join(' ')} className='mb-3' />}
      <div className='grid gap-3'>
        {review.beneficiaries.map((item, index) => <fieldset key={item.exploitationId} className='min-w-0 border bg-white p-3'>
          <legend className='px-1 text-sm font-semibold'>{item.preleveurName} · {item.pointName}{item.countingCode ? ` · Comptage ${item.countingCode}` : ''}</legend>
          <p className='fr-text--sm'>{item.inCampaign === false ? 'Part hors campagne — conservée dans la répartition, non publiée ici.' : item.submitted ? `Index : ${item.meter?.offSeason?.indexStart ?? '—'} → ${item.meter?.offSeason?.indexEnd ?? '—'} → ${item.meter?.season?.indexEnd ?? '—'} m³` : 'Réponse non envoyée'}</p>
          <div className='grid gap-3 sm:grid-cols-2'>{[['offSeasonPercentage', 'Part hors étiage 2025–2026 (%)'], ['seasonPercentage', 'Part étiage 2026 (%)']].map(([field, label]) => <div key={field}><label className='fr-label text-sm' htmlFor={`${compteurId}-${index}-${field}`}>{label}</label><input id={`${compteurId}-${index}-${field}`} className='fr-input' type='number' min='0' max='100' step='any' value={allocations[index][field]} onChange={event => change(index, field, event.target.value)} /></div>)}</div>
          <label className='mt-3 flex items-start gap-2 text-sm'><input className='mt-1 shrink-0' type='checkbox' checked={allocations[index].additive} onChange={event => change(index, 'additive', event.target.checked)} />Les volumes de ce compteur s’ajoutent à ceux des autres compteurs de cette exploitation.</label>
        </fieldset>)}
      </div>
      {review.contradictoryReadings && <div className='fr-select-group mt-3'><label className='fr-label' htmlFor={`canonical-${compteurId}`}>Les index diffèrent : quelle réponse fait référence ?</label><select id={`canonical-${compteurId}`} className='fr-select' value={canonicalResponseId} onChange={event => setCanonicalResponseId(event.target.value)}><option value=''>Choisir après vérification</option>{review.beneficiaries.filter(item => item.submitted && item.meter).map(item => <option key={item.responseId} value={item.responseId}>{item.preleveurName} · Comptage {item.countingCode || 'non renseigné'}</option>)}</select></div>}
      <label className='my-3 flex items-start gap-2 text-sm'><input className='mt-1 shrink-0' type='checkbox' checked={confirmed} onChange={event => setConfirmed(event.target.checked)} />Je confirme que ces rattachements et pourcentages sont valables du 31/10/2025 au 31/10/2026, selon les deux périodes indiquées.</label>
      <div className='flex flex-wrap gap-2'><button className='fr-btn fr-btn--sm' type='button' disabled={busy || !confirmed || !percentagesValid || !review.canApprove || (review.contradictoryReadings && !canonicalResponseId)} onClick={approve}>Valider et publier les volumes</button><button className='fr-btn fr-btn--sm fr-btn--secondary' type='button' disabled={busy} onClick={() => setReview(null)}>Annuler</button></div>
    </section>}
  </div>
}
