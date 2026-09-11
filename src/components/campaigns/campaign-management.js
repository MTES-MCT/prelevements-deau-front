'use client'

import {useEffect, useState} from 'react'

import Link from 'next/link'
import {useRouter} from 'next/navigation'

import CampaignConfigForm from '@/components/campaigns/campaign-config-form.js'
import CampaignExports from '@/components/campaigns/campaign-exports.js'
import CampaignProgress from '@/components/campaigns/campaign-progress.js'
import CampaignResults from '@/components/campaigns/campaign-results.js'
import CampaignSharing from '@/components/campaigns/campaign-sharing.js'
import {CampaignGlobalTimeline} from '@/components/campaigns/campaign-timeline.js'
import {
  CampaignCard, CampaignField, CampaignNotice, CampaignShell
} from '@/components/campaigns/campaign-ui.js'
import {getCampaignPosition} from '@/lib/campaign-timeline.js'
import {
  campaignArray, campaignDate, campaignInclusiveEnd, campaignMeterName, campaignPointName, confirmCampaignAction, unwrapCampaignResult
} from '@/lib/collection-campaigns.js'
import {
  getCampaignAction, getCampaignResponseSummaryAction, listCampaignNotificationsAction, remindCampaignAction, saveCampaignMeterAction, setCampaignOpenAction
} from '@/server/actions/campaigns.js'

const DELIVERY_STATUS_LABELS = {
  PENDING: 'En attente', PROCESSING: 'En cours', RUNNING: 'En cours', READY: 'Prêt', SUCCEEDED: 'Terminé', COMPLETED: 'Terminé', SENDING: 'Envoi en cours', SENT: 'Envoyé', FAILED: 'Échec', SKIPPED: 'Non envoyé', CANCELLED: 'Annulé'
}
const NOTIFICATION_KIND_LABELS = {
  OPENING: 'Email d’ouverture', REMINDER: 'Rappel', RECEIPT: 'Confirmation de réception'
}

// These checks only explain visible configuration issues. The server remains
// authoritative for permissions, concurrent changes and cross-point conflicts.
export const campaignPreparationIssues = (campaign, target) => {
  const issues = []
  if (!target.eligibilityConfirmed) {
    issues.push({code: 'eligibility', message: 'Revoyez la sélection des points dans « Modifier le brouillon ».'})
  }

  if (target.pointPrelevement?.collectionMode === 'EXTERNAL') {
    issues.push({code: 'external', message: 'Ce point transmet déjà ses données par un autre outil. Retirez-le de la sélection dans « Modifier le brouillon ».'})
  }

  const meters = target.meters || []
  if (meters.length > 0) {
    const uncoveredDates = (campaign.indexDates || []).filter(date => !meters.some(meter => (!meter.startDate || meter.startDate.slice(0, 10) <= date.slice(0, 10)) && (!meter.endDate || meter.endDate.slice(0, 10) >= date.slice(0, 10))))
    if (uncoveredDates.length > 0) {
      issues.push({code: 'dates', message: `Aucun compteur n’est indiqué en service pour le${uncoveredDates.length > 1 ? 's' : ''} relevé${uncoveredDates.length > 1 ? 's' : ''} du ${uncoveredDates.map(date => campaignDate(date)).join(', ')}. Corrigez les dates du compteur ou ajoutez le compteur manquant.`})
    }
  }

  return issues
}

const MeterAssociation = ({campaignId, expectedVersion, target, meter, onSaved, firstReadingDate, lastReadingDate, duringCollection = false}) => {
  const [form, setForm] = useState({
    serialNumber: '', identifier: '', startDate: meter?.startDate?.slice(0, 10) || '', endDate: meter?.endDate?.slice(0, 10) || ''
  })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const submit = async event => {
    event.preventDefault()
    setBusy(true)
    setError(null)
    try {
      const body = {
        expectedVersion, startDate: form.startDate, endDate: form.endDate || null, ...(meter ? {} : {serialNumber: form.serialNumber, ...(form.identifier ? {identifier: form.identifier} : {})})
      }
      unwrapCampaignResult(await saveCampaignMeterAction(campaignId, target.id, meter?.associationId || meter?.id, body))
      await onSaved()
      if (!meter) {
        setForm({
          serialNumber: '', identifier: '', startDate: '', endDate: ''
        })
      }
    } catch (error_) {
      setError(error_.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <form className='mb-3 border-t border-gray-200 pt-3' onSubmit={submit}>
      <CampaignNotice error>{error}</CampaignNotice>
      <fieldset disabled={busy}>
        <legend className='mb-3 font-bold'>{meter ? `Dates du compteur ${campaignMeterName(meter)}` : 'Ajouter un compteur à ce point'}</legend>
        {!meter && <div className='grid gap-3 md:grid-cols-2'>
          <CampaignField required label='Numéro de série du compteur' hint='Le numéro inscrit sur le compteur.' value={form.serialNumber} onChange={serialNumber => setForm({...form, serialNumber})} />
          <CampaignField label='Nom ou repère du compteur (facultatif)' hint='Un nom pour le reconnaître facilement, par exemple « Compteur du forage ».' value={form.identifier} onChange={identifier => setForm({...form, identifier})} />
        </div>}
        <div className='grid gap-3 md:grid-cols-2'>
          <CampaignField required label='Date de mise en service sur ce point' hint={duringCollection ? `La date doit être comprise entre le ${campaignDate(firstReadingDate)} et le ${campaignDate(lastReadingDate)}.` : (firstReadingDate ? `Indiquez la date réelle. Le premier relevé demandé est celui du ${campaignDate(firstReadingDate)}.` : undefined)} type='date' min={duringCollection ? firstReadingDate : undefined} max={duringCollection ? lastReadingDate : undefined} value={form.startDate} onChange={startDate => setForm({...form, startDate})} />
          <CampaignField label='Date de retrait (si le compteur a été retiré)' hint='Laissez vide si ce compteur est toujours en service.' type='date' min={form.startDate || undefined} value={form.endDate} onChange={endDate => setForm({...form, endDate})} />
        </div>
        <button type='submit' className='fr-btn fr-btn--secondary fr-btn--sm'>{busy ? 'Enregistrement…' : (meter ? 'Enregistrer les dates' : 'Enregistrer ce compteur')}</button>
      </fieldset>
    </form>
  )
}

export const CampaignReminders = ({campaignId, timezone, permissions, disabled = false, summary, remindersAvailable = true, nextReminderDate, onReminded}) => {
  const [notifications, setNotifications] = useState([])
  const [busy, setBusy] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [message, setMessage] = useState('')
  const [refresh, setRefresh] = useState(0)
  const [historyOpen, setHistoryOpen] = useState(false)
  const allReceived = Boolean(summary && summary.receivedCount >= summary.expectedCount)
  const canRemind = permissions.canRemind && remindersAvailable && !allReceived
  useEffect(() => {
    if (!historyOpen || !permissions.canRemind) {
      return
    }

    let active = true
    const load = async () => {
      setLoading(true)
      setError(null)
      try {
        const items = campaignArray(unwrapCampaignResult(await listCampaignNotificationsAction(campaignId)))
        if (active) {
          setNotifications(items)
        }
      } catch (error_) {
        if (active) {
          setError(error_.message)
        }
      } finally {
        if (active) {
          setLoading(false)
        }
      }
    }

    load()
    return () => {
      active = false
    }
  }, [campaignId, permissions.canRemind, historyOpen, refresh])
  const remind = async () => {
    if (!canRemind || busy || disabled || !confirmCampaignAction('Envoyer un rappel aux préleveurs qui n’ont pas encore transmis leur réponse ?')) {
      return
    }

    setBusy(true)
    setError(null)
    setMessage('')
    try {
      const result = unwrapCampaignResult(await remindCampaignAction(campaignId))
      setMessage(result.queuedCount > 0 ? `${result.queuedCount} rappel${result.queuedCount > 1 ? 's' : ''} en cours d’envoi.` : 'Aucun nouveau rappel à envoyer : les réponses ont été reçues ou un rappel est déjà prévu aujourd’hui.')
      setRefresh(previous => previous + 1)
      onReminded?.()
    } catch (error_) {
      setError(error_.message)
    } finally {
      setBusy(false)
    }
  }

  if (!permissions.canRemind) {
    return null
  }

  return (
    <section aria-label='Relances' className='mb-5 border-b border-[var(--border-default-grey)] pb-5'>
      <h3 className='fr-h6 fr-mb-1w'>Relances</h3>
      <CampaignNotice error>{error}</CampaignNotice>
      <CampaignNotice>{message}</CampaignNotice>
      <div className='flex flex-col items-start justify-between gap-3 md:flex-row md:items-center'>
        <div className='min-w-0'>
          <p className='fr-mb-0 text-sm text-[var(--text-mention-grey)]'>{allReceived ? 'Toutes les réponses attendues ont été reçues.' : (remindersAvailable ? 'Le rappel concerne uniquement les préleveurs qui ont encore une réponse à transmettre.' : 'La saisie n’est pas ouverte aux réponses. Les relances sont désactivées.')}</p>
          {canRemind && nextReminderDate && <p className='fr-mb-0 mt-1 text-xs text-[var(--text-mention-grey)]'>Prochaine relance automatique : {campaignDate(nextReminderDate)}, si une réponse manque.</p>}
        </div>
        {canRemind && <button type='button' className='fr-btn fr-btn--sm shrink-0' disabled={busy || disabled} onClick={remind}>{busy ? 'Envoi en cours…' : 'Relancer les réponses attendues'}</button>}
      </div>
      <details className='mt-3' onToggle={event => setHistoryOpen(event.currentTarget.open)}>
        <summary className='cursor-pointer text-xs text-[var(--text-mention-grey)]'>Historique des courriels</summary>
        {historyOpen && <div className='pt-3'>
          <p className='fr-hint-text'>Une réponse reçue reste valide même si son courriel est en attente ou en échec.</p>
          {loading ? <p role='status' className='fr-text--sm'>Chargement des courriels…</p> : notifications.map(item => <p key={item.id} className='fr-mb-1w text-sm'>{campaignDate(item.sentAt || item.createdAt, true, timezone)} · {NOTIFICATION_KIND_LABELS[item.kind] || 'Courriel'} : {DELIVERY_STATUS_LABELS[item.status] || 'État inconnu'}</p>)}
          {!loading && !error && notifications.length === 0 && <p className='fr-text--sm'>Aucun courriel.</p>}
          <button type='button' className='fr-btn fr-btn--tertiary-no-outline fr-btn--sm' disabled={busy || disabled || loading} onClick={() => setRefresh(previous => previous + 1)}>Actualiser l’historique</button>
        </div>}
      </details>
    </section>
  )
}

const CampaignPreparationPoint = ({campaign, target, issues, initiallyOpen, onSaved}) => {
  const [addingMeter, setAddingMeter] = useState(false)
  const firstReadingDate = [...(campaign.indexDates || [])].sort()[0]
  const meters = target.meters || []
  const meterFormProps = {
    campaignId: campaign.id, expectedVersion: campaign.version, target, firstReadingDate, onSaved
  }
  return (
    <details className='border-b border-[var(--border-default-grey)] py-4 last:border-b-0' open={initiallyOpen}>
      <summary className='cursor-pointer leading-relaxed'>
        <span className='font-bold'>{target.pointPrelevement?.id ? <Link className='fr-link font-bold' href={`/points-prelevement/${encodeURIComponent(target.pointPrelevement.id)}`}>{campaignPointName(target)}</Link> : campaignPointName(target)}</span>
        <span className={`fr-badge fr-badge--sm fr-ml-2w ${issues.length > 0 ? 'fr-badge--warning' : 'fr-badge--success'} fr-badge--no-icon`}>{issues.length > 0 ? 'À vérifier' : 'Prêt'}</span>
        {target.preleveur?.label && <span className='block text-sm text-[var(--text-mention-grey)]'>{target.preleveur.label}</span>}
      </summary>
      <div className='pt-3'>
        <p className='fr-text--sm'>{target.usage?.name || target.pointPrelevement?.usageName || 'Usage non renseigné'}</p>
        {issues.length > 0 && <ul className='mb-3 list-disc pl-5'>{issues.map(issue => <li key={issue.code} className='mb-2'>{issue.message}</li>)}</ul>}
        {meters.map(meter => (
          <div key={meter.associationId || meter.id} className='mt-3 rounded-sm bg-gray-50 p-3'>
            <p className='fr-mb-1w font-bold'>Compteur {campaignMeterName(meter)}</p>
            <p className='fr-mb-1w text-sm'>{meter.startDate ? `En service depuis le ${campaignDate(meter.startDate)}` : 'Date de mise en service non renseignée'}{meter.endDate ? `, retiré le ${campaignDate(meter.endDate)}` : ', toujours en service'}</p>
            <details>
              <summary className='cursor-pointer text-sm underline'>Corriger les dates de ce compteur</summary>
              <MeterAssociation key={`${meter.associationId || meter.id}-${campaign.version}`} {...meterFormProps} meter={meter} />
            </details>
          </div>
        ))}
        <div className='mt-3'>
          <button type='button' className='fr-btn fr-btn--tertiary fr-btn--sm' aria-expanded={addingMeter} onClick={() => setAddingMeter(previous => !previous)}>{meters.length > 0 ? 'Ajouter un autre compteur' : 'Renseigner un compteur (facultatif)'}</button>
          {addingMeter && <MeterAssociation key={campaign.version} {...meterFormProps} />}
        </div>
      </div>
    </details>
  )
}

export const CampaignPointsSummary = ({targets}) => (
  <CampaignCard title='Points de prélèvement'>
    {targets.map(target => (
      <div key={target.id} className='border-b border-[var(--border-default-grey)] py-4 first:pt-0 last:border-b-0'>
        <p className='fr-mb-1w font-bold'>{target.pointPrelevement?.id ? <Link className='fr-link font-bold' href={`/points-prelevement/${encodeURIComponent(target.pointPrelevement.id)}`}>{campaignPointName(target)}</Link> : campaignPointName(target)}</p>
        <p className='fr-text--sm fr-mb-1w'>{[target.preleveur?.label, target.usage?.name || target.pointPrelevement?.usageName || 'Usage non renseigné'].filter(Boolean).join(' · ')}</p>
        {target.meters?.length > 0 && <p className='fr-text--sm fr-mb-1w text-[var(--text-mention-grey)]'>Compteur{target.meters.length > 1 ? 's' : ''} : {target.meters.map(meter => campaignMeterName(meter)).join(', ')}</p>}
      </div>
    ))}
  </CampaignCard>
)

const periodDescription = period => `du ${campaignDate(period.startDate)} au ${campaignDate(campaignInclusiveEnd(period.endDate))}`

const hasDistinctPeriodBounds = period => period.kind === 'INDEX' && (!period.startReadingDate || !period.endReadingDate
  || period.startDate?.slice(0, 10) !== period.startReadingDate.slice(0, 10)
  || period.endDate?.slice(0, 10) !== period.endReadingDate.slice(0, 10))

export const campaignOpeningIssue = (campaign, now = new Date()) => {
  const timestamp = new Date(now).getTime()
  if (campaign.closesAt && timestamp >= Date.parse(campaign.closesAt)) {
    return 'Date limite dépassée : modifiez le brouillon avant d’ouvrir la saisie.'
  }

  if (campaign.opensAt && timestamp < Date.parse(campaign.opensAt)) {
    return `Ouverture possible à partir du ${campaignDate(campaign.opensAt, true, campaign.timezone)}.`
  }

  return ''
}

export const CampaignOverview = ({campaign, targets, now, progress}) => {
  const preleveurCount = new Set(targets.map(target => target.preleveurUserId).filter(Boolean)).size
  const usages = [...new Set(targets.map(target => target.usage?.name || target.pointPrelevement?.usageName).filter(Boolean))]
  const position = getCampaignPosition(campaign, now)
  return (
    <CampaignCard title='Vue d’ensemble' aside={<span className={`fr-badge fr-badge--no-icon ${position.tone === 'success' ? 'fr-badge--success' : (position.tone === 'warning' ? 'fr-badge--warning' : '')}`}>{position.label}</span>}>
      <dl className='grid gap-4 sm:grid-cols-2 lg:grid-cols-4'>
        <div><dt className='text-sm text-[var(--text-mention-grey)]'>Territoire</dt><dd className='mt-1 font-medium'>{campaign.zone?.name || 'Non renseigné'}</dd></div>
        <div><dt className='text-sm text-[var(--text-mention-grey)]'>Collecteur</dt><dd className='mt-1 font-medium'>{campaign.owner?.label || campaign.ownerContact?.label || 'Non renseigné'}</dd></div>
        <div><dt className='text-sm text-[var(--text-mention-grey)]'>Points et préleveurs</dt><dd className='mt-1 font-medium'>{targets.length} point{targets.length > 1 ? 's' : ''} · {preleveurCount} préleveur{preleveurCount > 1 ? 's' : ''}</dd></div>
        <div><dt className='text-sm text-[var(--text-mention-grey)]'>Usages</dt><dd className='mt-1 font-medium'>{usages.join(' · ') || 'Non renseignés'}</dd></div>
      </dl>
      {progress}
    </CampaignCard>
  )
}

export const CampaignCalendar = ({campaign, now}) => (
  <CampaignCard title='Calendrier de la campagne'>
    <CampaignGlobalTimeline {...campaign} embedded showPosition now={now} />
  </CampaignCard>
)

export const CampaignConfigurationDetails = ({campaign}) => {
  const distinctPeriods = (campaign.periods || []).filter(period => hasDistinctPeriodBounds(period))
  if (!campaign.openingMessage && distinctPeriods.length === 0) {
    return null
  }

  return (
    <CampaignCard title='Informations de la campagne'>
      {campaign.openingMessage && <div><h3 className='fr-h6 fr-mb-1w'>Message aux préleveurs</h3><p className='fr-mb-0 whitespace-pre-wrap text-sm'>{campaign.openingMessage}</p></div>}
      {distinctPeriods.length > 0 && <div className={campaign.openingMessage ? 'mt-4' : undefined}>
        <h3 className='fr-h6 fr-mb-1w'>Périodes couvertes par les volumes prélevés</h3>
        <ul className='mb-0 space-y-2 text-sm'>{distinctPeriods.map(period => <li key={period.id || `INDEX-${period.position}`}><span className='font-medium'>{period.label}</span> : {periodDescription(period)}</li>)}</ul>
      </div>}
    </CampaignCard>
  )
}

const CampaignManagement = ({initialContext, now}) => {
  const router = useRouter()
  const [context, setContext] = useState(initialContext)
  const [summary, setSummary] = useState(null)
  const [summaryLoading, setSummaryLoading] = useState(true)
  const [summaryError, setSummaryError] = useState(null)
  const [summaryRefresh, setSummaryRefresh] = useState(0)
  const [currentTime, setCurrentTime] = useState(now || null)
  const [error, setError] = useState(null)
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const [editingConfiguration, setEditingConfiguration] = useState(false)
  const [view, setView] = useState('followup')
  const [sharingDirty, setSharingDirty] = useState(false)
  const {campaign, permissions, targets = []} = context
  const isDraft = campaign.status === 'DRAFT'
  const targetChecks = isDraft ? targets.map(target => ({target, issues: campaignPreparationIssues(campaign, target)})) : []
  const incompleteTargets = targetChecks.filter(({issues}) => issues.length > 0)
  const openingIssues = [
    campaignOpeningIssue(campaign, currentTime || now || new Date()),
    targets.length === 0 ? 'Aucun point sélectionné. Utilisez « Modifier le brouillon » pour ajouter les points concernés.' : '',
    incompleteTargets.length > 0 ? `${incompleteTargets.length} point${incompleteTargets.length > 1 ? 's sont' : ' est'} à vérifier dans l’onglet « Suivi et résultats » avant l’ouverture.` : ''
  ].filter(Boolean)
  const readyToOpen = openingIssues.length === 0
  const canViewSharing = permissions.canManage || permissions.canManageSharing || Array.isArray(campaign.managers)
  const canViewExports = !isDraft && permissions.canExport
  const canViewConfiguration = canViewSharing || Boolean(campaign.openingMessage) || (campaign.periods || []).some(period => hasDistinctPeriodBounds(period))
  const position = getCampaignPosition(campaign, currentTime)
  const chooseView = next => {
    if (next === view) {
      return
    }

    if (view === 'configuration' && sharingDirty && !confirmCampaignAction('Quitter la configuration sans enregistrer les modifications de partage ?')) {
      return
    }

    setSharingDirty(false)
    setView(next)
  }

  const refresh = async () => {
    const saved = unwrapCampaignResult(await getCampaignAction(campaign.id))
    setContext(saved)
    return saved
  }

  const refreshMeters = async () => {
    await refresh()
    setMessage('Le compteur est enregistré.')
  }

  const reload = async () => {
    if (!confirmCampaignAction('Actualiser la campagne ? Les modifications non enregistrées seront perdues.')) {
      return
    }

    setBusy(true)
    try {
      await refresh()
      setSharingDirty(false)
      setView('followup')
      setError(null)
      setMessage('Les informations enregistrées ont été actualisées.')
    } catch (error_) {
      setError(error_.message)
    } finally {
      setBusy(false)
    }
  }

  useEffect(() => {
    const tick = () => setCurrentTime(new Date().toISOString())
    if (!now) {
      tick()
    }

    const interval = setInterval(tick, 60_000)
    const refreshOnFocus = () => {
      tick()
      setSummaryRefresh(previous => previous + 1)
    }

    window.addEventListener('focus', refreshOnFocus)
    return () => {
      clearInterval(interval)
      window.removeEventListener('focus', refreshOnFocus)
    }
  }, [now])

  useEffect(() => {
    if (!permissions.canFollowup || isDraft) {
      return
    }

    let active = true
    const load = async () => {
      setSummaryLoading(true)
      setSummaryError(null)
      try {
        const result = await getCampaignResponseSummaryAction(campaign.id)
        if (active) {
          setSummary(unwrapCampaignResult(result))
        }
      } catch (error_) {
        if (active) {
          setSummaryError(error_.message)
          setSummary(null)
        }
      } finally {
        if (active) {
          setSummaryLoading(false)
        }
      }
    }

    load()
    return () => {
      active = false
    }
  }, [campaign.id, campaign.version, permissions.canFollowup, isDraft, summaryRefresh])
  const changeStatus = async open => {
    if (!permissions.canManage || (open && !readyToOpen) || !confirmCampaignAction(open ? 'Ouvrir la saisie et envoyer les invitations aux préleveurs ? Les points et les dates ne pourront plus être modifiés.' : 'Clôturer la saisie ? Les préleveurs ne pourront plus modifier leurs réponses.')) {
      return
    }

    setBusy(true)
    setError(null)
    try {
      unwrapCampaignResult(await setCampaignOpenAction(campaign.id, open, campaign.version))
      await refresh()
      setView(open ? 'followup' : 'configuration')
      setMessage(open ? 'La collecte est ouverte. Les invitations sont en cours de préparation. Retrouvez les réponses dans « Suivi et résultats ».' : 'La saisie est clôturée. Les réponses et les exports restent consultables.')
    } catch (error_) {
      setError(error_.message)
    } finally {
      setBusy(false)
    }
  }

  const reminders = !isDraft && permissions.canRemind && <CampaignReminders campaignId={campaign.id} timezone={campaign.timezone} permissions={permissions} disabled={busy || sharingDirty} summary={summary} remindersAvailable={position.canRemind} nextReminderDate={position.nextReminderDate} onReminded={() => setSummaryRefresh(previous => previous + 1)} />

  return (
    <CampaignShell title={campaign.name}>
      <CampaignNotice error>{error}</CampaignNotice>
      <CampaignNotice>{message}</CampaignNotice>
      {error && (
        <button type='button' className='fr-btn fr-btn--tertiary fr-mb-2w' disabled={busy || editingConfiguration} onClick={reload}>Actualiser les informations enregistrées</button>
      )}
      <CampaignOverview campaign={campaign} targets={targets} now={currentTime} progress={permissions.canFollowup && !isDraft && <CampaignProgress summary={summary} loading={summaryLoading} error={summaryError} onRetry={() => setSummaryRefresh(previous => previous + 1)} />} />
      {!(editingConfiguration && permissions.canManage && isDraft) && <CampaignCalendar campaign={campaign} now={currentTime} />}
      {editingConfiguration && permissions.canManage && isDraft ? (
        <CampaignCard title='Modifier le brouillon'>
          <button type='button' className='fr-btn fr-btn--tertiary fr-mb-2w' onClick={() => {
            if (confirmCampaignAction('Revenir à la campagne sans enregistrer les modifications ?')) {
              setEditingConfiguration(false)
            }
          }}
          >Annuler les modifications</button>
          <CampaignConfigForm key={campaign.version} context={context} onSaved={async () => {
            await refresh()
            setEditingConfiguration(false)
            setView('configuration')
            setMessage('Le brouillon est enregistré.')
          }} />
        </CampaignCard>
      ) : <>
        <nav className='mb-4 flex flex-wrap gap-x-1 border-b border-[var(--border-default-grey)]' aria-label='Rubriques de la collecte'>
          {[
            {id: 'followup', label: 'Suivi et résultats'},
            ...(canViewExports ? [{id: 'exports', label: 'Exports'}] : []),
            ...(canViewConfiguration ? [{id: 'configuration', label: 'Configuration'}] : [])
          ].map(item => <button key={item.id} type='button' className={`border-x-0 border-b-2 border-t-0 border-solid px-4 py-3 text-sm ${view === item.id ? 'border-[var(--border-active-blue-france)] font-bold text-[var(--text-action-high-blue-france)]' : 'border-transparent text-[var(--text-mention-grey)]'}`} aria-pressed={view === item.id} aria-controls='campaign-section' onClick={() => chooseView(item.id)}>{item.label}</button>)}
        </nav>
        <div id='campaign-section'>
          {view === 'exports' && canViewExports && <CampaignExports campaignId={campaign.id} timezone={campaign.timezone} permissions={permissions} disabled={busy || sharingDirty} />}
          {view === 'followup' && isDraft && permissions.canManage && <CampaignCard title='Préparer les points'>
            <p className='fr-text--sm text-[var(--text-mention-grey)]'>Vérifiez les points et leurs compteurs avant l’ouverture. Pour ajouter ou retirer un point, utilisez « Modifier le brouillon » dans l’onglet « Configuration ».</p>
            {targets.length === 0 ? <CampaignNotice>Aucun point sélectionné. Utilisez « Modifier le brouillon » pour ajouter les points concernés.</CampaignNotice> : incompleteTargets.length > 0 && <CampaignNotice>{incompleteTargets.length} point{incompleteTargets.length > 1 ? 's sont' : ' est'} à vérifier avant l’ouverture.</CampaignNotice>}
            {targetChecks.map(({target, issues}) => <CampaignPreparationPoint key={target.id} campaign={campaign} target={target} issues={issues} initiallyOpen={incompleteTargets[0]?.target.id === target.id} onSaved={refreshMeters} />)}
          </CampaignCard>}
          {view === 'followup' && !isDraft && permissions.canFollowup && <CampaignResults campaign={campaign} refreshKey={`${campaign.version}-${summaryRefresh}`} actions={reminders} />}
          {view === 'followup' && !permissions.canFollowup && reminders}
          {view === 'followup' && (isDraft ? !permissions.canManage : !permissions.canFollowup) && <CampaignPointsSummary targets={targets} />}
          {view === 'configuration' && canViewSharing && <CampaignSharing key={campaign.version} campaign={campaign} managerOptions={context.managerOptions} canManageSharing={permissions.canManageSharing === true} onDirtyChange={setSharingDirty} onSaved={async saved => {
            if (saved.accessRevoked) {
              router.replace('/campagnes')
              return
            }

            setContext(saved)
            if (!saved.permissions.canManage && !saved.permissions.canManageSharing && !Array.isArray(saved.campaign.managers)) {
              setView('followup')
            }

            setMessage('Les accès sont enregistrés.')
          }} />}
          {view === 'configuration' && <CampaignConfigurationDetails campaign={campaign} />}
          {view === 'configuration' && permissions.canManage && <CampaignCard title={isDraft ? 'Préparer l’ouverture' : 'Terminer la campagne'}>
            {isDraft && <>
              <p id='campaign-opening-help' className='fr-text--sm fr-mb-2w'>{readyToOpen ? 'L’ouverture envoie les invitations et fige les dates et les points de cette collecte.' : openingIssues.join(' ')}</p>
              <div className='flex flex-wrap items-center gap-3'>
                <button className='fr-btn' type='button' disabled={busy || !readyToOpen || sharingDirty} aria-describedby='campaign-opening-help' onClick={() => changeStatus(true)}>{busy ? 'Ouverture…' : 'Ouvrir la saisie'}</button>
                <button type='button' className='fr-btn fr-btn--secondary' disabled={busy} onClick={() => {
                  if (!sharingDirty || confirmCampaignAction('Modifier le brouillon sans enregistrer les modifications de partage ?')) {
                    setSharingDirty(false)
                    setEditingConfiguration(true)
                  }
                }}
                >Modifier le brouillon</button>
              </div>
            </>}
            {campaign.status === 'CLOSED' && <p className='fr-text--sm fr-mb-0 text-[var(--text-mention-grey)]'>La saisie est clôturée. Les réponses ne sont plus modifiables ; le suivi et les exports restent consultables selon vos droits.</p>}
            {campaign.status === 'OPEN' && <section aria-label='Clôture de la saisie'>
              <p id='campaign-closing-help' className='fr-text--sm fr-mb-2w'>Clôturer la saisie empêchera les préleveurs de modifier leurs réponses. Le suivi et les exports resteront accessibles.</p>
              <button className='fr-btn fr-btn--tertiary fr-btn--sm' type='button' disabled={busy || sharingDirty} aria-describedby='campaign-closing-help' onClick={() => changeStatus(false)}>Clôturer la saisie</button>
            </section>}
          </CampaignCard>}
        </div>
      </>}
    </CampaignShell>
  )
}

export default CampaignManagement
