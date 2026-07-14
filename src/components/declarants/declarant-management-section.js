import AccountCreationNotificationCard from '@/components/accounts/account-creation-notification-card.js'
import ImpersonateUserButton from '@/components/auth/impersonate-user-button.js'
import DeclarantDeclarationTypesCard from '@/components/declarants/declarant-declaration-types-card.js'
import DeclarantZonesCard from '@/components/declarants/declarant-zones-card.js'
import DeclarationReminderCard from '@/components/declarations/declaration-reminder-card.js'
import PreleveurDeleteSection from '@/components/form/preleveur-delete-section.js'
import {getDeclarantTitleFromDeclarant} from '@/lib/declarants.js'

const DeclarantManagementSection = ({
  canImpersonate,
  canDelete,
  canInvite,
  canManageZones,
  canReadDeclarationTypes,
  canSendReminder,
  declarant,
  declarantId,
  declarationTypesPayload,
  zoneItems,
  zoneOptions
}) => {
  if (!canImpersonate && !canDelete && !canInvite && !canReadDeclarationTypes && !canManageZones && !canSendReminder) {
    return null
  }

  return (
    <div className='flex flex-col gap-6'>
      {canImpersonate && (
        <section className='border border-gray-200 p-5 md:p-6'>
          <div className='mb-4'>
            <h2 className='fr-h5 fr-mb-1w'>Connexion temporaire</h2>
            <p className='fr-text--sm fr-mb-0'>
              Ouvrir l’application avec les droits de ce déclarant pour vérifier son accès.
            </p>
          </div>
          <ImpersonateUserButton
            label='Prendre la place de ce déclarant'
            priority='secondary'
            targetLabel={getDeclarantTitleFromDeclarant(declarant)}
            targetUserId={declarantId}
          />
        </section>
      )}

      {canInvite && <AccountCreationNotificationCard declarant={declarant} />}

      {canSendReminder && <DeclarationReminderCard declarant={declarant} />}

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

      {canDelete && <PreleveurDeleteSection preleveur={declarant} />}
    </div>
  )
}

export default DeclarantManagementSection
