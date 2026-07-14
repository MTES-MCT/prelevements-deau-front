import {getDeclarantTitleFromUser} from '@/lib/declarants.js'
import {getPointFlowType, getPointFlowTypeColors, getPointFlowTypeLabel} from '@/lib/point-flow-types.js'
import {WATER_BODY_TYPE_LABELS} from '@/lib/points-prelevement-filters.js'
import {getUsageColor, getUsageLabel, getUsageRootCode} from '@/lib/water-uses.js'
import {
  getPointPrelevementDisplayName,
  getPointPrelevementTechnicalReference
} from '@/utils/point-prelevement.js'

const MISSING_USAGE_COLOR = '#929292'

function getRootUsages(usages = []) {
  const usagesByRootCode = new Map()

  for (const usage of usages) {
    const rootCode = getUsageRootCode(usage)
    if (rootCode && !usagesByRootCode.has(rootCode)) {
      usagesByRootCode.set(rootCode, {
        color: getUsageColor(rootCode),
        label: getUsageLabel(rootCode),
        value: rootCode
      })
    }
  }

  return usagesByRootCode.size > 0
    ? [...usagesByRootCode.values()]
    : [{color: MISSING_USAGE_COLOR, label: 'Usage non renseigné', value: 'missing'}]
}

const DeclarantGroup = ({declarants, iconClassName, pluralLabel, singularLabel}) => {
  if (declarants.length === 0) {
    return null
  }

  return (
    <div className='flex items-start gap-2'>
      <span aria-hidden='true' className={`${iconClassName} mt-0.5 shrink-0 text-sm text-gray-500`} />
      <div className='min-w-0'>
        <p className='fr-mb-0 text-[0.6875rem] font-semibold leading-4 text-gray-700'>
          {declarants.length > 1 ? pluralLabel : singularLabel}
        </p>
        <ul className='m-0 list-none p-0 text-xs leading-4 text-gray-600'>
          {declarants.map((declarant, index) => (
            <li
              key={declarant.id ?? declarant.userId ?? declarant.user?.id ?? index}
              className='break-words'
            >
              {getDeclarantTitleFromUser(declarant)}
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

const Popup = ({
  actionLabel,
  declarantsError = false,
  declarantsLoading = false,
  dismissable = false,
  point,
  preferUsageName = false,
  showDeclarants = true,
  onAction
}) => {
  const {collecteurs = [], preleveurs = [], usages = []} = point
  const displayName = getPointPrelevementDisplayName(point, {
    fallback: 'Point de prélèvement',
    preferUsageName
  })
  const technicalReference = getPointPrelevementTechnicalReference(point, {preferUsageName})
  const alternateName = preferUsageName
    ? technicalReference
    : (point.usageName && point.usageName !== displayName ? point.usageName : null)
  const alternateNameLabel = preferUsageName ? 'Nom technique' : 'Nom d’usage'
  const flowType = getPointFlowType(point)
  const flowTypeColors = getPointFlowTypeColors(flowType)
  const waterBodyTypeLabel = WATER_BODY_TYPE_LABELS[point.waterBodyType]
    ?? point.waterBodyType
    ?? 'Milieu non renseigné'
  const rootUsages = getRootUsages(usages)

  return (
    <article
      className='overflow-hidden bg-white text-gray-900'
      style={{width: 'min(19rem, calc(100vw - 2rem))'}}
    >
      <header className={`border-b border-gray-200 bg-gray-50 py-2.5 pl-3 ${dismissable ? 'pr-9' : 'pr-3'}`}>
        <div className='flex items-start justify-between gap-2'>
          <h3 className='fr-mb-0 min-w-0 break-words text-sm font-semibold leading-5'>
            {displayName}
          </h3>
          <span
            className='inline-flex shrink-0 border px-1.5 py-0.5 text-[0.625rem] font-semibold leading-[0.875rem]'
            style={{
              backgroundColor: flowTypeColors.backgroundColor,
              borderColor: flowTypeColors.borderColor,
              color: flowTypeColors.textColor
            }}
          >
            {getPointFlowTypeLabel(flowType)}
          </span>
        </div>

        {alternateName && (
          <p className='fr-mb-0 mt-1 break-words text-xs leading-4 text-gray-600'>
            <span className='font-medium'>{alternateNameLabel} :</span> {alternateName}
          </p>
        )}
      </header>

      <div className='px-3 py-2.5'>
        <div className='flex flex-wrap items-center gap-1.5 text-[0.6875rem] leading-4 text-gray-700'>
          <span className='inline-flex bg-gray-100 px-1.5 py-0.5'>
            {waterBodyTypeLabel}
          </span>
          {rootUsages.map(usage => (
            <span key={usage.value} className='inline-flex items-center gap-1.5 border border-gray-200 bg-white px-1.5 py-0.5'>
              <span
                aria-hidden='true'
                className='h-2.5 w-2.5 shrink-0 rounded-full ring-1 ring-gray-300'
                style={{backgroundColor: usage.color}}
              />
              {usage.label}
            </span>
          ))}
        </div>

        {showDeclarants && (
          <div className='mt-2.5 border-t border-gray-200 pt-2.5'>
            {declarantsLoading && (
              <p className='fr-mb-0 text-xs leading-4 text-gray-600' role='status'>
                Chargement des préleveurs et collecteurs…
              </p>
            )}
            {!declarantsLoading && declarantsError && (
              <p className='fr-mb-0 text-xs leading-4 text-gray-600'>
                Rattachements indisponibles.
              </p>
            )}
            {!declarantsLoading && !declarantsError && (
              <div className='max-h-40 space-y-2 overflow-y-auto pr-1'>
                <DeclarantGroup
                  declarants={preleveurs}
                  iconClassName='fr-icon-user-line'
                  pluralLabel='Préleveurs associés'
                  singularLabel='Préleveur associé'
                />
                <DeclarantGroup
                  declarants={collecteurs}
                  iconClassName='ri-group-line'
                  pluralLabel='Collecteurs associés'
                  singularLabel='Collecteur associé'
                />
                {preleveurs.length === 0 && collecteurs.length === 0 && (
                  <p className='fr-mb-0 text-xs leading-4 text-gray-600'>
                    Aucun déclarant associé
                  </p>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {actionLabel && onAction && (
        <footer className='border-t border-gray-200 bg-gray-50 px-3 py-2.5'>
          <button
            className='fr-btn fr-btn--sm w-full justify-center'
            type='button'
            onClick={onAction}
          >
            {actionLabel}
          </button>
        </footer>
      )}
    </article>
  )
}

export default Popup
