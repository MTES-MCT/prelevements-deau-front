import Link from 'next/link'

import {CampaignInvitations} from '@/components/campaigns/campaign-common.js'
import {getAllowedDeclarationTypesAction} from '@/server/actions/declarations.js'
import {getCampaignSummaryAction} from '@/server/actions/campaigns.js'

// This server component streams independently of the territory figures. Keep
// invitations and the creation card together so their wording stays coherent.
export default async function DashboardDeclarationActions({isPreleveur}) {
  const [typesResult, summaryResult] = await Promise.all([
    getAllowedDeclarationTypesAction({includePreleveurs: false}),
    isPreleveur ? getCampaignSummaryAction() : null
  ])
  const declarationTypes = typesResult?.success ? typesResult.data : null
  const summary = summaryResult?.success ? summaryResult.data?.data : null
  const canCreate = declarationTypes?.meta?.canCreateDeclaration ?? Boolean(declarationTypes?.data?.length)
  const canCreateQuick = declarationTypes?.meta?.canCreateQuickDeclaration ?? false

  return (
    <>
      <CampaignInvitations summary={summary} />
      {(canCreate || canCreateQuick) && (
        <section className='border border-gray-200 bg-white p-5 md:p-6'>
          <div className='flex flex-col gap-4 md:flex-row md:items-center md:justify-between'>
            <div>
              <h3 className='fr-h3 fr-mb-1w'>Déclarer mes prélèvements en eau</h3>
              <p className='fr-text--sm fr-mb-0 max-w-[680px] text-gray-700'>
                Saisissez vos index, volumes prélevés ou volumes rejetés directement sur la plateforme, ou déposez un fichier.
              </p>
            </div>
            <Link className='fr-btn fr-btn--icon-left fr-icon-add-line shrink-0' href='/mes-declarations/new'>
              Nouvelle déclaration
            </Link>
          </div>
        </section>
      )}
    </>
  )
}
