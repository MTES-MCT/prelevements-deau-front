'use client'

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState
} from 'react'

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
  month,
  waterBodyTypes,
  year,
  zoneCodes
}) {
  return searchParams.get('zones') === buildZoneSearchValue(zoneCodes)
    && searchParams.get('month') === month
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

function getDeclarationIntro(declarationCreation) {
  const canCreateDeclaration = declarationCreation?.canCreateDeclaration
    ?? declarationCreation?.allowedDeclarationTypes?.length > 0
  const canCreateQuickDeclaration = declarationCreation?.canCreateQuickDeclaration ?? false

  if (canCreateQuickDeclaration && canCreateDeclaration) {
    return 'Saisissez vos index directement sur la plateforme ou déposez un fichier après contrôle automatique.'
  }

  if (canCreateQuickDeclaration) {
    return 'Saisissez vos index directement sur la plateforme.'
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
                    {formatCount(item.count, 'exploitation')}
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

      {isLoading && (
        <span className='fr-badge fr-badge--info fr-badge--no-icon'>Mise à jour</span>
      )}
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
  monthOptions,
  onMonthChange,
  registeredPrelevementsByUsage,
  selectedMonth,
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

      <div className='fr-select-group mb-0 w-full md:w-[220px]'>
        <label className='fr-label' htmlFor='dashboard-declaration-month'>
          Mois
        </label>
        <select
          className='fr-select'
          disabled={isLoading || monthOptions.length === 0}
          id='dashboard-declaration-month'
          value={selectedMonth}
          onChange={onMonthChange}
        >
          {monthOptions.map(option => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
    </div>

    {registeredPrelevementsByUsage.length > 0 ? (
      <div className='grid gap-4 md:grid-cols-2 xl:grid-cols-3'>
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
  const [selectedMonth, setSelectedMonth] = useState(
    initialDashboard?.registeredPrelevements?.selectedMonth ?? ''
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
  const monthOptions = registeredPrelevements?.monthOptions ?? EMPTY_ARRAY
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
      month = selectedMonth,
      replace = true,
      waterBodyTypes = selectedWaterBodyTypes,
      year = selectedVolumeYear
    } = {}
  ) => {
    const nextSearchParams = new URLSearchParams(searchParams.toString())
    nextSearchParams.set('zones', buildZoneSearchValue(zoneCodes))

    if (month) {
      nextSearchParams.set('month', month)
    } else {
      nextSearchParams.delete('month')
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

    const search = nextSearchParams.toString()
    const url = search ? `${pathname}?${search}` : pathname

    if (replace) {
      router.replace(url, {scroll: false})
      return
    }

    router.push(url, {scroll: false})
  }, [pathname, router, searchParams, selectedMonth, selectedVolumeYear, selectedWaterBodyTypes])

  useEffect(() => {
    if (
      hasSyncedDefaultZonesRef.current
      || selectedZoneCodes.length === 0
      || !selectedMonth
      || !selectedVolumeYear
    ) {
      return
    }

    hasSyncedDefaultZonesRef.current = true

    if (!isDashboardSearchSynced(searchParams, {
      month: selectedMonth,
      waterBodyTypes: selectedWaterBodyTypes,
      year: selectedVolumeYear,
      zoneCodes: selectedZoneCodes
    })) {
      syncURL(selectedZoneCodes, {
        month: selectedMonth,
        waterBodyTypes: selectedWaterBodyTypes,
        year: selectedVolumeYear
      })
    }
  }, [
    searchParams,
    selectedMonth,
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
    setIsLoading(true)
    setError(null)
    syncURL(nextZoneCodes, {
      month: selectedMonth,
      waterBodyTypes: selectedWaterBodyTypes,
      year: selectedVolumeYear
    })

    const result = await getDashboardTerritoryAction({
      month: selectedMonth,
      waterBodyTypes: selectedWaterBodyTypes,
      year: selectedVolumeYear,
      zoneCodes: nextZoneCodes
    })

    if (result.success) {
      const nextSelectedZoneCodes = result.data.selectedZoneCodes ?? nextZoneCodes
      const nextSelectedMonth = result.data.registeredPrelevements?.selectedMonth ?? selectedMonth
      const nextSelectedYear = result.data.volumesByUsage?.selectedYear ?? selectedVolumeYear
      const nextSelectedWaterBodyTypes = result.data.volumesByUsage?.selectedWaterBodyTypes ?? selectedWaterBodyTypes

      setDashboard(result.data)
      setSelectedZoneCodes(nextSelectedZoneCodes)
      setSelectedMonth(nextSelectedMonth)
      setSelectedVolumeYear(nextSelectedYear)
      setSelectedWaterBodyTypes(nextSelectedWaterBodyTypes)
      syncURL(nextSelectedZoneCodes, {
        month: nextSelectedMonth,
        waterBodyTypes: nextSelectedWaterBodyTypes,
        year: nextSelectedYear
      })
    } else {
      setError(result.error || 'Impossible de charger le tableau de bord.')
    }

    setIsLoading(false)
  }, [
    normalizeZoneCodes,
    selectedMonth,
    selectedVolumeYear,
    selectedWaterBodyTypes,
    syncURL
  ])

  const handleMonthChange = useCallback(async event => {
    const nextMonth = event.target.value

    setSelectedMonth(nextMonth)
    setIsLoading(true)
    setError(null)
    syncURL(selectedZoneCodes, {
      month: nextMonth,
      waterBodyTypes: selectedWaterBodyTypes,
      year: selectedVolumeYear
    })

    const result = await getDashboardTerritoryAction({
      month: nextMonth,
      waterBodyTypes: selectedWaterBodyTypes,
      year: selectedVolumeYear,
      zoneCodes: selectedZoneCodes
    })

    if (result.success) {
      const nextSelectedZoneCodes = result.data.selectedZoneCodes ?? selectedZoneCodes
      const nextSelectedMonth = result.data.registeredPrelevements?.selectedMonth ?? nextMonth
      const nextSelectedYear = result.data.volumesByUsage?.selectedYear ?? selectedVolumeYear
      const nextSelectedWaterBodyTypes = result.data.volumesByUsage?.selectedWaterBodyTypes ?? selectedWaterBodyTypes

      setDashboard(result.data)
      setSelectedZoneCodes(nextSelectedZoneCodes)
      setSelectedMonth(nextSelectedMonth)
      setSelectedVolumeYear(nextSelectedYear)
      setSelectedWaterBodyTypes(nextSelectedWaterBodyTypes)
      syncURL(nextSelectedZoneCodes, {
        month: nextSelectedMonth,
        waterBodyTypes: nextSelectedWaterBodyTypes,
        year: nextSelectedYear
      })
    } else {
      setError(result.error || 'Impossible de charger le tableau de bord.')
    }

    setIsLoading(false)
  }, [selectedVolumeYear, selectedWaterBodyTypes, selectedZoneCodes, syncURL])

  const handleVolumeYearChange = useCallback(async nextYear => {
    setSelectedVolumeYear(nextYear)
    setIsLoading(true)
    setError(null)
    syncURL(selectedZoneCodes, {
      month: selectedMonth,
      waterBodyTypes: selectedWaterBodyTypes,
      year: nextYear
    })

    const result = await getDashboardTerritoryAction({
      month: selectedMonth,
      waterBodyTypes: selectedWaterBodyTypes,
      year: nextYear,
      zoneCodes: selectedZoneCodes
    })

    if (result.success) {
      const nextSelectedZoneCodes = result.data.selectedZoneCodes ?? selectedZoneCodes
      const nextSelectedMonth = result.data.registeredPrelevements?.selectedMonth ?? selectedMonth
      const nextSelectedYear = result.data.volumesByUsage?.selectedYear ?? nextYear
      const nextSelectedWaterBodyTypes = result.data.volumesByUsage?.selectedWaterBodyTypes ?? selectedWaterBodyTypes

      setDashboard(result.data)
      setSelectedZoneCodes(nextSelectedZoneCodes)
      setSelectedMonth(nextSelectedMonth)
      setSelectedVolumeYear(nextSelectedYear)
      setSelectedWaterBodyTypes(nextSelectedWaterBodyTypes)
      syncURL(nextSelectedZoneCodes, {
        month: nextSelectedMonth,
        waterBodyTypes: nextSelectedWaterBodyTypes,
        year: nextSelectedYear
      })
    } else {
      setError(result.error || 'Impossible de charger le tableau de bord.')
    }

    setIsLoading(false)
  }, [selectedMonth, selectedWaterBodyTypes, selectedZoneCodes, syncURL])

  const handleWaterBodyTypesChange = useCallback(async nextWaterBodyTypes => {
    setSelectedWaterBodyTypes(nextWaterBodyTypes)
    setIsLoading(true)
    setError(null)
    syncURL(selectedZoneCodes, {
      month: selectedMonth,
      waterBodyTypes: nextWaterBodyTypes,
      year: selectedVolumeYear
    })

    const result = await getDashboardTerritoryAction({
      month: selectedMonth,
      waterBodyTypes: nextWaterBodyTypes,
      year: selectedVolumeYear,
      zoneCodes: selectedZoneCodes
    })

    if (result.success) {
      const nextSelectedZoneCodes = result.data.selectedZoneCodes ?? selectedZoneCodes
      const nextSelectedMonth = result.data.registeredPrelevements?.selectedMonth ?? selectedMonth
      const nextSelectedYear = result.data.volumesByUsage?.selectedYear ?? selectedVolumeYear
      const nextSelectedWaterBodyTypes = result.data.volumesByUsage?.selectedWaterBodyTypes ?? nextWaterBodyTypes

      setDashboard(result.data)
      setSelectedZoneCodes(nextSelectedZoneCodes)
      setSelectedMonth(nextSelectedMonth)
      setSelectedVolumeYear(nextSelectedYear)
      setSelectedWaterBodyTypes(nextSelectedWaterBodyTypes)
      syncURL(nextSelectedZoneCodes, {
        month: nextSelectedMonth,
        waterBodyTypes: nextSelectedWaterBodyTypes,
        year: nextSelectedYear
      })
    } else {
      setError(result.error || 'Impossible de charger le tableau de bord.')
    }

    setIsLoading(false)
  }, [selectedMonth, selectedVolumeYear, selectedZoneCodes, syncURL])

  return (
    <main className='min-h-screen bg-[#f7f7fb] pb-12'>
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
          monthOptions={monthOptions}
          registeredPrelevementsByUsage={registeredPrelevementsByUsage}
          selectedMonth={selectedMonth}
          showReminder={!isPreleveurDeclarant}
          onMonthChange={handleMonthChange}
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
