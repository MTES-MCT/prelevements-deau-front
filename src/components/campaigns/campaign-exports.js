'use client'

import {useEffect, useRef, useState} from 'react'

import Alert from '@codegouvfr/react-dsfr/Alert'
import {Badge} from '@codegouvfr/react-dsfr/Badge'
import Button from '@codegouvfr/react-dsfr/Button'

import {CampaignCard} from '@/components/campaigns/campaign-ui.js'
import {campaignArray, campaignDate, unwrapCampaignResult} from '@/lib/collection-campaigns.js'
import {createCampaignExportAction, getCampaignExportAction, listCampaignExportsAction} from '@/server/actions/campaigns.js'

const REFRESH_INTERVAL_MS = 4000
const running = status => ['PENDING', 'PROCESSING', 'RUNNING'].includes(status)
const completed = status => ['COMPLETED', 'READY', 'SUCCEEDED'].includes(status)
const exportStatus = status => {
  if (completed(status)) {
    return {label: 'Disponible', severity: 'success'}
  }

  if (running(status)) {
    return {label: status === 'PENDING' ? 'En attente' : 'En cours', severity: 'info'}
  }

  return status === 'FAILED' ? {label: 'Échec', severity: 'error'} : {label: 'État inconnu', severity: 'info'}
}

const uniqueExports = items => [...new Map(items.map(item => [item.id, item])).values()]
const failedMessage = 'Le fichier n’a pas pu être généré. Vous pouvez demander un nouvel export.'

const downloadUrl = value => {
  try {
    const url = new URL(value)
    if (['https:', 'http:'].includes(url.protocol) && !url.username && !url.password) {
      return url.href
    }
  } catch {}

  throw new Error('Lien de téléchargement invalide.')
}

export const CampaignExportHistoryItem = ({item, timezone, downloading, disabled, onDownload}) => {
  const status = exportStatus(item.status)
  return (
    <div className='rounded border border-[var(--border-default-grey)] bg-[var(--background-default-grey)] p-3 md:p-4'>
      <div className='flex flex-col gap-3 md:flex-row md:items-start md:justify-between'>
        <div className='flex min-w-0 flex-col gap-2'>
          <div className='flex flex-wrap items-center gap-2'>
            <h3 className='fr-mb-0 break-words text-base font-bold text-gray-900'>{item.fileName || 'Export de la campagne'}</h3>
            <Badge noIcon small severity={status.severity}>{status.label}</Badge>
          </div>
          <p className='fr-text--sm fr-mb-0 text-gray-700'>Relevés, volumes prélevés et besoins en eau · Excel</p>
          <p className='fr-text--xs fr-mb-0 text-gray-600'>Demandé le {campaignDate(item.createdAt, true, timezone)}</p>
        </div>
        {completed(item.status) && <div className='flex shrink-0 flex-wrap gap-2'>
          <Button className='whitespace-nowrap' size='small' priority='secondary' disabled={disabled || downloading} onClick={() => onDownload(item)}>{downloading ? 'Téléchargement…' : 'Télécharger'}</Button>
        </div>}
      </div>
      {item.status === 'FAILED' && <div className='mt-3'><Alert small severity='error' description={failedMessage} /></div>}
    </div>
  )
}

export const CampaignExportFeedback = ({items, timezone, downloadingId, disabled, onCloseAll, onDismiss, onDownload}) => {
  if (items.length === 0) {
    return null
  }

  const runningCount = items.filter(item => running(item.status)).length
  return (
    <aside className='fixed bottom-4 left-4 right-4 z-[1000] border border-gray-200 bg-white shadow-[0_8px_24px_rgba(0,0,0,0.18)] sm:left-auto sm:w-[26rem]' aria-atomic='true' aria-live='polite' role='status'>
      <div className='flex items-start justify-between gap-3 border-b border-gray-200 px-4 py-3'>
        <div>
          <p className='fr-mb-0 font-semibold text-gray-900'>Suivi des exports</p>
          <p className='fr-text--xs fr-mb-0 text-gray-600'>{runningCount > 0 ? `${runningCount} fichier${runningCount > 1 ? 's' : ''} en préparation` : 'Tous les traitements sont terminés'}</p>
        </div>
        <button type='button' className='fr-btn fr-btn--tertiary-no-outline fr-btn--sm fr-icon-close-line fr-btn--icon-left shrink-0' aria-label='Masquer le suivi des exports' onClick={onCloseAll} />
      </div>
      <div className='max-h-[min(60vh,28rem)] overflow-y-auto'>
        {items.map(item => {
          const isRunning = running(item.status)
          const isCompleted = completed(item.status)
          const title = isRunning ? (item.status === 'PENDING' ? 'Export en attente' : 'Génération en cours') : (isCompleted ? 'Export prêt' : 'Échec de la génération')
          return (
            <div key={item.id} className='flex items-start gap-3 border-b border-gray-100 px-4 py-3 last:border-b-0'>
              {isRunning ? <span className='mt-0.5 h-5 w-5 shrink-0 animate-spin rounded-full border-2 border-[#000091] border-t-transparent motion-reduce:animate-none' aria-hidden='true' /> : <span className={`${isCompleted ? 'fr-icon-check-line text-[#18753c]' : 'fr-icon-error-warning-line text-[#ce0500]'} mt-0.5 shrink-0 [&::after]:![--icon-size:1.25rem] [&::before]:![--icon-size:1.25rem]`} aria-hidden='true' />}
              <div className='min-w-0 flex-1'>
                <p className='fr-text--sm fr-mb-0 font-semibold text-gray-900'>{title}</p>
                <p className='fr-text--xs fr-mb-0 text-gray-700'>{isRunning ? 'Le fichier est en cours de préparation.' : (isCompleted ? 'Votre fichier Excel est disponible au téléchargement.' : failedMessage)}</p>
                <p className='fr-text--xs fr-mb-0 text-gray-600'>Demandé le {campaignDate(item.createdAt, true, timezone)}</p>
                {isCompleted && <div className='mt-2'><Button size='small' disabled={disabled || downloadingId === item.id} onClick={() => onDownload(item)}>{downloadingId === item.id ? 'Téléchargement…' : 'Télécharger'}</Button></div>}
              </div>
              <button type='button' className='fr-btn fr-btn--tertiary-no-outline fr-btn--sm fr-icon-close-line fr-btn--icon-left shrink-0' aria-label={`Masquer le suivi de l’export du ${campaignDate(item.createdAt, true, timezone)}`} onClick={() => onDismiss(item.id)} />
            </div>
          )
        })}
      </div>
    </aside>
  )
}

const CampaignExports = ({campaignId, timezone = 'Europe/Paris', permissions = {}, disabled = false}) => {
  const [snapshot, setSnapshot] = useState(null)
  const [loading, setLoading] = useState(true)
  const [historyError, setHistoryError] = useState(null)
  const [downloadError, setDownloadError] = useState(null)
  const [error, setError] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [downloadingId, setDownloadingId] = useState(null)
  const [feedbackIds, setFeedbackIds] = useState([])
  const [refresh, setRefresh] = useState(0)
  const mounted = useRef(true)
  const loadingRef = useRef(true)
  const operation = useRef(null)
  const itemsRef = useRef({campaignId, items: []})
  const dismissed = useRef(new Set())
  const current = useRef(null)
  current.current = {campaignId, allowed: permissions.canExport === true, disabled}
  const exports = snapshot?.campaignId === campaignId ? snapshot.items : []
  const hasRunningExport = exports.some(item => running(item.status))
  const allowed = permissions.canExport === true
  const controlsDisabled = disabled || submitting || Boolean(downloadingId)
  const createDisabled = controlsDisabled || loading || snapshot?.campaignId !== campaignId || hasRunningExport
  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
    }
  }, [])

  useEffect(() => {
    if (itemsRef.current.campaignId !== campaignId) {
      itemsRef.current = {campaignId, items: []}
      dismissed.current = new Set()
      setFeedbackIds([])
    }

    if (!allowed) {
      return
    }

    let active = true
    loadingRef.current = true
    setLoading(true)
    const load = async () => {
      try {
        const items = uniqueExports(campaignArray(unwrapCampaignResult(await listCampaignExportsAction(campaignId))))
        if (active) {
          const next = {campaignId, items}
          itemsRef.current = next
          setSnapshot(next)
          setHistoryError(null)
          setFeedbackIds(previous => [...new Set([...previous, ...items.filter(item => running(item.status) && !dismissed.current.has(item.id)).map(item => item.id)])])
        }
      } catch (error_) {
        if (active) {
          setHistoryError(error_.message)
        }
      } finally {
        if (active) {
          loadingRef.current = false
          setLoading(false)
        }
      }
    }

    load()
    return () => {
      active = false
    }
  }, [campaignId, allowed, refresh])

  useEffect(() => {
    if (!allowed || !hasRunningExport || loadingRef.current || historyError) {
      return
    }

    const timer = setTimeout(() => setRefresh(previous => previous + 1), REFRESH_INTERVAL_MS)
    return () => clearTimeout(timer)
  }, [allowed, hasRunningExport, loading, historyError, refresh])

  const canAct = () => mounted.current && current.current.campaignId === campaignId && current.current.allowed && !current.current.disabled
  const startOperation = name => {
    if (!canAct() || operation.current) {
      return null
    }

    const token = {name}
    operation.current = token
    return token
  }

  const finishOperation = token => {
    if (operation.current === token) {
      operation.current = null
      if (mounted.current && current.current.campaignId === campaignId) {
        setSubmitting(false)
        setDownloadingId(null)
      }
    }
  }

  const submit = async event => {
    event.preventDefault()
    if (loading || snapshot?.campaignId !== campaignId || itemsRef.current.items.some(item => running(item.status))) {
      return
    }

    const token = startOperation('create')
    if (!token) {
      return
    }

    setSubmitting(true)
    setError(null)
    try {
      const created = unwrapCampaignResult(await createCampaignExportAction(campaignId))
      if (!created?.id) {
        throw new Error('La demande d’export n’a pas pu être confirmée. Actualisez l’historique avant de réessayer.')
      }

      if (canAct()) {
        const next = {campaignId, items: uniqueExports([created, ...itemsRef.current.items.filter(item => item.id !== created.id)])}
        itemsRef.current = next
        setSnapshot(next)
        setFeedbackIds(previous => [created.id, ...previous.filter(id => id !== created.id)])
        setRefresh(previous => previous + 1)
      }
    } catch (error_) {
      if (canAct()) {
        setError(error_.message)
      }
    } finally {
      finishOperation(token)
    }
  }

  const download = async item => {
    if (!itemsRef.current.items.some(existing => existing.id === item.id && completed(existing.status))) {
      return
    }

    const token = startOperation('download')
    if (!token) {
      return
    }

    setDownloadingId(item.id)
    setError(null)
    setDownloadError(null)
    try {
      const result = unwrapCampaignResult(await getCampaignExportAction(campaignId, item.id))
      const url = downloadUrl(result.downloadUrl)

      if (canAct()) {
        const link = document.createElement('a')
        link.href = url
        link.rel = 'noopener noreferrer'
        document.body.append(link)
        link.click()
        link.remove()
      }
    } catch (error_) {
      if (canAct()) {
        setDownloadError(error_.message)
      }
    } finally {
      finishOperation(token)
    }
  }

  const dismiss = ids => {
    for (const id of ids) {
      dismissed.current.add(id)
    }

    setFeedbackIds(previous => previous.filter(id => !ids.includes(id)))
  }

  if (!allowed) {
    return null
  }

  return (
    <div>
      <CampaignCard title='Paramètres de l’export' description='Le fichier Excel reprend les dernières réponses transmises pour les points et les périodes de cette campagne, dans votre périmètre autorisé. Les brouillons et corrections non transmis sont exclus.'>
        <form className='flex flex-col gap-4' onSubmit={submit}>
          {error && <Alert small severity='error' description={error} />}
          <div className='flex flex-wrap gap-2'>{['Relevés de compteurs', 'Volumes prélevés', 'Besoins en eau'].map(label => <span key={label} className='inline-flex max-w-full items-center gap-1 bg-gray-100 px-2 py-1 text-xs text-gray-700'>{label}</span>)}</div>
          <p className='fr-text--sm fr-mb-0 text-[var(--text-mention-grey)]'>La génération du fichier peut prendre quelques minutes. Une fois prêt, il est disponible dans l’historique en bas de cette page.</p>
          <div><Button type='submit' disabled={createDisabled}>{submitting ? 'Demande en cours…' : 'Créer l’export'}</Button></div>
          {hasRunningExport && <p className='fr-text--sm fr-mb-0 text-gray-600'>Un export est déjà en préparation. Vous pourrez en créer un nouveau une fois ce traitement terminé.</p>}
        </form>
      </CampaignCard>
      <CampaignCard title='Historique des exports' aside={hasRunningExport && !historyError && <span className='fr-text--sm fr-mb-0 text-[var(--text-mention-grey)]'>Mise à jour automatique en cours</span>}>
        <div className='flex flex-col gap-3' aria-busy={loading}>
          {downloadError && <Alert small severity='error' description={downloadError} />}
          {historyError && <><Alert small severity='error' description={historyError} /><div><Button size='small' priority='secondary' disabled={loading} onClick={() => setRefresh(previous => previous + 1)}>Réessayer</Button></div></>}
          {loading && exports.length === 0 && <p role='status' className='fr-text--sm fr-mb-0 text-gray-600'>Chargement de l’historique des exports…</p>}
          {!loading && !historyError && exports.length === 0 && <Alert small severity='info' description='Aucun export demandé pour le moment.' />}
          <div className='flex flex-col gap-3'>{exports.map(item => <CampaignExportHistoryItem key={item.id} item={item} timezone={timezone} downloading={downloadingId === item.id} disabled={controlsDisabled} onDownload={download} />)}</div>
        </div>
      </CampaignCard>
      <CampaignExportFeedback items={feedbackIds.map(id => exports.find(item => item.id === id)).filter(Boolean)} timezone={timezone} downloadingId={downloadingId} disabled={controlsDisabled} onCloseAll={() => dismiss(feedbackIds)} onDismiss={id => dismiss([id])} onDownload={download} />
    </div>
  )
}

export default CampaignExports
