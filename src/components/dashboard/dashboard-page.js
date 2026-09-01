'use client'

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState
} from 'react'

import {SegmentedControl} from '@codegouvfr/react-dsfr/SegmentedControl'
import dynamic from 'next/dynamic'
import Link from 'next/link'

import {PRELEVEUR_MAP_LAYER_VISIBILITY} from '@/components/dashboard/dashboard-map-layers.js'
import DashboardVolumesChart from '@/components/dashboard/dashboard-volumes-chart.js'
import DeferredRender from '@/components/ui/deferred-render.js'
import GroupedMultiselect from '@/components/ui/GroupedMultiselect/index.js'
import {ZONE_ICONS} from '@/components/zones/zone-icons.js'
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

const DeferredDashboardContent = ({children, minHeight}) => (
  <DeferredRender
    minHeight={minHeight}
    placeholder={(
      <div
        className='flex items-center justify-center bg-gray-100 text-center'
        role='status'
        style={{minHeight}}
      >
        Chargement de la visualisation…
      </div>
    )}
    rootMargin='400px 0px'
  >
    {children}
  </DeferredRender>
)

const DynamicDashboardPointsMap = dynamic(
  () => import('@/components/dashboard/dashboard-points-map-loader.js'),
  {ssr: false}
)

const DashboardPointsMap = props => (
  <DeferredDashboardContent minHeight='clamp(360px, 56vw, 430px)'>
    <DynamicDashboardPointsMap {...props} />
  </DeferredDashboardContent>
)

const DynamicDashboardWaterResources = dynamic(
  () => import('@/components/dashboard/dashboard-water-resources.js'),
  {ssr: false}
)

const DashboardWaterResources = props => (
  <DynamicDashboardWaterResources {...props} />
)

const DynamicDashboardSeries = dynamic(
  () => import('@/components/points-prelevement/series-options-loader.js'),
  {ssr: false}
)

const ZONE_TYPE_PRESENTATIONS = {
  REGION: {
    className: 'border-[#000091] bg-[#eeeeff] text-[#000091]',
    iconClassName: ZONE_ICONS.mapPin2,
    label: 'Région'
  },
  DEPARTEMENT: {
    className: 'border-[#18753c] bg-[#e6f4ea] text-[#18753c]',
    iconClassName: ZONE_ICONS.mapPin,
    label: 'Département'
  },
  SAGE: {
    className: 'border-[#8d533e] bg-[#fff4f0] text-[#8d533e]',
    iconClassName: ZONE_ICONS.water,
    label: 'SAGE'
  }
}
const WATER_BODY_TYPE_OPTIONS = [
  {value: 'SUPERFICIELLE', label: 'Eau superficielle'},
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
const PRELEVEUR_POINTS_MAP_DESCRIPTION = 'Cette carte affiche vos points de prélèvement. Vous pouvez aussi afficher les points de suivi de la ressource (niveaux de nappe, débit des cours d\'eau) via la légende.'
const VOLUME_CHART_SCOPE_NOTICE = 'Volumes représentant uniquement les déclarations enregistrées sur Partageons l’Eau, pouvant être inférieurs aux volumes réels du territoire.'
const WITHDRAWN_VOLUME_CHART_SUBTITLE = `Eau prélevée dans le milieu naturel (cours d'eau, nappe, plan d'eau, retenue), qu'elle y retourne ensuite ou non. ${VOLUME_CHART_SCOPE_NOTICE}`
const DISCHARGED_VOLUME_CHART_SUBTITLE = `Eau restituée, après utilisation, au milieu où elle a été prélevée. ${VOLUME_CHART_SCOPE_NOTICE}`
const EMPTY_ARRAY = []
const DASHBOARD_HASH_PREFIX = 'dashboard?'

function formatZoneLabel(zone) {
  const typeLabel = ZONE_TYPE_PRESENTATIONS[zone.type]?.label ?? zone.type
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

function areSameValues(firstValues, secondValues) {
  return firstValues.length === secondValues.length
    && firstValues.every((value, index) => secondValues[index] === value)
}

function splitDashboardHashValues(value) {
  return String(value ?? '')
    .split(',')
    .map(item => item.trim())
    .filter(Boolean)
}

function parseDashboardHashWaterBodyTypes(value) {
  if (value === null) {
    return WATER_BODY_TYPE_VALUES
  }

  if (value === NO_WATER_BODY_TYPES_SENTINEL) {
    return []
  }

  const values = splitDashboardHashValues(value)
    .filter(item => WATER_BODY_TYPE_VALUES.includes(item))

  return values.length > 0 ? values : WATER_BODY_TYPE_VALUES
}

function parseDashboardHash(hash) {
  const hashValue = hash.startsWith('#') ? hash.slice(1) : hash

  if (!hashValue.startsWith(DASHBOARD_HASH_PREFIX)) {
    return null
  }

  const params = new URLSearchParams(hashValue.slice(DASHBOARD_HASH_PREFIX.length))
  const parsedYear = Number(params.get('year'))

  return {
    period: params.get('period') ?? '',
    periodType: params.get('periodType') ?? '',
    waterBodyTypes: parseDashboardHashWaterBodyTypes(params.get('waterBodyTypes')),
    year: Number.isFinite(parsedYear) ? parsedYear : '',
    zoneCodes: splitDashboardHashValues(params.get('zones'))
  }
}

function buildDashboardHash({
  period,
  periodType,
  waterBodyTypes,
  year,
  zoneCodes
}) {
  const params = new URLSearchParams()

  if (Array.isArray(zoneCodes) && zoneCodes.length > 0) {
    params.set('zones', buildZoneSearchValue(zoneCodes))
  }

  if (periodType) {
    params.set('periodType', periodType)
  }

  if (period) {
    params.set('period', period)
  }

  if (year) {
    params.set('year', year)
  }

  if (Array.isArray(waterBodyTypes) && !areAllWaterBodyTypesSelected(waterBodyTypes)) {
    params.set('waterBodyTypes', buildWaterBodyTypesSearchValue(waterBodyTypes))
  }

  const search = params.toString()

  return search ? `${DASHBOARD_HASH_PREFIX}${search}` : ''
}

function replaceDashboardHash(options) {
  if (typeof window === 'undefined') {
    return
  }

  const territoryHash = buildDashboardHash(options)
  const parameters = new URLSearchParams(
    territoryHash.startsWith(DASHBOARD_HASH_PREFIX)
      ? territoryHash.slice(DASHBOARD_HASH_PREFIX.length)
      : ''
  )
  const currentHash = window.location.hash.startsWith(`#${DASHBOARD_HASH_PREFIX}`)
    ? new URLSearchParams(window.location.hash.slice(DASHBOARD_HASH_PREFIX.length + 1))
    : null

  for (const key of ['piezoPeriod', 'flowPeriod', 'piezoMode']) {
    const value = currentHash?.get(key)
    if (value) {
      parameters.set(key, value)
    }
  }

  const search = parameters.toString()
  const hash = search ? `${DASHBOARD_HASH_PREFIX}${search}` : ''
  const url = `${window.location.pathname}${window.location.search}${hash ? `#${hash}` : ''}`

  window.history.replaceState(window.history.state, '', url)
}

function isSameDashboardFilterState(current, next) {
  return current.period === next.period
    && current.periodType === next.periodType
    && String(current.year) === String(next.year)
    && areSameValues(current.zoneCodes, next.zoneCodes)
    && areSameValues(current.waterBodyTypes, next.waterBodyTypes)
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

const DECLARATION_CREATION_INTRO = 'Saisissez vos index, volumes prélevés ou volumes rejetés directement sur la plateforme, ou déposez un fichier.'

const DeclarationCreationCard = ({className = 'mt-6', declarationCreation}) => {
  const allowedDeclarationTypes = declarationCreation?.allowedDeclarationTypes ?? EMPTY_ARRAY
  const canCreateDeclaration = declarationCreation?.canCreateDeclaration ?? allowedDeclarationTypes.length > 0
  const canCreateQuickDeclaration = declarationCreation?.canCreateQuickDeclaration ?? false
  const canCreateAnyDeclaration = canCreateDeclaration || canCreateQuickDeclaration

  if (!canCreateAnyDeclaration) {
    return null
  }

  return (
    <section className={`border border-gray-200 bg-white p-5 md:p-6 ${className}`}>
      <div className='flex flex-col gap-4 md:flex-row md:items-center md:justify-between'>
        <div>
          <h3 className='fr-h3 fr-mb-1w'>Déclarer mes prélèvements en eau</h3>
          <p className='fr-text--sm fr-mb-0 max-w-[680px] text-gray-700'>
            {DECLARATION_CREATION_INTRO}
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
      title: 'Volumes prélevés par usage'
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
    pointsLegendLabel: isPreleveurDeclarant ? 'Mes points de prélèvement' : 'Points de prélèvement',
    pointsSectionTitle: isPreleveurDeclarant
      ? 'Mes points de prélèvement'
      : 'Ressources et prélèvements de mon territoire',
    pointsURL: getPointsPrelevementURL()
  }
}

function getMonitoringStationsSignature(stations) {
  return JSON.stringify([...stations].sort((first, second) => first.id.localeCompare(second.id)))
}

const KeyFiguresSection = ({
  pointsURL,
  showUsageDistribution,
  totalPoints,
  usageDistribution
}) => (
  <div className='border border-gray-200 bg-white p-5 md:p-6'>
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
  </div>
)

const DashboardBlock = ({
  actions = null,
  boxed = false,
  children,
  className = 'mt-8',
  title
}) => {
  const blockClassName = boxed
    ? `${className} border border-gray-200 bg-white p-5 md:p-6`
    : className

  return (
    <section className={blockClassName}>
      <div className='mb-4 flex flex-col gap-4 md:flex-row md:items-start md:justify-between'>
        <h2 className='fr-h2 fr-mb-0 text-[#000091]'>{title}</h2>
        {actions}
      </div>

      {children}
    </section>
  )
}

const DashboardZoneFilter = ({
  disabled,
  hideLabel = false,
  label,
  onChange,
  options,
  placeholder = 'Sélectionner des zones',
  value
}) => (
  <div className='w-full md:w-[380px]'>
    <GroupedMultiselect
      hideLabel={hideLabel}
      disabled={disabled}
      label={label}
      options={options}
      placeholder={placeholder}
      value={value}
      onChange={onChange}
    />
  </div>
)

const PointsMapSection = ({
  className = 'mt-6',
  description,
  initialLayerVisibility,
  isLoading,
  mapScope,
  monitoringStations,
  pointsLegendLabel,
  pointsSectionTitle,
  pointsURL,
  preferUsageName = false,
  selectedZoneCodes,
  showCollecteurs,
  showPreleveurs
}) => (
  <section className={`border border-gray-200 bg-white p-5 md:p-6 ${className}`}>
    <div className='mb-4 flex flex-col gap-2 md:flex-row md:items-center md:justify-between'>
      <div className='flex flex-wrap items-baseline gap-x-4 gap-y-1'>
        <h3 className='fr-h3 fr-mb-0'>{pointsSectionTitle}</h3>
        <Link className='fr-link text-sm' href={pointsURL}>
          Accéder à la page
        </Link>
      </div>

      {isLoading && <InlineRefreshStatus />}
    </div>

    <DashboardPointsMap
      initialLayerVisibility={initialLayerVisibility}
      scope={mapScope}
      monitoringStations={monitoringStations}
      pointsLegendLabel={pointsLegendLabel}
      preferUsageName={preferUsageName}
      selectedZoneCodes={selectedZoneCodes}
      showCollecteurs={showCollecteurs}
      showPreleveurs={showPreleveurs}
    />

    {description && (
      <p className='fr-text--sm fr-mb-0 fr-mt-2w text-[var(--text-mention-grey)]'>
        {description}
      </p>
    )}
  </section>
)

const DeclarantSeriesSection = ({
  className = 'mt-6',
  user
}) => (
  <section className={`border border-gray-200 bg-white p-5 md:p-6 ${className}`}>
    <DeferredDashboardContent minHeight={240}>
      <DynamicDashboardSeries
        preleveurId={user?.id}
        subtitle='Volumes représentant uniquement vos prélèvements déclarés via Partageons l’Eau'
        title='Évolution de mes prélèvements'
        titleComponent='h3'
      />
    </DeferredDashboardContent>
  </section>
)

const RegisteredPrelevementsSection = ({
  className = 'mt-6',
  declarationsURL,
  declarationsURLLabel,
  isLoading,
  onPeriodChange,
  onPeriodTypeChange,
  periodOptions,
  registeredPrelevementsByUsage,
  selectedPeriod,
  selectedPeriodType,
  showReminder,
  title = 'Prélèvements enregistrés sur Partageons l’Eau'
}) => (
  <section className={`border border-gray-200 bg-white p-5 md:p-6 ${className}`}>
    <div className='mb-5 flex flex-col gap-4 md:flex-row md:items-start md:justify-between'>
      <div className='flex flex-wrap items-baseline gap-x-4 gap-y-1'>
        <h3 className='fr-h3 fr-mb-0'>
          {title}
        </h3>
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

const DashboardVolumeCharts = ({
  dischargedChart,
  isLoading,
  onVolumeYearChange,
  onWaterBodyTypesChange,
  selectedVolumeYear,
  selectedWaterBodyTypes,
  volumeYearOptions,
  withdrawnChart
}) => (
  <>
    {withdrawnChart && (
      <DashboardVolumesChart
        chart={withdrawnChart}
        isLoading={isLoading}
        selectedWaterBodyTypes={selectedWaterBodyTypes}
        selectedYear={selectedVolumeYear}
        subtitle={WITHDRAWN_VOLUME_CHART_SUBTITLE}
        waterBodyTypeOptions={WATER_BODY_TYPE_OPTIONS}
        yearOptions={volumeYearOptions}
        onWaterBodyTypesChange={onWaterBodyTypesChange}
        onYearChange={onVolumeYearChange}
      />
    )}

    {dischargedChart && (
      <DashboardVolumesChart
        chart={dischargedChart}
        isLoading={isLoading}
        selectedWaterBodyTypes={selectedWaterBodyTypes}
        selectedYear={selectedVolumeYear}
        subtitle={DISCHARGED_VOLUME_CHART_SUBTITLE}
        waterBodyTypeOptions={WATER_BODY_TYPE_OPTIONS}
        yearOptions={volumeYearOptions}
        onWaterBodyTypesChange={onWaterBodyTypesChange}
        onYearChange={onVolumeYearChange}
      />
    )}
  </>
)

const DashboardPage = ({
  declarationCreation = null,
  initialDashboard,
  initialError,
  user
}) => {
  const hasAppliedInitialHashRef = useRef(false)
  const territoryReloadRequestIdRef = useRef(0)
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
  const [isTerritoryLoading, setIsTerritoryLoading] = useState(false)
  const [monitoringStations, setMonitoringStations] = useState(EMPTY_ARRAY)

  const zones = dashboard?.zones ?? EMPTY_ARRAY
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
    pointsLegendLabel,
    pointsSectionTitle,
    pointsURL
  } = getDashboardLinks({isDeclarant, isPreleveurDeclarant})
  const withdrawnChart = getVolumeChartForRole(volumesByUsage?.charts?.withdrawn, isDeclarant)
  const dischargedChart = getVolumeChartForRole(volumesByUsage?.charts?.discharged, isDeclarant)
  const hasSelectableZones = zones.length > 0
  const isZoneFilterDisabled = !hasSelectableZones || isTerritoryLoading
  const showWaterResourcesTitle = user?.role !== 'ADMIN'

  const zoneOptions = useMemo(() =>
    zones.map(zone => {
      const label = formatZoneLabel(zone)
      const presentation = ZONE_TYPE_PRESENTATIONS[zone.type] ?? {
        className: 'border-gray-300 bg-gray-100 text-gray-700',
        iconClassName: ZONE_ICONS.mapPin2,
        label: zone.type
      }

      return {
        value: zone.code,
        label,
        content: (
          <span className='flex min-w-0 flex-1 items-center justify-between gap-2'>
            <span className='truncate'>{zone.name}</span>
            <span className={`inline-flex shrink-0 items-center gap-1 border px-1.5 py-0.5 text-xs font-medium ${presentation.className}`}>
              <span
                className={`${presentation.iconClassName} [&::after]:![--icon-size:0.72rem] [&::before]:![--icon-size:0.72rem]`}
                aria-hidden='true'
              />
              {presentation.label}
            </span>
          </span>
        ),
        title: label
      }
    }), [zones])

  const normalizeZoneCodes = useCallback(codes => {
    const selectedSet = new Set(codes)
    return zones
      .map(zone => zone.code)
      .filter(code => selectedSet.has(code))
  }, [zones])

  const reloadDashboard = useCallback(async ({
    period = selectedPeriod,
    periodType = selectedPeriodType,
    waterBodyTypes = selectedWaterBodyTypes,
    year = selectedVolumeYear,
    zoneCodes = selectedZoneCodes
  } = {}) => {
    const requestId = territoryReloadRequestIdRef.current + 1
    territoryReloadRequestIdRef.current = requestId

    setIsTerritoryLoading(true)
    setError(null)

    try {
      const result = await getDashboardTerritoryAction({
        includePoints: false,
        period,
        periodType,
        waterBodyTypes,
        year,
        zoneCodes
      })

      if (territoryReloadRequestIdRef.current !== requestId) {
        return
      }

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
        replaceDashboardHash({
          period: nextSelectedPeriod,
          periodType: nextSelectedPeriodType,
          waterBodyTypes: nextSelectedWaterBodyTypes,
          year: nextSelectedYear,
          zoneCodes: nextSelectedZoneCodes
        })
      } else {
        setError(result.error || 'Impossible de charger le tableau de bord.')
      }
    } catch {
      if (territoryReloadRequestIdRef.current === requestId) {
        setError('Impossible de charger le tableau de bord.')
      }
    } finally {
      if (territoryReloadRequestIdRef.current === requestId) {
        setIsTerritoryLoading(false)
      }
    }
  }, [
    selectedPeriod,
    selectedPeriodType,
    selectedVolumeYear,
    selectedWaterBodyTypes,
    selectedZoneCodes
  ])

  useEffect(() => {
    if (
      hasAppliedInitialHashRef.current
      || selectedZoneCodes.length === 0
      || !selectedPeriod
      || !selectedPeriodType
      || !selectedVolumeYear
    ) {
      return
    }

    hasAppliedInitialHashRef.current = true

    const hashFilters = parseDashboardHash(window.location.hash)

    if (!hashFilters) {
      replaceDashboardHash({
        period: selectedPeriod,
        periodType: selectedPeriodType,
        waterBodyTypes: selectedWaterBodyTypes,
        year: selectedVolumeYear,
        zoneCodes: selectedZoneCodes
      })
      return
    }

    const nextZoneCodes = hashFilters.zoneCodes.length > 0
      ? normalizeZoneCodes(hashFilters.zoneCodes)
      : selectedZoneCodes
    const nextFilters = {
      period: hashFilters.period || selectedPeriod,
      periodType: hashFilters.periodType || selectedPeriodType,
      waterBodyTypes: hashFilters.waterBodyTypes,
      year: hashFilters.year || selectedVolumeYear,
      zoneCodes: nextZoneCodes.length > 0 ? nextZoneCodes : selectedZoneCodes
    }
    const currentFilters = {
      period: selectedPeriod,
      periodType: selectedPeriodType,
      waterBodyTypes: selectedWaterBodyTypes,
      year: selectedVolumeYear,
      zoneCodes: selectedZoneCodes
    }

    if (isSameDashboardFilterState(currentFilters, nextFilters)) {
      replaceDashboardHash(nextFilters)
      return
    }

    setSelectedPeriodType(nextFilters.periodType)
    setSelectedPeriod(nextFilters.period)
    setSelectedVolumeYear(nextFilters.year)
    setSelectedWaterBodyTypes(nextFilters.waterBodyTypes)

    async function reloadHashDashboard() {
      await reloadDashboard(nextFilters)
    }

    reloadHashDashboard()
  }, [
    normalizeZoneCodes,
    reloadDashboard,
    selectedPeriod,
    selectedPeriodType,
    selectedVolumeYear,
    selectedWaterBodyTypes,
    selectedZoneCodes
  ])

  const handleZoneChange = useCallback(async nextValue => {
    const nextZoneCodes = normalizeZoneCodes(nextValue)

    if (nextZoneCodes.length === 0) {
      return
    }

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

  const handleMonitoringStationsChange = useCallback(stations => {
    setMonitoringStations(current =>
      getMonitoringStationsSignature(current) === getMonitoringStationsSignature(stations)
        ? current
        : stations)
  }, [])

  return (
    <main className='min-h-screen bg-[#f7f7fb] pb-12'>
      <DashboardRefreshStatus isLoading={isTerritoryLoading} />

      <div className='fr-container pt-8 md:pt-10'>
        <div className='mb-6 flex flex-col gap-5 md:flex-row md:items-start md:justify-between'>
          <h1 className='fr-h2 fr-mb-0'>
            {greetingName ? `Bonjour ${greetingName},` : 'Bonjour,'}
          </h1>

          {!isDeclarant && (
            <DashboardZoneFilter
              disabled={isZoneFilterDisabled}
              label='Filtrer le contenu de la page par :'
              options={zoneOptions}
              value={selectedZoneCodes}
              onChange={handleZoneChange}
            />
          )}
        </div>

        <DashboardError error={error} />

        {isDeclarant ? (
          <>
            <DashboardBlock boxed className='mt-0' title='Mon activité'>
              <DeclarationCreationCard
                className='mt-0'
                declarationCreation={declarationCreation}
              />

              <PointsMapSection
                preferUsageName
                description={isPreleveurDeclarant ? PRELEVEUR_POINTS_MAP_DESCRIPTION : null}
                initialLayerVisibility={isPreleveurDeclarant
                  ? PRELEVEUR_MAP_LAYER_VISIBILITY
                  : undefined}
                isLoading={false}
                mapScope='activity'
                monitoringStations={monitoringStations}
                pointsLegendLabel={pointsLegendLabel}
                pointsSectionTitle={pointsSectionTitle}
                pointsURL={pointsURL}
                selectedZoneCodes={EMPTY_ARRAY}
                showCollecteurs={!isCollector}
                showPreleveurs={!isPreleveurDeclarant}
              />

              {isPreleveurDeclarant && (
                <DeclarantSeriesSection
                  user={user}
                />
              )}
            </DashboardBlock>

            {hasSelectableZones && (
              <DashboardBlock
                boxed
                actions={(
                  <DashboardZoneFilter
                    hideLabel
                    disabled={isZoneFilterDisabled}
                    label='Zones'
                    options={zoneOptions}
                    value={selectedZoneCodes}
                    onChange={handleZoneChange}
                  />
                )}
                title='Chiffres clés de mon territoire'
              >
                <RegisteredPrelevementsSection
                  className='mt-0'
                  declarationsURL={declarationsURL}
                  declarationsURLLabel={declarationsURLLabel}
                  isLoading={isTerritoryLoading}
                  periodOptions={periodOptions}
                  registeredPrelevementsByUsage={registeredPrelevementsByUsage}
                  selectedPeriod={selectedPeriod}
                  selectedPeriodType={selectedPeriodType}
                  showReminder={!isPreleveurDeclarant}
                  title='Prélèvements déclarés'
                  onPeriodChange={handlePeriodChange}
                  onPeriodTypeChange={handlePeriodTypeChange}
                />

                <DashboardVolumeCharts
                  dischargedChart={dischargedChart}
                  isLoading={isTerritoryLoading}
                  selectedVolumeYear={selectedVolumeYear}
                  selectedWaterBodyTypes={selectedWaterBodyTypes}
                  volumeYearOptions={volumeYearOptions}
                  withdrawnChart={withdrawnChart}
                  onVolumeYearChange={handleVolumeYearChange}
                  onWaterBodyTypesChange={handleWaterBodyTypesChange}
                />

                <DashboardWaterResources
                  selectedZoneCodes={selectedZoneCodes}
                  showTitle={showWaterResourcesTitle}
                  onStationsChange={handleMonitoringStationsChange}
                />
              </DashboardBlock>
            )}
          </>
        ) : (
          <DashboardBlock className='mt-0' title='Chiffres clés du territoire'>
            <KeyFiguresSection
              showUsageDistribution
              pointsURL={pointsURL}
              totalPoints={totalPoints}
              usageDistribution={usageDistribution}
            />

            <PointsMapSection
              showPreleveurs
              isLoading={isTerritoryLoading}
              mapScope='territory'
              monitoringStations={monitoringStations}
              pointsLegendLabel={pointsLegendLabel}
              pointsSectionTitle={pointsSectionTitle}
              pointsURL={pointsURL}
              selectedZoneCodes={selectedZoneCodes}
              showCollecteurs={!isCollector}
            />

            <RegisteredPrelevementsSection
              showReminder
              declarationsURL={declarationsURL}
              declarationsURLLabel={declarationsURLLabel}
              isLoading={isTerritoryLoading}
              periodOptions={periodOptions}
              registeredPrelevementsByUsage={registeredPrelevementsByUsage}
              selectedPeriod={selectedPeriod}
              selectedPeriodType={selectedPeriodType}
              onPeriodChange={handlePeriodChange}
              onPeriodTypeChange={handlePeriodTypeChange}
            />

            <DashboardVolumeCharts
              dischargedChart={dischargedChart}
              isLoading={isTerritoryLoading}
              selectedVolumeYear={selectedVolumeYear}
              selectedWaterBodyTypes={selectedWaterBodyTypes}
              volumeYearOptions={volumeYearOptions}
              withdrawnChart={withdrawnChart}
              onVolumeYearChange={handleVolumeYearChange}
              onWaterBodyTypesChange={handleWaterBodyTypesChange}
            />

            <DashboardWaterResources
              selectedZoneCodes={selectedZoneCodes}
              showTitle={showWaterResourcesTitle}
              onStationsChange={handleMonitoringStationsChange}
            />
          </DashboardBlock>
        )}
      </div>
    </main>
  )
}

export default DashboardPage
