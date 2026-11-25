'use client'

import {useState, useSyncExternalStore, useTransition} from 'react'
import {Button} from '@codegouvfr/react-dsfr/Button'
import {useAuth} from '@/contexts/auth-context.js'
import {setInstructorDashboardDefaultAction} from '@/server/actions/zones.js'

const subscribeToHydration = () => () => {}
const getClientSnapshot = () => true
const getServerSnapshot = () => false

export default function DashboardDefaultControl({agentId, habilitation, canManage}) {
  const hydrated = useSyncExternalStore(subscribeToHydration, getClientSnapshot, getServerSnapshot)
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState(null)
  const {user} = useAuth()
  const canEdit = canManage && user && !user.impersonation?.active
  const {isDashboardDefault, status, permissions} = habilitation
  const eligible = status === 'ACTIVE' && permissions?.includes('zone.dashboard.read')
  if (!isDashboardDefault && !(canEdit && eligible)) return null

  function changeDefault() {
    setError(null)
    startTransition(async () => {
      try {
        const result = await setInstructorDashboardDefaultAction(habilitation.zoneId, agentId, !isDashboardDefault)
        if (!result.success) setError(result.error || 'Impossible de modifier la zone par défaut.')
      } catch {
        setError('La modification n’a pas pu être confirmée. Rechargez la fiche pour vérifier la zone par défaut.')
      }
    })
  }

  return (
    <div className='flex flex-wrap items-center gap-2'>
      {isDashboardDefault && eligible && <span className='fr-badge fr-badge--info fr-badge--no-icon'>Zone par défaut</span>}
      {canEdit && (
        <Button priority='tertiary no outline' size='small' disabled={!hydrated || pending} onClick={changeDefault}>
          {isDashboardDefault ? 'Ne plus utiliser cette zone par défaut' : 'Définir comme zone par défaut'}
        </Button>
      )}
      {error && <p className='fr-error-text' role='alert'>{error}</p>}
    </div>
  )
}
