'use client'

import {useMemo, useState, useTransition} from 'react'

import ToggleSwitch from '@codegouvfr/react-dsfr/ToggleSwitch'
import {Alert, Box, CircularProgress} from '@mui/material'
import {useRouter} from 'next/navigation'

import DeclarationNotificationEmailPreviewDialog from './declaration-notification-email-preview-dialog.js'

import {
  getDeclarationNotificationRunAction,
  previewDeclarationNotificationEmailAction,
  previewDeclarationNotificationAction,
  retryDeclarationNotificationFailuresAction,
  sendDeclarationNotificationNowAction,
  updateDeclarationNotificationSettingAction
} from '@/server/actions/declaration-notifications.js'

const TYPE_LABELS = {
  reminder: 'Rappel',
  followup: 'Relance'
}

const PERIOD_LABELS = {
  week: 'Hebdomadaire',
  month: 'Mensuel'
}

const TAB_DESCRIPTIONS = {
  upcoming: 'Prévisualisez les prochains rappels et relances calculés à partir des règles de déclaration.',
  sent: 'Consultez les envois déjà créés et leur statut de distribution.',
  errors: 'Retrouvez les envois bloqués ou partiellement échoués pour les analyser ou relancer les échecs.'
}

const EXCLUSION_REASON_FALLBACKS = {
  EXPLOITATION_INACTIVE: {
    label: 'Exploitation inactive',
    description: 'L’exploitation n’est pas active sur la période calculée.'
  },
  NO_ZONE: {
    label: 'Pas de zone de déclaration',
    description: 'Aucune zone active ne permet de déterminer le pas de temps attendu pour ce point.'
  },
  PERIOD_TYPE_MISMATCH: {
    label: 'Pas de temps différent',
    description: 'Ce point dépend d’un autre envoi, hebdomadaire ou mensuel.'
  },
  ALREADY_DECLARED: {
    label: 'Déclaration déjà reçue',
    description: 'Une déclaration existe déjà pour ce point sur la période.'
  },
  DECLARANT_EXCLUDED: {
    label: 'Déclarant exclu',
    description: 'Ce déclarant est configuré pour ne pas recevoir les rappels ou relances de déclaration.'
  },
  INVALID_EMAIL: {
    label: 'Email invalide',
    description: 'Une adresse email rattachée à ce déclarant n’a pas un format exploitable.'
  },
  NO_EMAIL: {
    label: 'Aucun email exploitable',
    description: 'Aucun email n’est disponible pour le préleveur ou ses collecteurs.'
  }
}

const EXCLUSION_REASON_SEVERITIES = {
  ALREADY_DECLARED: 'success',
  PERIOD_TYPE_MISMATCH: 'info',
  EXPLOITATION_INACTIVE: 'warning',
  NO_ZONE: 'warning',
  DECLARANT_EXCLUDED: 'warning',
  NO_EMAIL: 'warning',
  INVALID_EMAIL: 'error'
}

const EXCLUSION_BADGE_CLASSES = {
  success: 'fr-badge--success',
  info: 'fr-badge--info',
  warning: 'fr-badge--warning',
  error: 'fr-badge--error',
  default: 'fr-badge--grey'
}

const EXCLUSION_SUMMARY_CLASSES = {
  success: 'border-l-green-600 bg-green-50',
  info: 'border-l-blue-600 bg-blue-50',
  warning: 'border-l-yellow-600 bg-yellow-50',
  error: 'border-l-red-600 bg-red-50',
  default: 'border-l-gray-400 fr-background-alt--grey'
}

const DATE_FORMATTER = new Intl.DateTimeFormat('fr-FR', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  timeZone: 'UTC'
})

const MONTH_FORMATTER = new Intl.DateTimeFormat('fr-FR', {
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC'
})

function formatDateTime(value) {
  if (!value) {
    return 'Non renseigné'
  }

  return new Intl.DateTimeFormat('fr-FR', {
    dateStyle: 'medium',
    timeStyle: 'short'
  }).format(new Date(value))
}

function getIsoWeekStart(year, week) {
  const fourthJanuary = new Date(Date.UTC(year, 0, 4))
  const fourthJanuaryWeekday = fourthJanuary.getUTCDay() || 7
  const firstWeekMonday = new Date(fourthJanuary)
  firstWeekMonday.setUTCDate(fourthJanuary.getUTCDate() - fourthJanuaryWeekday + 1)

  const weekStart = new Date(firstWeekMonday)
  weekStart.setUTCDate(firstWeekMonday.getUTCDate() + ((week - 1) * 7))

  return weekStart
}

function formatPeriodLabel(periodType, periodKey, fallback) {
  const monthMatch = /^(\d{4})-(\d{2})$/.exec(periodKey || '')

  if (periodType === 'month' && monthMatch) {
    const [, year, month] = monthMatch
    const date = new Date(Date.UTC(Number(year), Number(month) - 1, 1))

    return `Mois de ${MONTH_FORMATTER.format(date)}`
  }

  const weekMatch = /^(\d{4})-W(\d{2})$/.exec(periodKey || '')

  if (periodType === 'week' && weekMatch) {
    const [, year, week] = weekMatch
    const start = getIsoWeekStart(Number(year), Number(week))
    const end = new Date(start)
    end.setUTCDate(start.getUTCDate() + 6)

    return `Semaine ${Number(week)} - du ${DATE_FORMATTER.format(start)} au ${DATE_FORMATTER.format(end)}`
  }

  return fallback || periodKey || 'Période non renseignée'
}

function formatList(values) {
  return values?.length > 0 ? values.join(', ') : 'Non renseigné'
}

function formatCount(value, singular, plural = `${singular}s`) {
  const count = value ?? 0
  return `${count} ${count > 1 ? plural : singular}`
}

function getExclusionReason(exclusion) {
  const fallback = EXCLUSION_REASON_FALLBACKS[exclusion.reason] ?? {
    label: exclusion.reason || 'Motif non renseigné',
    description: 'Motif technique non documenté.'
  }

  return {
    label: exclusion.reasonLabel || fallback.label,
    description: exclusion.reasonDescription || fallback.description
  }
}

function getExclusionSeverity(reason) {
  return EXCLUSION_REASON_SEVERITIES[reason] ?? 'default'
}

function getExclusionBadgeClass(reason) {
  return EXCLUSION_BADGE_CLASSES[getExclusionSeverity(reason)] ?? EXCLUSION_BADGE_CLASSES.default
}

function getExclusionSummaryClass(reason) {
  return EXCLUSION_SUMMARY_CLASSES[getExclusionSeverity(reason)] ?? EXCLUSION_SUMMARY_CLASSES.default
}

function getExclusionReasonCounts(exclusions = []) {
  const counts = new Map()

  for (const exclusion of exclusions) {
    const reason = getExclusionReason(exclusion)
    const current = counts.get(reason.label) ?? {
      reason: exclusion.reason,
      label: reason.label,
      description: reason.description,
      count: 0
    }

    current.count += 1
    counts.set(reason.label, current)
  }

  return [...counts.values()].sort((a, b) => b.count - a.count || a.label.localeCompare(b.label, 'fr'))
}

const RecipientsTable = ({recipients = [], onPreview, previewingRecipientKey = null}) => {
  if (recipients.length === 0) {
    return <Alert severity='info'>Aucun destinataire.</Alert>
  }

  return (
    <div className='overflow-auto border border-gray-200'>
      <table className='w-full text-sm border-collapse'>
        <thead>
          <tr className='bg-gray-50'>
            <th className='text-left p-2 border-b'>Email</th>
            <th className='text-left p-2 border-b'>Nom</th>
            <th className='text-left p-2 border-b'>Type</th>
            <th className='text-left p-2 border-b'>Zones</th>
            <th className='text-left p-2 border-b'>Points</th>
            <th className='text-left p-2 border-b'>Statut</th>
            <th className='text-left p-2 border-b'>Aperçu</th>
          </tr>
        </thead>
        <tbody>
          {recipients.map(recipient => {
            const recipientKey = recipient.id || recipient.email

            return (
              <tr key={recipientKey}>
                <td className='p-2 border-b'>{recipient.email}</td>
                <td className='p-2 border-b'>{recipient.name || [recipient.firstName, recipient.lastName].filter(Boolean).join(' ') || recipient.socialReason || 'Non renseigné'}</td>
                <td className='p-2 border-b'>{recipient.recipientRole === 'COLLECTEUR' ? 'Collecteur' : 'Préleveur déclarant'}</td>
                <td className='p-2 border-b'>{formatList((recipient.zones || []).map(zone => zone.name))}</td>
                <td className='p-2 border-b'>{formatList((recipient.points || []).map(point => point.name))}</td>
                <td className='p-2 border-b'>{recipient.statusLabel || recipient.status || 'Prévu'}</td>
                <td className='p-2 border-b'>
                  <button
                    className='fr-btn fr-btn--sm fr-btn--tertiary-no-outline'
                    disabled={previewingRecipientKey === recipientKey}
                    type='button'
                    onClick={() => onPreview(recipient)}
                  >
                    <span className='ri-eye-line fr-mr-1v' aria-hidden='true' />
                    <span>Aperçu du mail</span>
                  </button>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

const ExclusionsTable = ({exclusions = []}) => {
  if (exclusions.length === 0) {
    return <Alert severity='success'>Aucune exclusion détectée.</Alert>
  }

  const reasonCounts = getExclusionReasonCounts(exclusions)

  return (
    <div className='flex flex-col gap-3'>
      <div className='grid grid-cols-1 md:grid-cols-2 gap-2'>
        {reasonCounts.map(reason => (
          <div key={reason.label} className={`fr-p-2w border-l-4 ${getExclusionSummaryClass(reason.reason)}`}>
            <p className='fr-text--sm fr-text--bold fr-mb-1v'>
              {formatCount(reason.count, 'exclusion')} - {reason.label}
            </p>
            <p className='fr-text--xs fr-mb-0 text-gray-600'>{reason.description}</p>
          </div>
        ))}
      </div>

      <div className='overflow-auto border border-gray-200'>
        <table className='w-full text-sm border-collapse'>
          <thead>
            <tr className='bg-gray-50'>
              <th className='text-left p-2 border-b'>Motif</th>
              <th className='text-left p-2 border-b'>Explication</th>
              <th className='text-left p-2 border-b'>Déclarant</th>
              <th className='text-left p-2 border-b'>Point</th>
            </tr>
          </thead>
          <tbody>
            {exclusions.map(exclusion => {
              const key = [
                exclusion.reason,
                exclusion.declarantUserId,
                exclusion.pointPrelevementId,
                exclusion.expectedPeriodType,
                exclusion.zoneId,
                exclusion.invalidEmail
              ].filter(Boolean).join('-') || JSON.stringify(exclusion)
              const reason = getExclusionReason(exclusion)

              return (
                <tr key={key}>
                  <td className='p-2 border-b'>
                    <span className={`fr-badge fr-badge--sm ${getExclusionBadgeClass(exclusion.reason)}`}>{reason.label}</span>
                  </td>
                  <td className='p-2 border-b'>{reason.description}</td>
                  <td className='p-2 border-b'>{exclusion.declarantLabel || exclusion.declarantUserId || 'Non renseigné'}</td>
                  <td className='p-2 border-b'>{exclusion.pointName || exclusion.pointPrelevementId || 'Non renseigné'}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

const DetailSummary = ({selected}) => {
  const {mode, payload} = selected
  const isPreview = mode === 'preview'

  const items = isPreview
    ? [
      {
        value: payload.summary?.recipients ?? 0,
        label: 'emails uniques à envoyer'
      },
      {
        value: payload.summary?.expectedExploitations ?? 0,
        label: 'points attendus à déclarer'
      },
      {
        value: payload.summary?.exclusions ?? 0,
        label: 'points exclus de cet envoi'
      }
    ]
    : [
      {
        value: payload.recipientCount ?? 0,
        label: 'emails uniques prévus'
      },
      {
        value: payload.sentCount ?? 0,
        label: 'emails envoyés'
      },
      {
        value: payload.failedCount ?? 0,
        label: 'échecs'
      }
    ]

  return (
    <div className='grid grid-cols-1 md:grid-cols-3 gap-3 fr-mb-4w'>
      {items.map(item => (
        <div key={item.label} className='fr-p-3w fr-background-alt--grey'>
          <p className='fr-h4 fr-mb-1v'>{item.value}</p>
          <p className='fr-text--sm fr-mb-0'>{item.label}</p>
        </div>
      ))}
    </div>
  )
}

const NotificationRules = () => (
  <section className='border border-gray-200 bg-white p-4'>
    <h2 className='fr-h5 fr-mb-2w'>Règles d’envoi</h2>
    <ul className='fr-text--sm fr-mb-0'>
      <li>Les rappels et relances sont calculés à partir du pas de temps configuré sur chaque zone. Si un point dépend de plusieurs zones, le pas de temps le plus fréquent est retenu.</li>
      <li>Les rappels hebdomadaires partent le lundi à 9h pour la semaine précédente ; les relances hebdomadaires partent le lundi à 17h pour cette même semaine.</li>
      <li>Les rappels mensuels partent le 28 à 9h pour le mois en cours ; les relances mensuelles partent le 5 à 9h pour le mois précédent.</li>
      <li>La désactivation d’un type bloque ses envois automatiques, ses envois manuels et ses reprises d’échecs. Elle n’interrompt pas un envoi déjà démarré.</li>
      <li>Les destinataires sont les préleveurs déclarants et les collecteurs rattachés aux points attendus, avec leurs alias email. Un même email n’est envoyé qu’une seule fois par envoi.</li>
      <li>Les exploitations hors période d’activité, sans zone exploitable, déjà déclarées pour une relance, sans email ou relevant d’un autre pas de temps sont exclues et listées dans le détail.</li>
    </ul>
  </section>
)

const DeclarationNotificationsAdmin = ({upcoming = [], runs = []}) => {
  const router = useRouter()
  const [upcomingItems, setUpcomingItems] = useState(upcoming)
  const [activeTab, setActiveTab] = useState('upcoming')
  const [selected, setSelected] = useState(null)
  const [error, setError] = useState(null)
  const [successMessage, setSuccessMessage] = useState(null)
  const [isConfirmingSendNow, setIsConfirmingSendNow] = useState(false)
  const [emailPreviewState, setEmailPreviewState] = useState({open: false})
  const [isPending, startTransition] = useTransition()

  const failedRuns = useMemo(
    () => runs.filter(run => ['FAILED', 'PARTIAL_FAILURE', 'BLOCKED'].includes(run.status)),
    [runs]
  )
  const isNotificationEnabled = item => upcomingItems.find(setting =>
    setting.notificationType === item.notificationType && setting.periodType === item.periodType
  )?.enabled !== false

  const updateSetting = (item, enabled) => {
    const isSameDefinition = value => value.notificationType === item.notificationType && value.periodType === item.periodType

    setError(null)
    setSuccessMessage(null)
    setIsConfirmingSendNow(false)
    setUpcomingItems(current => current.map(value => isSameDefinition(value) ? {...value, enabled} : value))
    setSelected(current => current && isSameDefinition(current.payload) ? {...current, enabled} : current)

    startTransition(async () => {
      const result = await updateDeclarationNotificationSettingAction(
        item.notificationType,
        item.periodType,
        enabled
      )

      if (result.success) {
        const notificationLabel = item.notificationType === 'followup' ? 'Relances' : 'Rappels'
        const isFeminine = item.notificationType === 'followup'
        const periodLabel = item.periodType === 'week'
          ? 'hebdomadaires'
          : (isFeminine ? 'mensuelles' : 'mensuels')
        const statusLabel = enabled
          ? (isFeminine ? 'activées' : 'activés')
          : (isFeminine ? 'désactivées' : 'désactivés')

        setSuccessMessage(
          `${notificationLabel} ${periodLabel} ${statusLabel}.`
        )
        router.refresh()
      } else {
        setUpcomingItems(current => current.map(value => isSameDefinition(value) ? {...value, enabled: !enabled} : value))
        setSelected(current => current && isSameDefinition(current.payload) ? {...current, enabled: !enabled} : current)
        setError(result.error)
      }
    })
  }

  const closeEmailPreview = () => {
    setEmailPreviewState(current => ({...current, open: false}))
  }

  const openEmailPreview = async recipient => {
    if (!selected) {
      return
    }

    const recipientKey = recipient.id || recipient.email
    const options = selected.mode === 'run'
      ? {
        runId: selected.payload.id,
        recipientId: recipient.id
      }
      : {
        notificationType: selected.payload.notificationType,
        periodType: selected.payload.periodType,
        periodKey: selected.payload.periodKey,
        email: recipient.email,
        scheduledFor: selected.sendNowOptions?.scheduledFor
      }

    setEmailPreviewState({
      open: true,
      loading: true,
      error: null,
      data: null,
      recipientKey
    })

    const result = await previewDeclarationNotificationEmailAction(options)

    if (result.success) {
      setEmailPreviewState(current => current.recipientKey === recipientKey
        ? {
          ...current,
          loading: false,
          data: result.data.data || result.data
        }
        : current)
    } else {
      setEmailPreviewState(current => current.recipientKey === recipientKey
        ? {
          ...current,
          loading: false,
          error: result.error
        }
        : current)
    }
  }

  const loadPreview = item => {
    setError(null)
    setSuccessMessage(null)
    setIsConfirmingSendNow(false)
    startTransition(async () => {
      const result = await previewDeclarationNotificationAction({
        notificationType: item.notificationType,
        periodType: item.periodType,
        periodKey: item.periodKey,
        scheduledFor: item.scheduledFor
      })

      if (result.success) {
        const periodLabel = formatPeriodLabel(item.periodType, item.periodKey, item.periodLabel)

        setSelected({
          mode: 'preview',
          enabled: item.enabled !== false,
          title: `${TYPE_LABELS[item.notificationType]} ${PERIOD_LABELS[item.periodType]} - ${periodLabel}`,
          payload: result.data.data || result.data,
          sendNowOptions: {
            notificationType: item.notificationType,
            periodType: item.periodType,
            periodKey: item.periodKey,
            scheduledFor: item.scheduledFor
          }
        })
      } else {
        setError(result.error)
      }
    })
  }

  const loadRunDetails = async run => {
    const result = await getDeclarationNotificationRunAction(run.id)

    if (result.success) {
      const run = result.data.data
      const periodLabel = formatPeriodLabel(run.periodType, run.periodKey, run.periodLabel)

      setSelected({
        mode: 'run',
        title: `${TYPE_LABELS[run.notificationType]} ${PERIOD_LABELS[run.periodType]} - ${periodLabel}`,
        payload: run
      })
    } else {
      setError(result.error)
    }
  }

  const loadRun = run => {
    setError(null)
    setSuccessMessage(null)
    setIsConfirmingSendNow(false)
    startTransition(async () => {
      await loadRunDetails(run)
    })
  }

  const retryFailures = run => {
    setError(null)
    setSuccessMessage(null)
    setIsConfirmingSendNow(false)
    startTransition(async () => {
      const result = await retryDeclarationNotificationFailuresAction(run.id)

      if (result.success) {
        await loadRunDetails(run)
      } else {
        setError(result.error)
      }
    })
  }

  const sendNow = () => {
    setError(null)
    setSuccessMessage(null)
    startTransition(async () => {
      const result = await sendDeclarationNotificationNowAction(selected.sendNowOptions)

      if (result.success) {
        const run = result.data.data
        const periodLabel = formatPeriodLabel(run.periodType, run.periodKey, run.periodLabel)
        setIsConfirmingSendNow(false)
        setSelected({
          mode: 'run',
          title: `${TYPE_LABELS[run.notificationType]} ${PERIOD_LABELS[run.periodType]} - ${periodLabel}`,
          payload: run
        })
        if (run.status === 'BLOCKED') {
          setError(run.error || 'Envoi bloqué.')
        } else {
          setSuccessMessage('Envoi lancé.')
        }

        router.refresh()
      } else {
        setError(result.error)
      }
    })
  }

  const visibleRuns = activeTab === 'errors' ? failedRuns : runs
  const selectedRecipientCount = selected?.payload?.summary?.recipients ?? selected?.payload?.recipientCount ?? 0
  const selectedPeriodLabel = selected
    ? formatPeriodLabel(selected.payload.periodType, selected.payload.periodKey, selected.payload.periodLabel)
    : 'cette période'

  return (
    <div className='flex flex-col gap-5'>
      <NotificationRules />

      <div className='flex flex-wrap gap-2'>
        {[
          {key: 'upcoming', label: 'À venir'},
          {key: 'sent', label: 'Envoyés'},
          {key: 'errors', label: 'Erreurs'}
        ].map(tab => (
          <button
            key={tab.key}
            className={`fr-btn ${activeTab === tab.key ? '' : 'fr-btn--tertiary-no-outline'}`}
            type='button'
            onClick={() => {
              setActiveTab(tab.key)
              setSelected(null)
              setIsConfirmingSendNow(false)
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <p className='fr-text--sm fr-mb-0 text-gray-600'>{TAB_DESCRIPTIONS[activeTab]}</p>

      {error && <Alert severity='error'>{error}</Alert>}
      {successMessage && <Alert severity='success'>{successMessage}</Alert>}
      {isPending && <CircularProgress size={24} />}

      {activeTab === 'upcoming' && (
        <div className='grid grid-cols-1 lg:grid-cols-2 gap-4'>
          {upcomingItems.map(item => {
            const enabled = item.enabled !== false
            const settingId = `declaration-notification-${item.notificationType}-${item.periodType}`

            return (
              <section
                key={`${item.notificationType}-${item.periodType}`}
                className={`border border-gray-200 border-l-4 p-4 ${enabled ? 'border-l-green-600 bg-green-50' : 'border-l-yellow-600 bg-yellow-50'}`}
              >
                <div className='flex justify-between items-start gap-4 fr-mb-1w'>
                  <p className='fr-text--sm fr-mb-0 text-gray-600'>{TYPE_LABELS[item.notificationType]} {PERIOD_LABELS[item.periodType]}</p>
                  <ToggleSwitch
                    showCheckedHint
                    checked={enabled}
                    className='shrink-0'
                    disabled={isPending}
                    id={settingId}
                    label='Autoriser les envois'
                    labelPosition='left'
                    onChange={checked => updateSetting(item, checked)}
                  />
                </div>
                <h2 className='fr-h5 fr-mb-1w'>{formatPeriodLabel(item.periodType, item.periodKey, item.periodLabel)}</h2>
                <p className='fr-text--sm fr-mb-1w'>
                  Départ prévu : {formatDateTime(item.scheduledFor)}
                </p>
                <div className='grid grid-cols-3 gap-2 fr-mb-3w'>
                  <div><strong>{item.summary?.recipients ?? 0}</strong><br />emails uniques à envoyer</div>
                  <div><strong>{item.summary?.expectedExploitations ?? 0}</strong><br />points attendus à déclarer</div>
                  <div><strong>{item.summary?.exclusions ?? 0}</strong><br />points exclus de cet envoi</div>
                </div>
                <button className='fr-btn fr-btn--secondary' type='button' onClick={() => loadPreview(item)}>
                  Voir le détail avant envoi
                </button>
              </section>
            )
          })}
        </div>
      )}

      {activeTab !== 'upcoming' && (
        <div className='overflow-auto border border-gray-200 bg-white'>
          <table className='w-full text-sm border-collapse'>
            <thead>
              <tr className='bg-gray-50'>
                <th className='text-left p-2 border-b'>Type</th>
                <th className='text-left p-2 border-b'>Période</th>
                <th className='text-left p-2 border-b'>Prévu</th>
                <th className='text-left p-2 border-b'>Statut</th>
                <th className='text-left p-2 border-b'>Destinataires</th>
                <th className='text-left p-2 border-b'>Actions</th>
              </tr>
            </thead>
            <tbody>
              {visibleRuns.map(run => (
                <tr key={run.id}>
                  <td className='p-2 border-b'>{TYPE_LABELS[run.notificationType]} {PERIOD_LABELS[run.periodType]}</td>
                  <td className='p-2 border-b'>{formatPeriodLabel(run.periodType, run.periodKey, run.periodLabel)}</td>
                  <td className='p-2 border-b'>{formatDateTime(run.scheduledFor)}</td>
                  <td className='p-2 border-b'>{run.statusLabel}</td>
                  <td className='p-2 border-b'>{run.sentCount}/{run.recipientCount}</td>
                  <td className='p-2 border-b'>
                    <div className='flex gap-2 flex-wrap'>
                      <button className='fr-btn fr-btn--sm fr-btn--secondary' type='button' onClick={() => loadRun(run)}>
                        Détail
                      </button>
                      {run.failedCount > 0 && (
                        <button
                          className='fr-btn fr-btn--sm fr-btn--tertiary'
                          disabled={isPending || !isNotificationEnabled(run)}
                          title={isNotificationEnabled(run) ? undefined : 'Ce type de notification est désactivé.'}
                          type='button'
                          onClick={() => retryFailures(run)}
                        >
                          Relancer les échecs
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {selected && (
        <Box className='border border-gray-200 bg-white p-4'>
          <h2 className='fr-h4'>{selected.title}</h2>
          <p className='fr-text--sm text-gray-600'>
            {selected.mode === 'preview'
              ? 'Aperçu recalculé avant envoi. Aucun mail n’est envoyé tant que vous ne confirmez pas.'
              : 'Détail de l’envoi enregistré et de son état de distribution.'}
          </p>
          {selected.mode === 'preview' && selected.enabled === false && (
            <Alert severity='warning' className='fr-mb-3w'>
              Ce type de notification est désactivé. Vous pouvez consulter les destinataires et les aperçus, mais aucun envoi ne peut être lancé.
            </Alert>
          )}
          <DetailSummary selected={selected} />
          {selected.mode === 'preview' && (
            <div className='flex flex-wrap items-center gap-3 fr-mb-4w'>
              {isConfirmingSendNow ? (
                <div className='fr-p-3w fr-background-alt--grey w-full'>
                  <p className='fr-text--sm fr-text--bold fr-mb-1w'>
                    Confirmer l’envoi immédiat à {formatCount(selectedRecipientCount, 'destinataire')} pour {selectedPeriodLabel}&nbsp;?
                  </p>
                  <p className='fr-text--sm text-gray-600'>
                    L’action crée un envoi Brevo maintenant. Les destinataires déjà envoyés pour cette notification ne seront pas renvoyés.
                  </p>
                  <div className='fr-btns-group fr-btns-group--inline fr-btns-group--sm fr-mb-0'>
                    <button
                      className='fr-btn'
                      disabled={isPending || selectedRecipientCount === 0 || selected.enabled === false}
                      type='button'
                      onClick={sendNow}
                    >
                      {isPending ? 'Envoi…' : 'Confirmer l’envoi'}
                    </button>
                    <button
                      className='fr-btn fr-btn--secondary'
                      disabled={isPending}
                      type='button'
                      onClick={() => setIsConfirmingSendNow(false)}
                    >
                      Annuler
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <button
                    className='fr-btn'
                    disabled={isPending || selectedRecipientCount === 0 || selected.enabled === false}
                    type='button'
                    onClick={() => setIsConfirmingSendNow(true)}
                  >
                    Envoyer maintenant
                  </button>
                  <p className='fr-text--sm fr-mb-0 text-gray-600'>
                    Une confirmation sera demandée avant de créer l’envoi.
                  </p>
                </>
              )}
            </div>
          )}
          <h3 className='fr-h5'>Destinataires</h3>
          <RecipientsTable
            previewingRecipientKey={emailPreviewState.loading ? emailPreviewState.recipientKey : null}
            recipients={selected.payload.recipients}
            onPreview={openEmailPreview}
          />
          {selected.mode === 'preview' && (
            <>
              <h3 className='fr-h5 fr-mt-4w'>Exclusions</h3>
              <ExclusionsTable exclusions={selected.payload.exclusions} />
            </>
          )}
        </Box>
      )}

      <DeclarationNotificationEmailPreviewDialog state={emailPreviewState} onClose={closeEmailPreview} />
    </div>
  )
}

export default DeclarationNotificationsAdmin
