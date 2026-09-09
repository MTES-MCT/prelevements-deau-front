'use client'

import {useEffect, useState} from 'react'

import Link from 'next/link'
import {useRouter} from 'next/navigation'

import CampaignConfigForm from '@/components/campaigns/campaign-config-form.js'
import CampaignSharing from '@/components/campaigns/campaign-sharing.js'
import {
  CampaignCard, CampaignField, CampaignNotice, CampaignShell
} from '@/components/campaigns/campaign-ui.js'
import {
  campaignArray, campaignDate, campaignDeadlineLabel, campaignInclusiveEnd, campaignMeterName, campaignPointName, CAMPAIGN_STATUS_LABELS, confirmCampaignAction, unwrapCampaignResult
} from '@/lib/collection-campaigns.js'
import {
  createCampaignExportAction, getCampaignAction, getCampaignExportAction, getCampaignFollowupAction, listCampaignExportsAction, listCampaignNotificationsAction, remindCampaignAction, saveCampaignMeterAction, setCampaignOpenAction
} from '@/server/actions/campaigns.js'

const DELIVERY_STATUS_LABELS = {
  PENDING: 'En attente', PROCESSING: 'En cours', RUNNING: 'En cours', READY: 'Prêt', SUCCEEDED: 'Terminé', COMPLETED: 'Terminé', SENDING: 'Envoi en cours', SENT: 'Envoyé', FAILED: 'Échec', SKIPPED: 'Non envoyé', CANCELLED: 'Annulé'
}
const NOTIFICATION_KIND_LABELS = {
  OPENING: 'Invitation à répondre', REMINDER: 'Rappel', SUBMISSION: 'Confirmation de transmission', REOPENING: 'Réouverture de la saisie', RECEIPT: 'Récépissé'
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

const Followup = ({campaignId, timezone, targets, responses}) => {
  const preleveurs = [...new Set(targets.map(target => target.preleveurUserId))]
  return (
    <CampaignCard title='Suivi des réponses'>
      <p>Retrouvez les index et les besoins de chaque préleveur.</p>
      {preleveurs.map(preleveurUserId => {
        const ownTargets = targets.filter(target => target.preleveurUserId === preleveurUserId)
        const ownResponses = responses.filter(response => response.preleveurUserId === preleveurUserId)
        const person = ownTargets[0]?.preleveur || ownTargets[0]?.declarant
        const label = person?.label || person?.socialReason || person?.user?.email || ownTargets.map(target => campaignPointName(target)).join(', ')
        return (
          <div key={preleveurUserId} className='mb-3 border border-gray-200 p-3'>
            <h3 className='text-base font-bold'>{label}</h3>
            <p className='text-sm'>{ownTargets.map(target => campaignPointName(target)).join(' · ')}</p>
            <div className='grid gap-3 md:grid-cols-2'>{['INDEX', 'NEEDS'].map(kind => {
              const response = ownResponses.find(item => item.kind === kind)
              return (
                <div key={kind}>
                  <p>{kind === 'INDEX' ? 'Index' : 'Besoins'} : {response ? CAMPAIGN_STATUS_LABELS[response.status] || response.status : 'Non commencé'}{response?.latestSubmission?.submittedAt ? ` — ${campaignDate(response.latestSubmission.submittedAt, true, timezone)}` : ''}</p>
                  <Link className='fr-link' href={`/${kind === 'INDEX' ? 'mes-index' : 'mes-besoins'}/${campaignId}?${new URLSearchParams({preleveurUserId})}`}>Voir {kind === 'INDEX' ? 'les index' : 'les besoins'}</Link>
                </div>
              )
            })}</div>
          </div>
        )
      })}
      {preleveurs.length === 0 && <p>Aucun point à afficher.</p>}
    </CampaignCard>
  )
}

const CampaignDelivery = ({campaignId, timezone, permissions}) => {
  const [exports, setExports] = useState([])
  const [notifications, setNotifications] = useState([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const [message, setMessage] = useState('')
  const [refresh, setRefresh] = useState(0)
  const [downloadUrls, setDownloadUrls] = useState({})
  useEffect(() => {
    let active = true
    const load = async () => {
      try {
        if (permissions.canExport) {
          const items = campaignArray(unwrapCampaignResult(await listCampaignExportsAction(campaignId)))
          if (active) {
            setExports(items)
          }
        }

        if (permissions.canManage || permissions.canRemind) {
          const items = campaignArray(unwrapCampaignResult(await listCampaignNotificationsAction(campaignId)))
          if (active) {
            setNotifications(items)
          }
        }
      } catch (error_) {
        if (active) {
          setError(error_.message)
        }
      }
    }

    load()
    return () => {
      active = false
    }
  }, [campaignId, permissions.canExport, permissions.canManage, permissions.canRemind, refresh])

  useEffect(() => {
    if (!exports.some(item => ['PENDING', 'PROCESSING', 'RUNNING'].includes(item.status))) {
      return
    }

    const timeout = setTimeout(() => setRefresh(previous => previous + 1), 5000)
    return () => clearTimeout(timeout)
  }, [exports])

  const run = async operation => {
    setBusy(true)
    setError(null)
    try {
      await operation()
      setRefresh(previous => previous + 1)
    } catch (error_) {
      setError(error_.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <CampaignCard title='Exports et relances'>
      <p>Téléchargez les réponses transmises ou rappelez aux préleveurs qu’une réponse est attendue.</p>
      <CampaignNotice error>{error}</CampaignNotice>
      <CampaignNotice>{message}</CampaignNotice>
      <div className='mb-3 flex flex-wrap gap-3'>
        {permissions.canExport && (
          <button type='button' className='fr-btn fr-btn--secondary' disabled={busy} onClick={() => run(async () => {
            unwrapCampaignResult(await createCampaignExportAction(campaignId))
            setMessage('L’export est en préparation. Il contient les réponses transmises, sans les brouillons.')
          })}
          >Préparer un export Excel</button>
        )}
        {permissions.canRemind && (
          <button type='button' className='fr-btn fr-btn--secondary' disabled={busy} onClick={() => {
            if (confirmCampaignAction('Envoyer un rappel aux préleveurs qui n’ont pas encore transmis leur réponse ?')) {
              run(async () => {
                const result = unwrapCampaignResult(await remindCampaignAction(campaignId))
                setMessage(`${result.queuedCount} rappel(s) en cours d’envoi.`)
              })
            }
          }}
          >Relancer les réponses attendues</button>
        )}
        <button type='button' className='fr-btn fr-btn--tertiary' disabled={busy} onClick={() => setRefresh(previous => previous + 1)}>Actualiser</button>
      </div>
      {permissions.canExport && <>
        <h3 className='fr-h6'>Exports</h3>
        {exports.map(item => (
          <div key={item.id} className='mb-2 border border-gray-200 p-3'>
            <p>{campaignDate(item.createdAt, true, timezone)} — {DELIVERY_STATUS_LABELS[item.status] || item.status}</p>
            {['READY', 'SUCCEEDED', 'COMPLETED'].includes(item.status) && (
              <button type='button' className='fr-btn fr-btn--secondary fr-btn--sm' disabled={busy} onClick={() => run(async () => {
                const detail = unwrapCampaignResult(await getCampaignExportAction(campaignId, item.id))
                const url = new URL(detail.downloadUrl)
                if (!['https:', 'http:'].includes(url.protocol)) {
                  throw new Error('Lien de téléchargement invalide.')
                }

                setDownloadUrls(previous => ({...previous, [item.id]: url.href}))
              })}
              >Obtenir le lien de téléchargement</button>
            )}
            {downloadUrls[item.id] && <a className='fr-link fr-ml-2w' href={downloadUrls[item.id]} target='_blank' rel='noopener noreferrer'>Télécharger Excel (lien temporaire)</a>}
            {item.status === 'FAILED' && <p role='alert'>L’export a échoué. Vous pouvez en demander un nouveau.</p>}
          </div>
        ))}
        {exports.length === 0 && <p>Aucun export demandé.</p>}
      </>}
      {(permissions.canManage || permissions.canRemind) && <details className='mt-4 border-t border-gray-200 pt-3'>
        <summary className='cursor-pointer font-bold'>Historique des courriels ({notifications.length})</summary>
        <p className='fr-hint-text'>Une réponse transmise reste valide même si son courriel est encore en attente ou en échec.</p>
        {notifications.map(item => <p key={item.id} className='text-sm'>{campaignDate(item.sentAt || item.createdAt, true, timezone)} — {NOTIFICATION_KIND_LABELS[item.kind] || item.kind} : {DELIVERY_STATUS_LABELS[item.status] || item.status}</p>)}
        {notifications.length === 0 && <p>Aucun courriel.</p>}
      </details>}
    </CampaignCard>
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
    <details className='mb-3 border border-gray-200 p-3' open={initiallyOpen}>
      <summary className='cursor-pointer'>
        <span className='font-bold'>{campaignPointName(target)}</span>
        {target.preleveur?.label && <span> — {target.preleveur.label}</span>}
        <span className={`ml-2 text-sm ${issues.length > 0 ? 'text-amber-800' : 'text-green-800'}`}>{issues.length > 0 ? 'À vérifier' : 'Prêt'}</span>
      </summary>
      <div className='pt-3'>
        <p className='fr-text--sm'>{target.usage?.name || target.pointPrelevement?.usageName || 'Usage non renseigné'}</p>
        {issues.length > 0 && <ul className='mb-3 list-disc pl-5'>{issues.map(issue => <li key={issue.code} className='mb-2'>{issue.message}</li>)}</ul>}
        {target.pointPrelevement?.id && <Link className='fr-link' href={`/points-prelevement/${target.pointPrelevement.id}`} target='_blank' rel='noopener noreferrer'>Consulter la fiche du point (nouvel onglet)</Link>}
        {meters.map(meter => (
          <div key={meter.associationId || meter.id} className='mt-3 rounded bg-gray-50 p-3'>
            <p className='fr-mb-1w font-bold'>Compteur {campaignMeterName(meter)}</p>
            <p className='fr-mb-1w text-sm'>{meter.startDate ? `En service depuis le ${campaignDate(meter.startDate)}` : 'Date de mise en service non renseignée'}{meter.endDate ? ` — retiré le ${campaignDate(meter.endDate)}` : ' — toujours en service'}</p>
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

export const CampaignPointsSummary = ({campaign, targets, showOwnResponses, canAddMeter = false, onMeterSaved}) => (
  <CampaignCard title='Points de prélèvement'>
    {targets.map(target => (
      <div key={target.id} className='mb-3 border-t border-gray-200 pt-3'>
        <p className='fr-mb-1w'>{campaignPointName(target)}{target.meters?.length > 0 && ` — ${target.meters.map(meter => campaignMeterName(meter)).join(', ')}`}</p>
        <p className='fr-text--sm fr-mb-1w'>{[target.preleveur?.label, target.usage?.name || target.pointPrelevement?.usageName || 'Usage non renseigné'].filter(Boolean).join(' · ')}</p>
        {target.pointPrelevement?.id && <Link className='fr-link' href={`/points-prelevement/${target.pointPrelevement.id}`}>Voir le point</Link>}
        {canAddMeter && campaign.status === 'OPEN' && target.meters?.length > 0 && <details>
          <summary className='cursor-pointer text-sm underline'>Un compteur a été remplacé sur ce point ?</summary>
          <p className='mt-3 text-sm'>Ajoutez le nouveau compteur avec sa date réelle de mise en service. La personne autorisée à compléter les index devra ensuite renseigner le remplacement dans sa réponse, avec les index de l’ancien et du nouveau compteur. Les compteurs déjà enregistrés ne sont pas modifiés.</p>
          <MeterAssociation key={campaign.version} duringCollection campaignId={campaign.id} expectedVersion={campaign.version} target={target} firstReadingDate={[...(campaign.indexDates || [])].sort()[0]} lastReadingDate={[...(campaign.indexDates || [])].sort().at(-1)} onSaved={onMeterSaved} />
        </details>}
      </div>
    ))}
    {showOwnResponses && <div className='flex flex-wrap gap-3'>
      <Link className='fr-btn fr-btn--secondary' href={`/mes-index/${campaign.id}`}>Consulter mes index</Link>
      <Link className='fr-btn fr-btn--secondary' href={`/mes-besoins/${campaign.id}`}>Consulter mes besoins</Link>
    </div>}
  </CampaignCard>
)

const periodDescription = period => {
  const betweenReadings = period.kind === 'INDEX' && period.startReadingDate && period.endReadingDate
    && period.startDate?.slice(0, 10) === period.startReadingDate.slice(0, 10)
    && period.endDate?.slice(0, 10) === period.endReadingDate.slice(0, 10)
  return betweenReadings
    ? `Entre les relevés du ${campaignDate(period.startReadingDate)} et du ${campaignDate(period.endReadingDate)}`
    : `du ${campaignDate(period.startDate)} au ${campaignDate(campaignInclusiveEnd(period.endDate))} inclus`
}

export const CampaignOverview = ({campaign, targets}) => {
  const preleveurCount = new Set(targets.map(target => target.preleveurUserId).filter(Boolean)).size
  const usages = [...new Set(targets.map(target => target.usage?.name || target.pointPrelevement?.usageName).filter(Boolean))]
  const status = campaign.status === 'OPEN' ? 'Saisie ouverte' : (campaign.status === 'CLOSED' ? 'Saisie terminée' : 'Brouillon')
  return (
    <CampaignCard title='Vue d’ensemble' aside={<span className='fr-badge'>{status}</span>}>
      <dl className='grid gap-x-6 gap-y-2 md:grid-cols-[12rem_1fr]'>
        <dt className='font-bold'>Territoire</dt><dd>{campaign.zone?.name || 'Non renseigné'}</dd>
        <dt className='font-bold'>Organisme responsable</dt><dd>{campaign.owner?.label || campaign.ownerContact?.label || 'Non renseigné'}</dd>
        <dt className='font-bold'>Points concernés</dt><dd>{targets.length} point{targets.length > 1 ? 's' : ''} · {preleveurCount} préleveur{preleveurCount > 1 ? 's' : ''}</dd>
        {usages.length > 0 && <><dt className='font-bold'>Usages</dt><dd>{usages.join(' · ')}</dd></>}
        <dt className='font-bold'>Dates des relevés</dt><dd>{(campaign.indexDates || []).map(date => campaignDate(date)).join(' · ')}</dd>
        {campaign.opensAt && <><dt className='font-bold'>Début de saisie au plus tôt</dt><dd>{campaignDate(campaign.opensAt, false, campaign.timezone)}</dd></>}
        <dt className='font-bold'>Date limite de réponse</dt><dd>{campaignDeadlineLabel(campaign.closesAt, campaign.timezone)}</dd>
      </dl>
      {(campaign.periods || []).length > 0 && <details className='fr-mt-2w'>
        <summary className='cursor-pointer text-[#000091]'>Voir les périodes de prélèvements et de besoins</summary>
        {['INDEX', 'NEEDS'].map(kind => (
          <div key={kind} className='fr-mt-2w'>
            <h3 className='fr-h6 fr-mb-1w'>{kind === 'INDEX' ? 'Volumes prélevés' : 'Besoins en eau'}</h3>
            <ul>{campaign.periods.filter(period => period.kind === kind).map(period => <li key={period.id || `${kind}-${period.position}`}>{period.label} : {periodDescription(period)}</li>)}</ul>
          </div>
        ))}
      </details>}
      {campaign.openingMessage && <details className='fr-mt-2w'><summary className='cursor-pointer text-[#000091]'>Consigne aux préleveurs</summary><p className='fr-mt-1w whitespace-pre-wrap'>{campaign.openingMessage}</p></details>}
    </CampaignCard>
  )
}

const CampaignManagement = ({initialContext}) => {
  const router = useRouter()
  const [context, setContext] = useState(initialContext)
  const [followup, setFollowup] = useState(null)
  const [error, setError] = useState(null)
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const [editingConfiguration, setEditingConfiguration] = useState(false)
  const [view, setView] = useState(initialContext.campaign.status !== 'DRAFT' && initialContext.permissions.canFollowup ? 'responses' : 'points')
  const [sharingDirty, setSharingDirty] = useState(false)
  const {campaign, permissions, targets = []} = context
  const isDraft = campaign.status === 'DRAFT'
  const targetChecks = targets.map(target => ({target, issues: campaignPreparationIssues(campaign, target)}))
  const incompleteTargets = targetChecks.filter(({issues}) => issues.length > 0)
  const readyToOpen = targets.length > 0 && incompleteTargets.length === 0
  const canViewSharing = permissions.canManage || permissions.canManageSharing || Array.isArray(campaign.managers)
  const chooseView = next => {
    if (next === view) {
      return
    }

    if (view === 'sharing' && sharingDirty && !confirmCampaignAction('Quitter le partage sans enregistrer les modifications d’accès ?')) {
      return
    }

    setSharingDirty(false)
    setView(next)
  }

  const refresh = async () => setContext(unwrapCampaignResult(await getCampaignAction(campaign.id)))
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
      setView('points')
      setError(null)
      setMessage('Les informations enregistrées ont été actualisées.')
    } catch (error_) {
      setError(error_.message)
    } finally {
      setBusy(false)
    }
  }

  useEffect(() => {
    if (!permissions.canFollowup || isDraft) {
      return
    }

    let active = true
    const load = async () => {
      try {
        const result = await getCampaignFollowupAction(campaign.id)
        if (active) {
          setFollowup(unwrapCampaignResult(result))
        }
      } catch (error_) {
        if (active) {
          setError(error_.message)
        }
      }
    }

    load()
    return () => {
      active = false
    }
  }, [campaign.id, campaign.version, permissions.canFollowup, isDraft])
  const changeStatus = async open => {
    if (!permissions.canManage || !confirmCampaignAction(open ? 'Ouvrir la saisie et envoyer les invitations aux préleveurs ? Les points et les dates ne pourront plus être modifiés.' : 'Clôturer la saisie ? Les préleveurs ne pourront plus modifier leurs réponses.')) {
      return
    }

    setBusy(true)
    setError(null)
    try {
      unwrapCampaignResult(await setCampaignOpenAction(campaign.id, open, campaign.version))
      await refresh()
      if (open && permissions.canFollowup) {
        setView('responses')
      }

      setMessage(open ? 'La collecte est ouverte. Les invitations sont en cours de préparation. Retrouvez maintenant les réponses des préleveurs ci-dessous.' : 'La saisie est clôturée. Les réponses et les exports restent consultables.')
    } catch (error_) {
      setError(error_.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <CampaignShell title={campaign.name}>
      <CampaignNotice error>{error}</CampaignNotice>
      <CampaignNotice>{message}</CampaignNotice>
      {error && (
        <button type='button' className='fr-btn fr-btn--tertiary fr-mb-2w' disabled={busy || editingConfiguration} onClick={reload}>Actualiser les informations enregistrées</button>
      )}
      <CampaignOverview campaign={campaign} targets={targets} />
      {permissions.canManage && !editingConfiguration && <div className='fr-mb-3w'>
        <div className='flex flex-wrap gap-3'>
          {isDraft && <>
            <button type='button' className='fr-btn fr-btn--secondary' disabled={busy} onClick={() => {
              if (!sharingDirty || confirmCampaignAction('Quitter le partage sans enregistrer les modifications d’accès ?')) {
                setSharingDirty(false)
                setEditingConfiguration(true)
              }
            }}
            >Modifier le brouillon</button>
            <button className='fr-btn' type='button' disabled={busy || !readyToOpen || sharingDirty} aria-describedby='campaign-opening-help' onClick={() => changeStatus(true)}>{busy ? 'Ouverture…' : 'Ouvrir la saisie'}</button>
          </>}
          {campaign.status === 'OPEN' && <button className='fr-btn fr-btn--secondary' type='button' disabled={busy || sharingDirty} onClick={() => changeStatus(false)}>Clôturer la saisie</button>}
        </div>
        {isDraft && <p id='campaign-opening-help' className='fr-text--sm fr-mt-1w fr-mb-0'>{readyToOpen ? 'L’ouverture envoie les invitations et fige les dates et les points de cette collecte.' : 'Vérifiez les points ci-dessous avant d’ouvrir la saisie.'}</p>}
      </div>}
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
            setView('points')
            setMessage('Le brouillon est enregistré.')
          }} />
        </CampaignCard>
      ) : <>
        <nav className='mb-4 flex flex-wrap gap-2' aria-label='Rubriques de la collecte'>
          {!isDraft && permissions.canFollowup && <button type='button' className={`fr-btn ${view === 'responses' ? '' : 'fr-btn--secondary'}`} aria-pressed={view === 'responses'} onClick={() => chooseView('responses')}>Suivi des réponses</button>}
          <button type='button' className={`fr-btn ${view === 'points' ? '' : 'fr-btn--secondary'}`} aria-pressed={view === 'points'} onClick={() => chooseView('points')}>Points de prélèvement</button>
          {!isDraft && (permissions.canExport || permissions.canManage || permissions.canRemind) && <button type='button' className={`fr-btn ${view === 'delivery' ? '' : 'fr-btn--secondary'}`} aria-pressed={view === 'delivery'} onClick={() => chooseView('delivery')}>Exports et relances</button>}
          {canViewSharing && <button type='button' className={`fr-btn ${view === 'sharing' ? '' : 'fr-btn--secondary'}`} aria-pressed={view === 'sharing'} onClick={() => chooseView('sharing')}>Partage</button>}
        </nav>
        {view === 'points' && isDraft && permissions.canManage && <CampaignCard title='Points de prélèvement' aside={<button type='button' className='fr-btn fr-btn--tertiary fr-btn--sm' disabled={busy} onClick={reload}>Actualiser les points</button>}>
          {targets.length === 0 ? <CampaignNotice>Aucun point sélectionné. Utilisez « Modifier le brouillon » pour ajouter les points concernés.</CampaignNotice> : incompleteTargets.length > 0 && <CampaignNotice>{incompleteTargets.length} point{incompleteTargets.length > 1 ? 's sont' : ' est'} à vérifier avant l’ouverture.</CampaignNotice>}
          {targetChecks.map(({target, issues}) => <CampaignPreparationPoint key={target.id} campaign={campaign} target={target} issues={issues} initiallyOpen={incompleteTargets[0]?.target.id === target.id} onSaved={refreshMeters} />)}
        </CampaignCard>}
        {view === 'responses' && permissions.canFollowup && (followup ? <Followup campaignId={campaign.id} timezone={campaign.timezone} targets={followup.targets || targets} responses={followup.responses || []} /> : <p role='status'>Chargement des réponses…</p>)}
        {view === 'points' && (!isDraft || !permissions.canManage) && <CampaignPointsSummary campaign={campaign} targets={targets} showOwnResponses={!permissions.canFollowup && !isDraft} canAddMeter={permissions.canManage} onMeterSaved={refreshMeters} />}
        {view === 'delivery' && !isDraft && (permissions.canExport || permissions.canManage || permissions.canRemind) && <CampaignDelivery campaignId={campaign.id} timezone={campaign.timezone} permissions={permissions} />}
        {view === 'sharing' && canViewSharing && <CampaignSharing key={campaign.version} campaign={campaign} managerOptions={context.managerOptions} canManageSharing={permissions.canManageSharing === true} onDirtyChange={setSharingDirty} onSaved={async saved => {
          if (saved.accessRevoked) {
            router.replace('/campagnes')
            return
          }

          setContext(saved)
          if (!saved.permissions.canManage && !saved.permissions.canManageSharing && !Array.isArray(saved.campaign.managers)) {
            setView(saved.permissions.canFollowup ? 'responses' : 'points')
          }

          setMessage('Les accès sont enregistrés.')
        }} />}
      </>}
    </CampaignShell>
  )
}

export default CampaignManagement
