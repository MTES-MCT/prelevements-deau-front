import AccountCreationNotificationCard from '@/components/accounts/account-creation-notification-card.js'
import ImpersonateUserButton from '@/components/auth/impersonate-user-button.js'
import DeclarantDeclarationTypesCard from '@/components/declarants/declarant-declaration-types-card.js'
import DeclarantZonesCard from '@/components/declarants/declarant-zones-card.js'
import CollectorPointManagementCard from '@/components/declarants/collector-point-management-card.js'
import DeclarantManagementCard from '@/components/declarants/declarant-management-card.js'
import PreleveurDeleteSection from '@/components/form/preleveur-delete-section.js'
import {getDeclarantTitleFromDeclarant} from '@/lib/declarants.js'

const DeclarantManagementSection = ({
  canImpersonate,
  canDelete,
  canInvite,
  canManageZones,
  canManageCollectorPoints = false,
  pointManagementResult,
  pointManagementZonesLoaded = false,
  canReadDeclarationTypes,
  declarant,
  declarantId,
  declarationTypesPayload,
  zoneItems,
  zoneOptions
}) => {
  if (!canImpersonate && !canDelete && !canInvite && !canReadDeclarationTypes && !canManageZones) {
    return null
  }

  const hasPermissions = canManageCollectorPoints || canManageZones || canReadDeclarationTypes
  const hasAccountActions = canImpersonate || canInvite

  return (
    <div className='flex flex-col gap-6'>
      <div className={hasPermissions && hasAccountActions
        ? 'grid min-w-0 grid-cols-1 items-start gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]'
        : 'grid min-w-0 grid-cols-1 gap-6'}
      >
        {hasPermissions && <div className='flex min-w-0 flex-col gap-6'>
          {canManageCollectorPoints && (
            <CollectorPointManagementCard
              collecteurId={declarantId}
              initialManagement={pointManagementResult?.data}
              availableZones={zoneOptions}
              loadError={!pointManagementResult?.success || !pointManagementZonesLoaded}
            />
          )}

          {canManageZones && (
            <DeclarantZonesCard
              availableZones={zoneOptions}
              declarantId={declarantId}
              initialItems={zoneItems}
            />
          )}

          {canReadDeclarationTypes && (
            <DeclarantDeclarationTypesCard
              declarantId={declarantId}
              initialPayload={declarationTypesPayload}
            />
          )}
        </div>}

        {hasAccountActions && <div className='flex min-w-0 flex-col gap-6'>
          {canImpersonate && (
            <DeclarantManagementCard
              id='declarant-connection'
              title='Connexion temporaire'
              description='Vérifier l’accès à l’application avec les droits de ce déclarant.'
            >
              <ImpersonateUserButton
                label='Prendre la place de ce déclarant'
                priority='secondary'
                targetLabel={getDeclarantTitleFromDeclarant(declarant)}
                targetUserId={declarantId}
              />
            </DeclarantManagementCard>
          )}
          {canInvite && <AccountCreationNotificationCard declarant={declarant} />}
        </div>}
      </div>

      {canDelete && <PreleveurDeleteSection preleveur={declarant} />}
    </div>
  )
}

export default DeclarantManagementSection
