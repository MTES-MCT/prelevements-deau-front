'use client'

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState
} from 'react'

import {Alert} from '@codegouvfr/react-dsfr/Alert'
import {BarChart} from '@mui/x-charts/BarChart'
import Link from 'next/link'

import AdminPageShell from '@/components/admin/admin-page-shell.js'
import DateRangePicker from '@/components/ui/date-range-picker.js'
import {
  ADMIN_DASHBOARD_CHART_COLORS,
  ADMIN_DASHBOARD_LATEST_DECLARATIONS_HREF,
  ADMIN_DASHBOARD_MAX_RANGE_DAYS,
  aggregateAdminDashboardActivity,
  buildAdminDashboardDateRangePresets,
  getAdminDashboardDefaultRange,
  getParisDateInput,
  hasAdminDashboardDeclarationActivity
} from '@/lib/admin-dashboard.js'
import {getAdminDashboardAction} from '@/server/actions/admin-dashboard.js'

const AUTO_REFRESH_INTERVAL_MS = 60_000
const NUMBER_FORMATTER = new Intl.NumberFormat('fr-FR')
const DATE_FORMATTER = new Intl.DateTimeFormat('fr-FR', {
  day: 'numeric',
  month: 'short',
  timeZone: 'UTC'
})
const DATE_TIME_FORMATTER = new Intl.DateTimeFormat('fr-FR', {
  dateStyle: 'short',
  timeStyle: 'short'
})

const STATUS_STYLES = {
  info: {
    border: 'border-l-blue-600',
    background: 'bg-[var(--background-contrast-info)]',
    icon: 'ri-loader-4-line text-[var(--text-default-info)]',
    badge: 'fr-badge--info'
  },
  success: {
    border: 'border-l-green-600',
    background: 'bg-[var(--background-contrast-success)]',
    icon: 'ri-checkbox-circle-fill text-[var(--text-default-success)]',
    badge: 'fr-badge--success'
  },
  error: {
    border: 'border-l-red-600',
    background: 'bg-[var(--background-contrast-error)]',
    icon: 'ri-error-warning-fill text-[var(--text-default-error)]',
    badge: 'fr-badge--error'
  }
}

function formatNumber(value) {
  return NUMBER_FORMATTER.format(value ?? 0)
}

function formatDate(value) {
  return DATE_FORMATTER.format(new Date(`${value}T00:00:00.000Z`))
}

function formatDateTime(value) {
  return value ? DATE_TIME_FORMATTER.format(new Date(value)) : 'Non disponible'
}

function pluralize(value, singular, plural = `${singular}s`) {
  return value > 1 ? plural : singular
}

function formatDeclarationBreakdown(metrics = {}) {
  const manual = metrics.manualDeclarationsReceived ?? 0
  const spreadsheet = metrics.spreadsheetDeclarationsReceived ?? 0
  const other = metrics.otherDeclarationsReceived ?? 0
  const parts = [
    `${formatNumber(manual)} ${manual === 1 ? 'saisie rapide' : 'saisies rapides'}`,
    `${formatNumber(spreadsheet)} ${spreadsheet === 1 ? 'fichier' : 'fichiers'}`
  ]

  if (other > 0) {
    parts.push(`${formatNumber(other)} ${other === 1 ? 'autre dépôt' : 'autres dépôts'}`)
  }

  return parts.join(' · ')
}

const Metric = ({iconClassName, label, value, detail, tone = 'blue'}) => {
  const tones = {
    blue: 'bg-[var(--background-contrast-info)] text-[var(--text-default-info)]',
    green: 'bg-[var(--background-contrast-success)] text-[var(--text-default-success)]',
    red: 'bg-[var(--background-contrast-error)] text-[var(--text-default-error)]'
  }

  return (
    <div className='border border-[var(--border-default-grey)] bg-[var(--background-default-grey)] p-4'>
      <div className='flex items-start justify-between gap-3'>
        <div>
          <p className='fr-text--sm fr-mb-1v text-[var(--text-mention-grey)]'>{label}</p>
          <p className='fr-h3 fr-mb-0'>{formatNumber(value)}</p>
          {detail && <p className='fr-text--xs fr-mb-0 mt-1 text-[var(--text-mention-grey)]'>{detail}</p>}
        </div>
        <span className={`inline-flex h-9 w-9 shrink-0 items-center justify-center ${tones[tone]}`}>
          <span className={iconClassName} aria-hidden='true' />
        </span>
      </div>
    </div>
  )
}

const StatusItem = ({description, href, label, severity, status}) => {
  const style = STATUS_STYLES[severity]

  return (
    <div className={`flex min-h-full flex-col border-l-4 px-4 py-3 ${style.border} ${style.background}`}>
      <div className='flex items-start gap-3'>
        <span className={`${style.icon} mt-0.5 shrink-0`} aria-hidden='true' />
        <div className='min-w-0 flex-1'>
          <div className='flex flex-wrap items-center justify-between gap-2'>
            <h3 className='fr-text--sm fr-mb-0 font-semibold text-[var(--text-title-grey)]'>{label}</h3>
            <span className={`fr-badge fr-badge--sm fr-badge--no-icon ${style.badge}`}>{status}</span>
          </div>
          <p className='fr-text--xs fr-mb-2w mt-1 text-[var(--text-default-grey)]'>{description}</p>
        </div>
      </div>
      <Link className='fr-link fr-link--sm mt-auto self-start' href={href}>
        Consulter
      </Link>
    </div>
  )
}

function buildCurrentStatusItems(currentStatus = {}) {
  const inProgress = currentStatus.declarationsInProgress ?? 0
  const replayable = currentStatus.replayableDeclarations ?? 0
  const notificationRuns = currentStatus.notificationRuns ?? {}
  const notificationIssues = notificationRuns.count ?? 0
  const failedRecipients = notificationRuns.failedRecipients ?? 0

  return [
    {
      key: 'in-progress',
      label: 'Traitements en cours',
      status: inProgress > 0 ? formatNumber(inProgress) : 'Aucun',
      severity: inProgress > 0 ? 'info' : 'success',
      description: inProgress > 0
        ? `${formatNumber(inProgress)} ${pluralize(inProgress, 'dépôt')} en attente ou en cours d’analyse.`
        : 'Aucun dépôt n’est actuellement en cours de traitement.',
      href: '/declarations'
    },
    {
      key: 'replayable',
      label: 'Déclarations à rejouer',
      status: replayable > 0 ? formatNumber(replayable) : 'À jour',
      severity: replayable > 0 ? 'error' : 'success',
      description: replayable > 0
        ? `${formatNumber(replayable)} ${pluralize(replayable, 'déclaration')} ${replayable > 1 ? 'nécessitent' : 'nécessite'} un rejeu.`
        : 'Aucune déclaration ne nécessite de rejeu.',
      href: '/declarations/a-rejouer'
    },
    {
      key: 'notifications',
      label: 'Notifications à contrôler',
      status: notificationIssues > 0 ? formatNumber(notificationIssues) : 'À jour',
      severity: notificationIssues > 0 ? 'error' : 'success',
      description: notificationIssues > 0
        ? `${formatNumber(notificationIssues)} ${pluralize(notificationIssues, 'envoi')} en erreur ou bloqué, ${formatNumber(failedRecipients)} ${pluralize(failedRecipients, 'destinataire')} en échec.`
        : 'Aucun envoi de notification n’est en erreur ou bloqué.',
      href: '/notifications-declarations'
    }
  ]
}

function updatePeriodInURL(period) {
  const url = new URL(window.location.href)
  url.searchParams.set('startDate', period.startDate)
  url.searchParams.set('endDate', period.endDate)
  window.history.replaceState(window.history.state, '', `${url.pathname}${url.search}${url.hash}`)
}

const AdminDashboard = ({initialData, initialError = null}) => {
  const requestIdRef = useRef(0)
  const defaultRange = useMemo(() => getAdminDashboardDefaultRange(), [])
  const today = useMemo(() => getParisDateInput(), [])
  const presets = useMemo(() => buildAdminDashboardDateRangePresets(today), [today])
  const [data, setData] = useState(initialData)
  const [selectedRange, setSelectedRange] = useState(() => ({
    startDate: initialData?.period?.startDate ?? defaultRange.startDate,
    endDate: initialData?.period?.endDate ?? defaultRange.endDate
  }))
  const [error, setError] = useState(initialError)
  const [isRefreshing, setIsRefreshing] = useState(false)

  const refresh = useCallback(async (
    nextRange = selectedRange,
    {updateURL = false} = {}
  ) => {
    const requestId = requestIdRef.current + 1
    requestIdRef.current = requestId
    setIsRefreshing(true)
    setError(null)

    try {
      const result = await getAdminDashboardAction(nextRange)

      if (requestIdRef.current !== requestId) {
        return
      }

      const nextData = result.success ? result.data?.data : null

      if (!nextData) {
        setError(result.error || 'Impossible de charger le tableau de bord d’administration.')
        return
      }

      const resolvedRange = {
        startDate: nextData.period.startDate,
        endDate: nextData.period.endDate
      }

      setData(nextData)
      setSelectedRange(currentRange => (
        currentRange.startDate === resolvedRange.startDate
        && currentRange.endDate === resolvedRange.endDate
          ? currentRange
          : resolvedRange
      ))

      if (updateURL) {
        updatePeriodInURL(resolvedRange)
      }
    } catch {
      if (requestIdRef.current === requestId) {
        setError('Impossible de charger le tableau de bord d’administration.')
      }
    } finally {
      if (requestIdRef.current === requestId) {
        setIsRefreshing(false)
      }
    }
  }, [selectedRange])

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      if (document.visibilityState === 'visible') {
        refresh()
      }
    }, AUTO_REFRESH_INTERVAL_MS)

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        refresh()
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      window.clearInterval(intervalId)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [refresh])

  const chart = useMemo(
    () => aggregateAdminDashboardActivity(
      data?.activity?.daily ?? [],
      data?.period?.days ?? 0
    ),
    [data]
  )
  const tickInterval = Math.max(Math.ceil(chart.items.length / 10), 1)
  const statusItems = buildCurrentStatusItems(data?.currentStatus)
  const hasDeclarationActivity = hasAdminDashboardDeclarationActivity(data?.metrics)
  const showOtherDeclarations = (data?.metrics?.otherDeclarationsReceived ?? 0) > 0
  const chartSeries = [
    {
      data: chart.items.map(item => item.manualDeclarations),
      label: 'Saisies rapides',
      color: ADMIN_DASHBOARD_CHART_COLORS.manualDeclarations,
      stack: 'declarations',
      valueFormatter: value => formatNumber(value)
    },
    {
      data: chart.items.map(item => item.spreadsheetDeclarations),
      label: 'Fichiers déposés',
      color: ADMIN_DASHBOARD_CHART_COLORS.spreadsheetDeclarations,
      stack: 'declarations',
      valueFormatter: value => formatNumber(value)
    },
    ...(showOtherDeclarations
      ? [{
        data: chart.items.map(item => item.otherDeclarations),
        label: 'Autres dépôts',
        color: ADMIN_DASHBOARD_CHART_COLORS.otherDeclarations,
        stack: 'declarations',
        valueFormatter: value => formatNumber(value)
      }]
      : []),
    {
      data: chart.items.map(item => item.failed),
      label: 'Échecs de traitement',
      color: ADMIN_DASHBOARD_CHART_COLORS.failed,
      valueFormatter: value => formatNumber(value)
    }
  ]
  const periodLabel = data?.period?.days === 1
    ? 'sur la journée sélectionnée'
    : `sur les ${formatNumber(data?.period?.days)} jours sélectionnés`

  const controls = (
    <div className='flex items-center justify-end gap-2'>
      <p className='fr-text--xs fr-mb-0 text-right text-[var(--text-mention-grey)]' aria-live='polite'>
        Mis à jour le {formatDateTime(data?.generatedAt)}
      </p>
      <button
        aria-label='Actualiser les données'
        className='fr-btn fr-btn--tertiary-no-outline fr-btn--sm fr-btn--icon-only'
        disabled={isRefreshing}
        title='Actualiser les données'
        type='button'
        onClick={() => refresh()}
      >
        <span className={`ri-refresh-line ${isRefreshing ? 'animate-spin' : ''}`} aria-hidden='true' />
      </button>
    </div>
  )

  return (
    <AdminPageShell
      actions={controls}
      description='Supervisez les traitements et les incidents en cours sur la plateforme.'
      title='Administration'
    >
      {error && (
        <div className='mb-5'>
          <Alert
            closable
            small
            description={error}
            severity='error'
            title='Données temporairement indisponibles'
            onClose={() => setError(null)}
          />
        </div>
      )}

      {data && (
        <div aria-busy={isRefreshing}>
          <section aria-labelledby='admin-current-status-title' className='mb-8'>
            <div className='mb-4'>
              <h2 className='fr-h4 fr-mb-1v text-[var(--text-title-blue-france)]' id='admin-current-status-title'>État actuel</h2>
              <p className='fr-text--sm fr-mb-0 text-[var(--text-mention-grey)]'>Ces indicateurs ne dépendent pas de la période analysée.</p>
            </div>
            <div className='grid grid-cols-1 gap-3 lg:grid-cols-3'>
              {statusItems.map(({key, ...item}) => <StatusItem key={key} {...item} />)}
            </div>
          </section>

          <section aria-labelledby='admin-period-title'>
            <div className='mb-4 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between'>
              <div>
                <h2 className='fr-h4 fr-mb-1v text-[var(--text-title-blue-france)]' id='admin-period-title'>Activité sur une période</h2>
                <p className='fr-text--sm fr-mb-0 text-[var(--text-mention-grey)]'>Analysez les déclarations et les notifications sur la plage de dates de votre choix.</p>
              </div>
              <DateRangePicker
                align='right'
                className='w-full lg:w-[340px]'
                disabled={isRefreshing}
                endDate={selectedRange.endDate}
                hint={null}
                id='admin-dashboard-period'
                label='Période analysée'
                maxDate={today}
                maxRangeDays={ADMIN_DASHBOARD_MAX_RANGE_DAYS}
                presets={presets}
                presetsLabel='Périodes rapides'
                startDate={selectedRange.startDate}
                onChange={nextRange => refresh(nextRange, {updateURL: true})}
              />
            </div>

            <div className='mb-5 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4'>
              <Metric
                detail={formatDeclarationBreakdown(data.metrics)}
                iconClassName='ri-inbox-archive-line'
                label='Déclarations reçues'
                tone='blue'
                value={data.metrics?.declarationsReceived}
              />
              <Metric
                detail={`${formatNumber(data.metrics?.telemetryTransmissionsFailed)} ${data.metrics?.telemetryTransmissionsFailed === 1 ? 'transmission en échec' : 'transmissions en échec'}`}
                iconClassName='ri-focus-3-line'
                label='Télérelèves reçues'
                tone='blue'
                value={data.metrics?.telemetryTransmissionsReceived}
              />
              <Metric
                detail={`Hors télérelève, ${periodLabel}`}
                iconClassName='ri-error-warning-line'
                label='Traitements en échec'
                tone='red'
                value={data.metrics?.declarationsFailed}
              />
              <Metric
                detail={`${formatNumber(data.metrics?.notificationRecipientsFailed)} ${pluralize(data.metrics?.notificationRecipientsFailed ?? 0, 'destinataire')} en échec`}
                iconClassName='ri-mail-send-line'
                label='Emails envoyés'
                tone='green'
                value={data.metrics?.notificationRecipientsSent}
              />
            </div>

            <div className='min-w-0 border border-[var(--border-default-grey)] bg-[var(--background-default-grey)] p-4 md:p-5'>
              <div className='mb-3 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between'>
                <div>
                  <h3 className='fr-h5 fr-mb-1v'>Activité des déclarations</h3>
                  <p className='fr-text--sm fr-mb-0 text-[var(--text-mention-grey)]'>
                    Saisies rapides, fichiers déposés et échecs de traitement par {chart.granularity === 'week' ? 'semaine' : 'jour'}. La télérelève est suivie séparément dans l’indicateur ci-dessus.
                  </p>
                </div>
                <Link
                  className='fr-link fr-link--sm shrink-0'
                  href={ADMIN_DASHBOARD_LATEST_DECLARATIONS_HREF}
                >
                  Voir les dernières déclarations
                </Link>
              </div>
              {hasDeclarationActivity
                ? (
                  <BarChart
                    grid={{horizontal: true}}
                    height={320}
                    margin={{
                      bottom: 45,
                      left: 45,
                      right: 16,
                      top: 36
                    }}
                    series={chartSeries}
                    xAxis={[
                      {
                        data: chart.items.map(item => item.date),
                        scaleType: 'band',
                        tickLabelInterval: (_value, index) => index % tickInterval === 0 || index === chart.items.length - 1,
                        valueFormatter: value => chart.granularity === 'week' ? `Sem. ${formatDate(value)}` : formatDate(value)
                      }
                    ]}
                    yAxis={[{min: 0}]}
                  />
                )
                : (
                  <div className='flex h-[320px] items-center justify-center px-4 text-center'>
                    <p className='fr-text--sm fr-mb-0 text-[var(--text-mention-grey)]'>
                      Aucune saisie rapide ni aucun fichier déposé sur cette période.
                    </p>
                  </div>
                )}
            </div>
          </section>
        </div>
      )}
    </AdminPageShell>
  )
}

export default AdminDashboard
