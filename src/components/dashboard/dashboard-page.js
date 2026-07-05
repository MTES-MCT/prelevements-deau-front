'use client'

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState
} from 'react'

import {SegmentedControl} from '@codegouvfr/react-dsfr/SegmentedControl'
import Link from 'next/link'
import {
  usePathname,
  useRouter,
  useSearchParams
} from 'next/navigation'

import DashboardPointsMap from '@/components/dashboard/dashboard-points-map.js'
import DashboardVolumesChart from '@/components/dashboard/dashboard-volumes-chart.js'
import SeriesExplorer from '@/components/points-prelevement/series-explorer.js'
import GroupedMultiselect from '@/components/ui/GroupedMultiselect/index.js'
import {
  getDeclarationsURL,
  getMyDeclarationsURL,
  getPointsPrelevementURL
} from '@/lib/urls.js'
import {
  getUsageColor,
  getUsageLabel,
  isDashboardVisibleUsage
} from '@/lib/water-uses.js'
import {getDashboardTerritoryAction} from '@/server/actions/dashboard.js'

const ZONE_TYPE_LABELS = {
  DEPARTEMENT: 'Département',
  REGION: 'Région',
  SAGE: 'SAGE'
}
const WATER_BODY_TYPE_OPTIONS = [
  {value: 'SUPERFICIELLE', label: 'Eau superficielle'},
  {value: 'SURFACE', label: 'Eau de surface'},
  {value: 'SOUTERRAIN', label: 'Eau souterraine'},
  {value: 'TRANSITION', label: 'Eau de transition'}
]
const WATER_BODY_TYPE_VALUES = WATER_BODY_TYPE_OPTIONS.map(option => option.value)
const DECLARATION_PERIOD_SEGMENTS = [
  {
    value: 'month',
    label: 'Mois',
    iconId: 'fr-icon-calendar-line'
  },
  {
    value: 'week',
    label: 'Semaines',
    iconId: 'fr-icon-calendar-2-line'
  }
]
const NO_WATER_BODY_TYPES_SENTINEL = '__none__'
const VOLUME_CHART_SUBTITLE = 'Volumes représentant uniquement les déclarations enregistrées sur Partageons l’Eau, pouvant être inférieurs aux volumes réels du territoire.'
const EMPTY_ARRAY = []

function formatZoneLabel(zone) {
  const typeLabel = ZONE_TYPE_LABELS[zone.type] ?? zone.type
  return `${typeLabel} ${zone.name}`
}

function formatCount(count, singular, plural = `${singular}s`) {
  return `${new Intl.NumberFormat('fr-FR').format(count)} ${count > 1 ? plural : singular}`
}

function getGreetingName(user) {
  if (user?.role === 'DECLARANT' && user.declarantRole === 'COLLECTEUR') {
    return [user.firstName, user.lastName].filter(Boolean).join(' ')
      || user.socialReason
      || user.firstName
      || ''
  }

  if (user?.role === 'DECLARANT') {
    return user.socialReason || user.firstName || [user.firstName, user.lastName].filter(Boolean).join(' ')
  }

  return user?.firstName || user?.name?.split(' ')?.[0] || ''
}

function buildZoneSearchValue(zoneCodes) {
  return zoneCodes.join(',')
}

function buildWaterBodyTypesSearchValue(waterBodyTypes) {
  return waterBodyTypes.length > 0
    ? waterBodyTypes.join(',')
    : NO_WATER_BODY_TYPES_SENTINEL
}

function areAllWaterBodyTypesSelected(waterBodyTypes) {
  return waterBodyTypes.length === WATER_BODY_TYPE_VALUES.length
    && WATER_BODY_TYPE_VALUES.every(value => waterBodyTypes.includes(value))
}

function getExpectedWaterBodyTypesSearchValue(waterBodyTypes) {
  return areAllWaterBodyTypesSelected(waterBodyTypes)
    ? ''
    : buildWaterBodyTypesSearchValue(waterBodyTypes)
}

function isDashboardSearchSynced(searchParams, {
  period,
  periodType,
  waterBodyTypes,
  year,
  zoneCodes
}) {
  return searchParams.get('zones') === buildZoneSearchValue(zoneCodes)
    && searchParams.get('periodType') === periodType
    && searchParams.get('period') === period
    && searchParams.get('year') === String(year)
    && (searchParams.get('waterBodyTypes') ?? '') === getExpectedWaterBodyTypesSearchValue(waterBodyTypes)
    && !searchParams.has('waterBodyType')
}

function getDeclarationProgress(item) {
  if (!item?.totalPointsCount) {
    return 0
  }

  return Math.round((item.declaredPointsCount / item.totalPointsCount) * 100)
}

const DashboardError = ({error}) => {
  if (!error) {
    return null
  }

  return (
    <div className='fr-alert fr-alert--error fr-mb-4w'>
      <p>{error}</p>
    </div>
  )
}

const RefreshSpinner = ({className = 'h-4 w-4'}) => (
  <span
    aria-hidden='true'
    className={`inline-block shrink-0 animate-spin rounded-full border-2 border-[#000091]/25 border-t-[#000091] ${className}`}
  />
)

const DashboardRefreshStatus = ({isLoading}) => {
  if (!isLoading) {
    return null
  }

  return (
    <div
      aria-atomic='true'
      aria-live='polite'
      className='fixed left-4 right-4 top-20 z-50 inline-flex items-center justify-center gap-2 border border-[#000091]/20 bg-white px-4 py-3 text-sm font-medium text-[#000091] shadow-lg sm:left-auto sm:justify-start'
      role='status'
    >
      <RefreshSpinner />
      <span>Actualisation du tableau de bord...</span>
    </div>
  )
}

const InlineRefreshStatus = () => (
  <span className='inline-flex items-center gap-2 text-sm font-medium text-[#000091]'>
    <RefreshSpinner className='h-3.5 w-3.5' />
    <span>Actualisation...</span>
  </span>
)

function getDeclarationIntro(declarationCreation) {
  const canCreateDeclaration = declarationCreation?.canCreateDeclaration
    ?? declarationCreation?.allowedDeclarationTypes?.length > 0
  const canCreateQuickDeclaration = declarationCreation?.canCreateQuickDeclaration ?? false

  if (canCreateQuickDeclaration && canCreateDeclaration) {
    return 'Saisissez vos index, volumes prélevés ou volumes rejetés directement sur la plateforme, ou déposez un fichier après contrôle automatique.'
  }

  if (canCreateQuickDeclaration) {
    return 'Saisissez vos index, volumes prélevés ou volumes rejetés directement sur la plateforme.'
  }

  return 'Déposez vos fichiers de déclaration après contrôle automatique.'
}

const DeclarationCreationCard = ({declarationCreation}) => {
  const allowedDeclarationTypes = declarationCreation?.allowedDeclarationTypes ?? EMPTY_ARRAY
  const canCreateDeclaration = declarationCreation?.canCreateDeclaration ?? allowedDeclarationTypes.length > 0
  const canCreateQuickDeclaration = declarationCreation?.canCreateQuickDeclaration ?? false
  const canCreateAnyDeclaration = canCreateDeclaration || canCreateQuickDeclaration

  if (!canCreateAnyDeclaration) {
    return null
  }

  return (
    <section className='mt-6 border border-gray-200 bg-white p-5 md:p-6'>
      <div className='flex flex-col gap-4 md:flex-row md:items-center md:justify-between'>
        <div>
          <h2 className='fr-h3 fr-mb-1w'>Déclarer mes prélèvements en eau</h2>
          <p className='fr-text--sm fr-mb-0 max-w-[680px] text-gray-700'>
            {getDeclarationIntro(declarationCreation)}
            {declarationCreation?.declarantRole === 'COLLECTEUR'
              ? <> Vous sélectionnerez ensuite le déclarant concerné.</>
              : null}
          </p>
        </div>

        <Link
          className='fr-btn fr-btn--icon-left fr-icon-add-line shrink-0'
          href='/mes-declarations/new'
        >
          Nouvelle déclaration
        </Link>
      </div>
    </section>
  )
}

function getVolumeChartForRole(chart, isDeclarant) {
  if (!isDeclarant) {
    return chart
  }

  if (chart?.key === 'withdrawn') {
    return {
      ...chart,
      title: 'Volumes déclarés par usage'
    }
  }

  return chart
}

function isCollectorDashboard(user, dashboard) {
  return user?.declarantRole === 'COLLECTEUR' || dashboard?.scope === 'COLLECTOR'
}

function isDeclarantDashboard(user, dashboard) {
  return user?.role === 'DECLARANT'
    || dashboard?.scope === 'DECLARANT'
    || dashboard?.scope === 'COLLECTOR'
}

function getDashboardVariant(user, dashboard) {
  const isDeclarant = isDeclarantDashboard(user, dashboard)
  const isCollector = isCollectorDashboard(user, dashboard)

  return {
    isCollector,
    isDeclarant,
    isPreleveurDeclarant: isDeclarant && !isCollector
  }
}

function getDashboardLinks({isDeclarant, isPreleveurDeclarant}) {
  return {
    declarationsURL: isDeclarant ? getMyDeclarationsURL() : getDeclarationsURL(),
    declarationsURLLabel: isDeclarant ? 'Accéder au suivi' : 'Accéder à la page',
    pointsSectionTitle: isPreleveurDeclarant ? 'Mes points de prélèvement' : 'Points de prélèvement',
    pointsURL: getPointsPrelevementURL()
  }
}

const KeyFiguresSection = ({
  pointsURL,
  showUsageDistribution,
  totalPoints,
  usageDistribution
}) => (
  <section className='border border-gray-200 bg-white p-5 md:p-6'>
    <h2 className='fr-h3 fr-mb-4w'>Chiffres clés du territoire</h2>

    <div className={`grid gap-4 ${showUsageDistribution ? 'md:grid-cols-2' : ''}`}>
      <div className='border border-gray-200 p-4'>
        <div className='flex items-start justify-between gap-4'>
          <div>
            <p className='fr-text--sm fr-mb-1v text-gray-600'>Nombre total de points</p>
            <p className='fr-h4 fr-mb-0'>
              {formatCount(totalPoints, 'point de prélèvement', 'points de prélèvement')}
            </p>
          </div>

          <Link className='fr-link shrink-0 text-sm' href={pointsURL}>
            Accéder à la page
          </Link>
        </div>
      </div>

      {showUsageDistribution && (
        <div className='border border-gray-200 p-4'>
          <p className='fr-text--sm fr-mb-2v text-gray-600'>Répartition par usage</p>

          {usageDistribution.length > 0 ? (
            <ul className='m-0 flex list-none flex-col gap-2 p-0'>
              {usageDistribution.map(item => (
                <li
                  key={item.usage.id ?? item.usage.code}
                  className='flex items-center justify-between gap-4'
                >
                  <span className='flex min-w-0 items-center gap-2'>
                    <span
                      aria-hidden='true'
                      className='block h-3 w-3 shrink-0 rounded-full'
                      style={{backgroundColor: getUsageColor(item.usage)}}
                    />
                    <span className='truncate' title={getUsageLabel(item.usage)}>
                      {getUsageLabel(item.usage)}
                    </span>
                  </span>
                  <span className='shrink-0 font-semibold'>
                    {formatCount(item.count, 'point')}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className='fr-text--sm fr-mb-0 text-gray-600'>
              Aucune exploitation avec usage renseigné.
            </p>
          )}
        </div>
      )}
    </div>
  </section>
)

const PointsMapSection = ({
  isLoading,
  points,
  pointsSectionTitle,
  pointsURL,
  showCollecteurs,
  showPreleveurs
}) => (
  <section className='mt-6 border border-gray-200 bg-white p-5 md:p-6'>
    <div className='mb-4 flex flex-col gap-2 md:flex-row md:items-center md:justify-between'>
      <div className='flex flex-wrap items-baseline gap-x-4 gap-y-1'>
        <h2 className='fr-h3 fr-mb-0'>{pointsSectionTitle}</h2>
        <Link className='fr-link text-sm' href={pointsURL}>
          Accéder à la page
        </Link>
      </div>

      {isLoading && <InlineRefreshStatus />}
    </div>

    <DashboardPointsMap
      points={points}
      showCollecteurs={showCollecteurs}
      showPreleveurs={showPreleveurs}
    />
  </section>
)

const DeclarantSeriesSection = ({
  seriesOptions,
  user
}) => (
  <section className='mt-6 border border-gray-200 bg-white p-5 md:p-6'>
    <SeriesExplorer
      preleveurId={user?.id}
      seriesOptions={seriesOptions}
      title='Évolution de mes prélèvements'
    />
  </section>
)

const RegisteredPrelevementsSection = ({
  declarationsURL,
  declarationsURLLabel,
  isLoading,
  onPeriodChange,
  onPeriodTypeChange,
  periodOptions,
  registeredPrelevementsByUsage,
  selectedPeriod,
  selectedPeriodType,
  showReminder
}) => (
  <section className='mt-6 border border-gray-200 bg-white p-5 md:p-6'>
    <div className='mb-5 flex flex-col gap-4 md:flex-row md:items-start md:justify-between'>
      <div className='flex flex-wrap items-baseline gap-x-4 gap-y-1'>
        <h2 className='fr-h3 fr-mb-0'>
          Prélèvements enregistrés sur Partageons l&apos;Eau
        </h2>
        <Link className='fr-link text-sm' href={declarationsURL}>
          {declarationsURLLabel}
        </Link>
      </div>

      <div className='flex w-full flex-col gap-2 md:ml-auto md:w-auto md:flex-row md:items-start md:justify-end'>
        <SegmentedControl
          hideLegend
          small
          legend='Afficher par'
          segments={DECLARATION_PERIOD_SEGMENTS.map(segment => ({
            iconId: segment.iconId,
            label: segment.label,
            nativeInputProps: {
              checked: selectedPeriodType === segment.value,
              disabled: isLoading,
              onChange: () => onPeriodTypeChange(segment.value)
            }
          }))}
        />

        <div className='fr-select-group mb-0 md:w-[260px]'>
          <label className='sr-only' htmlFor='dashboard-declaration-period'>
            Période
          </label>
          <select
            className='fr-select'
            disabled={isLoading || periodOptions.length === 0}
            id='dashboard-declaration-period'
            value={selectedPeriod}
            onChange={onPeriodChange}
          >
            {periodOptions.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>

    {registeredPrelevementsByUsage.length > 0 ? (
      <div className='grid gap-4 md:grid-cols-2'>
        {registeredPrelevementsByUsage.map(item => {
          const usageColor = getUsageColor(item.usage)
          const usageLabel = getUsageLabel(item.usage)
          const progress = getDeclarationProgress(item)

          return (
            <article
              key={item.usage.id ?? item.usage.code}
              className='flex min-h-[190px] flex-col border border-gray-200 p-3'
            >
              <div
                aria-label={`${progress} % des points ont fait l'objet d'une déclaration`}
                className='h-4 w-full bg-gray-200'
                role='img'
              >
                <div
                  className='h-full'
                  style={{
                    backgroundColor: usageColor,
                    backgroundImage: 'repeating-linear-gradient(45deg, rgba(255, 255, 255, 0.45) 0, rgba(255, 255, 255, 0.45) 5px, transparent 5px, transparent 10px)',
                    width: `${progress}%`
                  }}
                />
              </div>

              <h3 className='fr-mb-2v mt-3 flex items-center gap-2 text-lg font-semibold'>
                <span
                  aria-hidden='true'
                  className='block h-3 w-3 shrink-0 rounded-full'
                  style={{backgroundColor: usageColor}}
                />
                {usageLabel}
              </h3>

              <div className='flex flex-col gap-1 text-xs text-gray-700'>
                <p className='fr-mb-0 flex items-baseline justify-between gap-4'>
                  <span>Points ayant fait l&apos;objet d&apos;une déclaration</span>
                  <strong className='shrink-0 tabular-nums'>{item.declaredPointsCount}</strong>
                </p>
                <p className='fr-mb-0 flex items-baseline justify-between gap-4'>
                  <span>Points n&apos;ayant pas fait l&apos;objet d&apos;une déclaration</span>
                  <strong className='shrink-0 tabular-nums'>{item.missingPointsCount}</strong>
                </p>
              </div>

              {showReminder && (
                <div className='mt-auto pt-3'>
                  <div className='w-fit border border-gray-200 bg-gray-100 px-3 py-2 text-xs text-gray-500'>
                    À venir, relancer les préleveurs en retard
                  </div>
                </div>
              )}
            </article>
          )
        })}
      </div>
    ) : (
      <p className='fr-text--sm fr-mb-0 text-gray-600'>
        Aucun prélèvement enregistré pour les zones sélectionnées.
      </p>
    )}
  </section>
)

const DashboardPage = ({
  declarationCreation = null,
  declarantSeriesOptions = null,
  initialDashboard,
  initialError,
  user
}) => {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const hasSyncedDefaultZonesRef = useRef(false)
  const [dashboard, setDashboard] = useState(initialDashboard)
  const [selectedZoneCodes, setSelectedZoneCodes] = useState(initialDashboard?.selectedZoneCodes ?? [])
  const [selectedPeriodType, setSelectedPeriodType] = useState(
    initialDashboard?.registeredPrelevements?.selectedPeriodType ?? 'month'
  )
  const [selectedPeriod, setSelectedPeriod] = useState(
    initialDashboard?.registeredPrelevements?.selectedPeriod ?? ''
  )
  const [selectedVolumeYear, setSelectedVolumeYear] = useState(
    initialDashboard?.volumesByUsage?.selectedYear ?? ''
  )
  const [selectedWaterBodyTypes, setSelectedWaterBodyTypes] = useState(
    initialDashboard?.volumesByUsage?.selectedWaterBodyTypes ?? WATER_BODY_TYPE_VALUES
  )
  const [error, setError] = useState(initialError)
  const [isLoading, setIsLoading] = useState(false)

  const zones = dashboard?.zones ?? EMPTY_ARRAY
  const points = dashboard?.points ?? EMPTY_ARRAY
  const usageDistribution = (dashboard?.metrics?.usageDistribution ?? EMPTY_ARRAY)
    .filter(item => isDashboardVisibleUsage(item.usage))
  const registeredPrelevements = dashboard?.registeredPrelevements
  const registeredPrelevementsByUsage = (registeredPrelevements?.byUsage ?? EMPTY_ARRAY)
    .filter(item => isDashboardVisibleUsage(item.usage))
  const periodOptions = registeredPrelevements?.periodOptions ?? EMPTY_ARRAY
  const volumesByUsage = dashboard?.volumesByUsage
  const volumeYearOptions = volumesByUsage?.yearOptions ?? EMPTY_ARRAY
  const totalPoints = dashboard?.metrics?.totalPoints ?? 0
  const {
    isCollector,
    isDeclarant,
    isPreleveurDeclarant
  } = getDashboardVariant(user, dashboard)
  const greetingName = getGreetingName(user)
  const {
    declarationsURL,
    declarationsURLLabel,
    pointsSectionTitle,
    pointsURL
  } = getDashboardLinks({isDeclarant, isPreleveurDeclarant})
  const withdrawnChart = getVolumeChartForRole(volumesByUsage?.charts?.withdrawn, isDeclarant)
  const dischargedChart = getVolumeChartForRole(volumesByUsage?.charts?.discharged, isDeclarant)

  const zoneOptions = useMemo(() =>
    zones.map(zone => {
      const label = formatZoneLabel(zone)

      return {
        value: zone.code,
        content: label,
        title: label
      }
    }), [zones])

  const normalizeZoneCodes = useCallback(codes => {
    const selectedSet = new Set(codes)
    return zones
      .map(zone => zone.code)
      .filter(code => selectedSet.has(code))
  }, [zones])

  const syncURL = useCallback((
    zoneCodes,
    {
      period = selectedPeriod,
      periodType = selectedPeriodType,
      replace = true,
      waterBodyTypes = selectedWaterBodyTypes,
      year = selectedVolumeYear
    } = {}
  ) => {
    const nextSearchParams = new URLSearchParams(searchParams.toString())
    nextSearchParams.set('zones', buildZoneSearchValue(zoneCodes))

    if (periodType) {
      nextSearchParams.set('periodType', periodType)
    } else {
      nextSearchParams.delete('periodType')
    }

    if (period) {
      nextSearchParams.set('period', period)
    } else {
      nextSearchParams.delete('period')
    }

    if (year) {
      nextSearchParams.set('year', year)
    } else {
      nextSearchParams.delete('year')
    }

    if (Array.isArray(waterBodyTypes) && !areAllWaterBodyTypesSelected(waterBodyTypes)) {
      nextSearchParams.set('waterBodyTypes', buildWaterBodyTypesSearchValue(waterBodyTypes))
    } else {
      nextSearchParams.delete('waterBodyTypes')
    }

    nextSearchParams.delete('waterBodyType')
    nextSearchParams.delete('month')
    nextSearchParams.delete('week')

    const search = nextSearchParams.toString()
    const url = search ? `${pathname}?${search}` : pathname

    if (replace) {
      router.replace(url, {scroll: false})
      return
    }

    router.push(url, {scroll: false})
  }, [
    pathname,
    router,
    searchParams,
    selectedPeriod,
    selectedPeriodType,
    selectedVolumeYear,
    selectedWaterBodyTypes
  ])

  useEffect(() => {
    if (
      hasSyncedDefaultZonesRef.current
      || selectedZoneCodes.length === 0
      || !selectedPeriod
      || !selectedPeriodType
      || !selectedVolumeYear
    ) {
      return
    }

    hasSyncedDefaultZonesRef.current = true

    if (!isDashboardSearchSynced(searchParams, {
      period: selectedPeriod,
      periodType: selectedPeriodType,
      waterBodyTypes: selectedWaterBodyTypes,
      year: selectedVolumeYear,
      zoneCodes: selectedZoneCodes
    })) {
      syncURL(selectedZoneCodes, {
        period: selectedPeriod,
        periodType: selectedPeriodType,
        waterBodyTypes: selectedWaterBodyTypes,
        year: selectedVolumeYear
      })
    }
  }, [
    searchParams,
    selectedPeriod,
    selectedPeriodType,
    selectedVolumeYear,
    selectedWaterBodyTypes,
    selectedZoneCodes,
    syncURL
  ])

  const reloadDashboard = useCallback(async ({
    period = selectedPeriod,
    periodType = selectedPeriodType,
    waterBodyTypes = selectedWaterBodyTypes,
    year = selectedVolumeYear,
    zoneCodes = selectedZoneCodes
  } = {}) => {
    setIsLoading(true)
    setError(null)

    try {
      syncURL(zoneCodes, {
        period,
        periodType,
        waterBodyTypes,
        year
      })

      const result = await getDashboardTerritoryAction({
        period,
        periodType,
        waterBodyTypes,
        year,
        zoneCodes
      })

      if (result.success) {
        const nextSelectedZoneCodes = result.data.selectedZoneCodes ?? zoneCodes
        const nextSelectedPeriodType = result.data.registeredPrelevements?.selectedPeriodType ?? periodType
        const nextSelectedPeriod = result.data.registeredPrelevements?.selectedPeriod ?? period
        const nextSelectedYear = result.data.volumesByUsage?.selectedYear ?? year
        const nextSelectedWaterBodyTypes = result.data.volumesByUsage?.selectedWaterBodyTypes ?? waterBodyTypes

        setDashboard(result.data)
        setSelectedZoneCodes(nextSelectedZoneCodes)
        setSelectedPeriodType(nextSelectedPeriodType)
        setSelectedPeriod(nextSelectedPeriod)
        setSelectedVolumeYear(nextSelectedYear)
        setSelectedWaterBodyTypes(nextSelectedWaterBodyTypes)
        syncURL(nextSelectedZoneCodes, {
          period: nextSelectedPeriod,
          periodType: nextSelectedPeriodType,
          waterBodyTypes: nextSelectedWaterBodyTypes,
          year: nextSelectedYear
        })
      } else {
        setError(result.error || 'Impossible de charger le tableau de bord.')
      }
    } finally {
      setIsLoading(false)
    }
  }, [
    selectedPeriod,
    selectedPeriodType,
    selectedVolumeYear,
    selectedWaterBodyTypes,
    selectedZoneCodes,
    syncURL
  ])

  const handleZoneChange = useCallback(async nextValue => {
    const nextZoneCodes = normalizeZoneCodes(nextValue)

    if (nextZoneCodes.length === 0) {
      return
    }

    setSelectedZoneCodes(nextZoneCodes)
    await reloadDashboard({zoneCodes: nextZoneCodes})
  }, [normalizeZoneCodes, reloadDashboard])

  const handlePeriodTypeChange = useCallback(async nextPeriodType => {
    if (nextPeriodType === selectedPeriodType) {
      return
    }

    setSelectedPeriodType(nextPeriodType)
    setSelectedPeriod('')
    await reloadDashboard({
      period: '',
      periodType: nextPeriodType
    })
  }, [reloadDashboard, selectedPeriodType])

  const handlePeriodChange = useCallback(async event => {
    const nextPeriod = event.target.value

    setSelectedPeriod(nextPeriod)
    await reloadDashboard({period: nextPeriod})
  }, [reloadDashboard])

  const handleVolumeYearChange = useCallback(async nextYear => {
    setSelectedVolumeYear(nextYear)
    await reloadDashboard({year: nextYear})
  }, [reloadDashboard])

  const handleWaterBodyTypesChange = useCallback(async nextWaterBodyTypes => {
    setSelectedWaterBodyTypes(nextWaterBodyTypes)
    await reloadDashboard({waterBodyTypes: nextWaterBodyTypes})
  }, [reloadDashboard])

  return (
    <main className='min-h-screen bg-[#f7f7fb] pb-12'>
      <DashboardRefreshStatus isLoading={isLoading} />

      <div className='fr-container pt-8 md:pt-10'>
        <div className='mb-6 flex flex-col gap-5 md:flex-row md:items-start md:justify-between'>
          <h1 className='fr-h2 fr-mb-0'>
            {greetingName ? `Bonjour ${greetingName},` : 'Bonjour,'}
          </h1>

          <div className='w-full md:w-[380px]'>
            <GroupedMultiselect
              label='Filtrer le contenu de la page par :'
              placeholder='Sélectionner des zones'
              options={zoneOptions}
              value={selectedZoneCodes}
              disabled={zones.length === 0 || isLoading}
              onChange={handleZoneChange}
            />
          </div>
        </div>

        <DashboardError error={error} />

        <KeyFiguresSection
          pointsURL={pointsURL}
          showUsageDistribution={!isPreleveurDeclarant}
          totalPoints={totalPoints}
          usageDistribution={usageDistribution}
        />

        {isDeclarant && (
          <DeclarationCreationCard declarationCreation={declarationCreation} />
        )}

        <PointsMapSection
          isLoading={isLoading}
          points={points}
          pointsSectionTitle={pointsSectionTitle}
          pointsURL={pointsURL}
          showCollecteurs={!isCollector}
          showPreleveurs={!isPreleveurDeclarant}
        />

        {isPreleveurDeclarant && (
          <DeclarantSeriesSection
            seriesOptions={declarantSeriesOptions}
            user={user}
          />
        )}

        <RegisteredPrelevementsSection
          declarationsURL={declarationsURL}
          declarationsURLLabel={declarationsURLLabel}
          isLoading={isLoading}
          periodOptions={periodOptions}
          registeredPrelevementsByUsage={registeredPrelevementsByUsage}
          selectedPeriod={selectedPeriod}
          selectedPeriodType={selectedPeriodType}
          showReminder={!isPreleveurDeclarant}
          onPeriodChange={handlePeriodChange}
          onPeriodTypeChange={handlePeriodTypeChange}
        />

        {withdrawnChart && (
          <DashboardVolumesChart
            chart={withdrawnChart}
            isLoading={isLoading}
            selectedWaterBodyTypes={selectedWaterBodyTypes}
            selectedYear={selectedVolumeYear}
            subtitle={VOLUME_CHART_SUBTITLE}
            waterBodyTypeOptions={WATER_BODY_TYPE_OPTIONS}
            yearOptions={volumeYearOptions}
            onWaterBodyTypesChange={handleWaterBodyTypesChange}
            onYearChange={handleVolumeYearChange}
          />
        )}

        {dischargedChart && (
          <DashboardVolumesChart
            chart={dischargedChart}
            isLoading={isLoading}
            selectedWaterBodyTypes={selectedWaterBodyTypes}
            selectedYear={selectedVolumeYear}
            subtitle={VOLUME_CHART_SUBTITLE}
            waterBodyTypeOptions={WATER_BODY_TYPE_OPTIONS}
            yearOptions={volumeYearOptions}
            onWaterBodyTypesChange={handleWaterBodyTypesChange}
            onYearChange={handleVolumeYearChange}
          />
        )}
      </div>
    </main>
  )
}

export default DashboardPage
