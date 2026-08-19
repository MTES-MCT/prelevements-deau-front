import Link from 'next/link'

import CopyableEmail from '@/components/ui/CopyableEmail/index.js'
import {getDeclarantUsageSummary} from '@/lib/declarant-usages.js'
import {
  canDisplayDeclarantExploitationSummary,
  getDeclarantRoleLabel,
  getDeclarantTitleFromUser,
  getDeclarantTypeIcon,
  getPreleveurType,
  getPreleveurTypeLabel
} from '@/lib/declarants.js'
import {getUsageColor} from '@/lib/water-uses.js'

const rowGridClassName = 'md:grid-cols-[minmax(0,1.4fr)_minmax(7rem,0.65fr)_minmax(0,1.2fr)_minmax(5.5rem,auto)]'

const preleveurTypePresentations = {
  ICPE: 'bg-[#fff4f0] text-[#8d533e]',
  IRRIGANT: 'bg-[#e3fdeb] text-[#18753c]',
  GESTIONNAIRE_AEP: 'bg-[#e3e3fd] text-[#000091]',
  AUTRE: 'bg-gray-100 text-gray-700'
}

function pluralize(count, singular, plural = `${singular}s`) {
  return `${count} ${count > 1 ? plural : singular}`
}

function formatDate(value) {
  if (!value) {
    return null
  }

  return new Intl.DateTimeFormat('fr-FR', {
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC',
    year: 'numeric'
  }).format(new Date(value))
}

function getDeclarantLocation(declarant) {
  return declarant.declarant?.city ?? declarant.city ?? null
}

function canDisplayDeclarantActivity(declarant) {
  return declarant.right?.isAdmin === true
    || declarant.right?.permissions?.includes('declaration.list') === true
}

const ProfileChip = ({isCollecteur, label}) => (
  <span className={`inline-flex w-fit items-center px-1.5 py-0.5 text-[0.62rem] font-semibold uppercase leading-none ${isCollecteur ? 'bg-[#eeeeff] text-[#000091]' : 'bg-gray-100 text-gray-700'}`}>
    {label}
  </span>
)

const PreleveurTypeChip = ({type}) => {
  const label = getPreleveurTypeLabel(type) ?? 'Type non renseigné'
  const className = preleveurTypePresentations[type] ?? preleveurTypePresentations.AUTRE

  return (
    <span className={`inline-flex w-fit items-center px-1.5 py-0.5 text-[0.68rem] font-semibold leading-none ${className}`}>
      {label}
    </span>
  )
}

const DeclarantIdentity = ({declarant}) => {
  const location = getDeclarantLocation(declarant)
  const organizationName = declarant.declarant?.socialReason ?? declarant.socialReason
  const displayName = organizationName || getDeclarantTitleFromUser(declarant)

  return (
    <section className='min-w-0'>
      <div className='flex min-w-0 items-start gap-2'>
        <span
          aria-hidden='true'
          className={`mt-0.5 shrink-0 text-[#000091] [&::after]:![--icon-size:0.9rem] [&::before]:![--icon-size:0.9rem] ${getDeclarantTypeIcon(declarant)}`}
        />
        <div className='min-w-0'>
          <div className='break-words text-[0.9rem] font-semibold leading-snug text-gray-900'>
            {displayName}
          </div>
          {(location || declarant.email) && (
            <div className='mt-1 flex min-w-0 flex-col gap-0.5 text-xs leading-snug text-gray-600'>
              {location && <span className='break-words'>{location}</span>}
              {declarant.email && (
                <CopyableEmail email={declarant.email} />
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  )
}

const DeclarantProfile = ({declarant, showRole}) => {
  const role = declarant.declarant?.declarantRole ?? declarant.declarantRole ?? 'PRELEVEUR'
  const isCollecteur = role === 'COLLECTEUR'
  const preleveurType = getPreleveurType(declarant)

  return (
    <section className='min-w-0'>
      <span className='mb-1 block text-[0.68rem] font-semibold text-gray-500 md:hidden'>Profil</span>
      {showRole && (
        <ProfileChip
          isCollecteur={isCollecteur}
          label={getDeclarantRoleLabel(role)}
        />
      )}
      {!isCollecteur && (
        <div className={showRole ? 'mt-1.5' : ''}>
          <PreleveurTypeChip type={preleveurType} />
        </div>
      )}
    </section>
  )
}

const DeclarantActivity = ({declarant, showLastDeclaration, trustedCollectorScope}) => {
  const role = declarant.declarant?.declarantRole ?? declarant.declarantRole ?? 'PRELEVEUR'
  const isCollecteur = role === 'COLLECTEUR'
  const directExploitationsCount = declarant.declarant?._count?.pointPrelevements ?? 0
  const collectorRightsCount = declarant.declarant?._count?.collecteurExploitations
    ?? declarant.declarant?.collecteurExploitations?.length
    ?? 0
  const count = isCollecteur ? collectorRightsCount : directExploitationsCount
  const countLabel = isCollecteur
    ? pluralize(count, 'point accessible', 'points accessibles')
    : pluralize(count, 'point')
  const canDisplayExploitationSummary = canDisplayDeclarantExploitationSummary(
    declarant,
    {trustedCollectorScope}
  )
  const canDisplayActivity = canDisplayDeclarantActivity(declarant)
  const lastDeclarationDate = formatDate(declarant.declarant?.lastDeclarationAt ?? declarant.lastDeclarationAt)
  const {remainingCount, visibleUsages} = getDeclarantUsageSummary(
    declarant.searchSummary?.usages
  )

  if (!canDisplayExploitationSummary && !canDisplayActivity) {
    return <section aria-hidden='true' />
  }

  return (
    <section className='min-w-0'>
      <span className='mb-1 block text-[0.68rem] font-semibold text-gray-500 md:hidden'>Suivi</span>
      {canDisplayExploitationSummary && (
        <div className='text-[0.82rem] font-semibold leading-snug text-gray-900'>
          {countLabel}
        </div>
      )}
      {visibleUsages.length > 0 && (
        <div className='mt-1 flex flex-wrap items-center gap-1'>
          {visibleUsages.map(usage => (
            <span
              key={usage.code}
              className='inline-flex max-w-full items-center gap-1 bg-gray-50 px-1.5 py-0.5 text-[0.68rem] font-medium leading-none text-gray-700'
            >
              <span
                aria-hidden='true'
                className='h-1.5 w-1.5 shrink-0 rounded-full'
                style={{backgroundColor: getUsageColor(usage)}}
              />
              <span className='min-w-0 break-words'>{usage.label}</span>
            </span>
          ))}
          {remainingCount > 0 && (
            <span className='text-[0.68rem] leading-snug text-gray-500'>
              et {remainingCount} autre{remainingCount > 1 ? 's' : ''} usage{remainingCount > 1 ? 's' : ''}
            </span>
          )}
        </div>
      )}
      {showLastDeclaration && canDisplayActivity && lastDeclarationDate && (
        <div className={`${canDisplayExploitationSummary ? 'mt-0.5' : ''} text-xs leading-snug text-gray-500`}>
          Dernière déclaration : {lastDeclarationDate}
        </div>
      )}
    </section>
  )
}

const DeclarantAction = ({href}) => href
  ? (
    <Link className='fr-link fr-icon-arrow-right-line fr-link--icon-right whitespace-nowrap text-sm font-medium' href={href}>
      Consulter
    </Link>
  )
  : <span aria-hidden='true' />

const DeclarantSummaryContent = ({
  declarant,
  detailHref,
  showLastDeclaration,
  showRole,
  trustedCollectorScope
}) => (
  <article className={`grid gap-3 bg-white px-3 py-3 transition-colors ${rowGridClassName} md:items-center ${detailHref ? 'hover:bg-[#f7f7ff]' : ''}`}>
    <DeclarantIdentity declarant={declarant} />
    <DeclarantProfile declarant={declarant} showRole={showRole} />
    <DeclarantActivity
      declarant={declarant}
      showLastDeclaration={showLastDeclaration}
      trustedCollectorScope={trustedCollectorScope}
    />
    <DeclarantAction href={detailHref} />
  </article>
)

const Declarant = ({
  basePath = '/declarants',
  declarant,
  showLastDeclaration = false,
  showRole = true,
  trustedCollectorScope = false
}) => {
  const canRead = declarant.right?.permissions?.includes('declarant.detail.read') === true
  const detailHref = canRead ? `${basePath}/${declarant.id}` : null

  return (
    <DeclarantSummaryContent
      declarant={declarant}
      detailHref={detailHref}
      showLastDeclaration={showLastDeclaration}
      showRole={showRole}
      trustedCollectorScope={trustedCollectorScope}
    />
  )
}

const DeclarantSummaryListHeader = ({showRole = true}) => (
  <div className={`hidden gap-3 border-b border-gray-200 bg-white px-3 py-1.5 text-[0.74rem] font-semibold leading-none text-gray-600 md:grid ${rowGridClassName} md:items-center`}>
    <div>Déclarant</div>
    <div>{showRole ? 'Profil' : 'Type de préleveur'}</div>
    <div>Points et usages</div>
    <div aria-hidden='true' />
  </div>
)

export {DeclarantSummaryListHeader}

export default Declarant
