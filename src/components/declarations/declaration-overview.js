'use client'

import {Notice} from '@codegouvfr/react-dsfr/Notice'
import {Tag} from '@codegouvfr/react-dsfr/Tag'
import Link from 'next/link'

import PrelevementTypeBadge from '@/components/declarations/prelevement-type-badge.js'
import SourceStateBadge from '@/components/declarations/source-state-badge.js'
import TypeSaisieBadge from '@/components/declarations/type-saisie-badge.js'
import {getDeclarantTitleFromDeclarant} from '@/lib/declarants.js'
import {getDeclarationTypeLabel} from '@/lib/declaration-types.js'
import {formatFullAddress} from '@/lib/declaration.js'
import {getDeclarantURL} from '@/lib/urls.js'

const formatDepositDate = date => new Intl.DateTimeFormat('fr-FR', {dateStyle: 'short'}).format(new Date(date))

const getDeclarantId = declarant => declarant?.userId || declarant?.id || declarant?.user?.id

const getContactRows = declarant => [
  declarant?.user?.email
    ? {
      icon: 'ri-at-line',
      content: <a href={`mailto:${declarant.user.email}`}>{declarant.user.email}</a>
    }
    : null,
  declarant?.phoneNumber
    ? {
      icon: 'fr-icon-phone-line',
      content: <a href={`tel:${declarant.phoneNumber}`}>{declarant.phoneNumber}</a>
    }
    : null,
  formatFullAddress(declarant)
    ? {
      icon: 'fr-icon-home-4-line',
      content: formatFullAddress(declarant)
    }
    : null
].filter(Boolean)

const fileLabel = (file, declarationType) => file.filename || getDeclarationTypeLabel(file.type, declarationType)

const DeclarantLink = ({declarant}) => {
  if (!declarant) {
    return 'Non renseigné'
  }

  const id = getDeclarantId(declarant)
  const label = getDeclarantTitleFromDeclarant(declarant)

  if (!id) {
    return label
  }

  return <Link href={getDeclarantURL({userId: id})}>{label}</Link>
}

const OverviewItem = ({icon, label, children}) => {
  if (!children) {
    return null
  }

  return (
    <div className='min-w-0'>
      <div className='fr-text--xs fr-text-mention--grey fr-mb-0 flex items-center gap-1'>
        {icon && <span className={icon} aria-hidden='true' />}
        <span>{label}</span>
      </div>
      <div className='fr-text--sm fr-mb-0 min-w-0'>{children}</div>
    </div>
  )
}

const FileList = ({files = [], declarationType, dataSourceType}) => {
  if (files.length === 0) {
    if (dataSourceType === 'MANUAL') {
      return <span>Saisie rapide, aucun fichier associé</span>
    }

    if (dataSourceType === 'API') {
      return <span>Télérelève, aucun fichier associé</span>
    }

    return <span>Aucun fichier associé</span>
  }

  return (
    <ul className='fr-raw-list flex flex-col gap-1'>
      {files.map(file => (
        <li key={file.id} className='min-w-0'>
          {file.url ? (
            <Link download className='break-all' href={file.url}>
              {fileLabel(file, declarationType)}
            </Link>
          ) : (
            <span className='break-all'>{fileLabel(file, declarationType)}</span>
          )}
          <span className='fr-hint-text fr-mb-0'>
            {getDeclarationTypeLabel(file.type, declarationType)}
          </span>
        </li>
      ))}
    </ul>
  )
}

const ContactSummary = ({declarant, label}) => {
  const rows = getContactRows(declarant)

  if (!declarant) {
    return null
  }

  return (
    <div className='min-w-0 border-l-4 border-[#000091] pl-3'>
      <div className='fr-text--xs fr-text-mention--grey fr-mb-0'>{label}</div>
      <div className='fr-text--sm fr-mb-1v font-bold'>
        <DeclarantLink declarant={declarant} />
      </div>

      {rows.length > 0 && (
        <div className='flex flex-col gap-1'>
          {rows.map(row => (
            <div key={`${row.icon}-${String(row.content)}`} className='fr-text--xs fr-mb-0 flex min-w-0 gap-2 text-gray-700'>
              <span className={`${row.icon} shrink-0`} aria-hidden='true' />
              <span className='min-w-0 break-words'>{row.content}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

const DeclarationOverview = ({
  actions = null,
  declaration,
  periodLabel,
  preleveurName,
  status
}) => {
  const declarantId = getDeclarantId(declaration.declarant)
  const createdByDeclarantId = getDeclarantId(declaration.createdByDeclarant)
  const hasSeparateDepositor = declaration.createdByDeclarant && createdByDeclarantId !== declarantId
  const displayedAotDecreeNumber = declaration.aotDecreeNumber || declaration.numeroArreteAot
  const dataSourceType = declaration.dataSourceType ?? 'SPREADSHEET'
  const title = declaration.code ? `Déclaration n°${declaration.code}` : declaration.title ?? 'Déclaration'

  return (
    <section className='fr-mt-2w fr-mb-3w border-y border-gray-200 py-4'>
      <div className='flex flex-col gap-4'>
        <div className='flex flex-wrap items-start justify-between gap-3'>
          <div className='min-w-0'>
            <h1 className='fr-h3 fr-mb-1v'>{title}</h1>
            <div className='flex flex-wrap items-center gap-2'>
              <SourceStateBadge value={status} />
              {displayedAotDecreeNumber && <Tag> AOT {displayedAotDecreeNumber}</Tag>}
            </div>
          </div>
          {actions && (
            <div className='shrink-0'>
              {actions}
            </div>
          )}
        </div>

        <div className='grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(280px,360px)]'>
          <div className='grid gap-3 sm:grid-cols-2 xl:grid-cols-3'>
            <OverviewItem icon='ri-inbox-2-line' label='Date de dépôt'>
              {formatDepositDate(declaration.createdAt)}
            </OverviewItem>

            <OverviewItem icon='fr-icon-calendar-event-fill' label='Période concernée'>
              {periodLabel ?? 'Non renseignée'}
            </OverviewItem>

            {preleveurName && (
              <OverviewItem icon='fr-icon-user-line' label='Préleveur'>
                {preleveurName}
              </OverviewItem>
            )}

            <OverviewItem label='Type de déclaration'>
              <PrelevementTypeBadge value={declaration.type} declarationType={declaration.declarationType} />
            </OverviewItem>

            <OverviewItem label='Type de saisie'>
              <TypeSaisieBadge value={dataSourceType} />
            </OverviewItem>

            <OverviewItem label='Fichiers'>
              <FileList
                files={declaration.files}
                declarationType={declaration.declarationType}
                dataSourceType={dataSourceType}
              />
            </OverviewItem>
          </div>

          <div className='grid gap-3'>
            <ContactSummary declarant={declaration.declarant} label='Déclaration pour' />
            {hasSeparateDepositor && (
              <ContactSummary declarant={declaration.createdByDeclarant} label='Déposée par' />
            )}
          </div>
        </div>

        {declaration.comment && (
          <Notice
            description={declaration.comment}
            severity='info'
            title='Commentaire du déclarant'
          />
        )}
      </div>
    </section>
  )
}

export default DeclarationOverview
