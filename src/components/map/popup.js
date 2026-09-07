import MapPopupCard from '@/components/map/map-popup-card.js'
import PointSummaryTiles from '@/components/points-prelevement/point-summary-tiles.js'
import {getDeclarantTitleFromUser} from '@/lib/declarants.js'
import {createPointListPresentation} from '@/lib/point-list-presentation.js'
import {
  getPointPrelevementDisplayName,
  getPointPrelevementTechnicalReference
} from '@/utils/point-prelevement.js'

const DeclarantGroup = ({declarants, pluralLabel, singularLabel}) => {
  if (declarants.length === 0) {
    return null
  }

  return (
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
            {declarant.label || getDeclarantTitleFromUser(declarant)}
          </li>
        ))}
      </ul>
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
  const {collecteurs = [], preleveurs = []} = point
  const displayName = getPointPrelevementDisplayName(point, {
    fallback: 'Point de prélèvement',
    preferUsageName
  })
  const technicalReference = getPointPrelevementTechnicalReference(point, {preferUsageName})
  const alternateName = preferUsageName
    ? technicalReference
    : (point.usageName && point.usageName !== displayName ? point.usageName : null)
  const alternateNameLabel = preferUsageName ? 'Nom technique' : 'Nom d’usage'
  const presentation = createPointListPresentation(point)

  return (
    <MapPopupCard
      actionLabel={actionLabel}
      dismissable={dismissable}
      subtitle={alternateName && (
        <>
          <span className='font-medium'>{alternateNameLabel} :</span> {alternateName}
        </>
      )}
      title={displayName}
      onAction={onAction}
    >
      <PointSummaryTiles presentation={presentation} />

      {showDeclarants && (
        <div className='mt-2.5'>
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
                pluralLabel='Préleveurs associés'
                singularLabel='Préleveur associé'
              />
              <DeclarantGroup
                declarants={collecteurs}
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
    </MapPopupCard>
  )
}

export default Popup
