'use client'

import {useState, useSyncExternalStore, useTransition} from 'react'
import {Button} from '@codegouvfr/react-dsfr/Button'
import {Select} from '@codegouvfr/react-dsfr/Select'

import {useAuth} from '@/contexts/auth-context.js'
import {setInstructorDashboardDefaultAction} from '@/server/actions/zones.js'

const subscribeToHydration = () => () => {}
const getClientSnapshot = () => true
const getServerSnapshot = () => false
const label = 'Zone par défaut du tableau de bord'
const automatic = 'Choix automatique (ordre alphabétique)'

export default function AgentDashboardZone({agentId, habilitations, canManage}) {
  const {user} = useAuth()
  const hydrated = useSyncExternalStore(subscribeToHydration, getClientSnapshot, getServerSnapshot)
  const [pending, startTransition] = useTransition()
  const [draft, setDraft] = useState(null)
  const [feedback, setFeedback] = useState(null)

  const current = habilitations.find(right => right.isDashboardDefault)
  const savedId = current?.zoneId ?? ''
  const eligible = habilitations.filter(right =>
    right.zoneId && right.status === 'ACTIVE' && right.permissions?.includes('zone.dashboard.read'))
  const currentUnavailable = current && !eligible.includes(current)
  const canEdit = canManage && user && !user.impersonation?.active
  if (!eligible.length && !current) return null

  if (!canEdit) {
    return (
      <p className='fr-text--sm fr-mb-0 mt-4'>
        <strong>{label}</strong><br />{current && !currentUnavailable ? current.zone.name : automatic}
      </p>
    )
  }

  const selected = draft ?? savedId
  const changed = selected !== savedId
  function save(event) {
    event.preventDefault()
    if (!hydrated || pending || !changed) return
    setFeedback(null)
    startTransition(async () => {
      try {
        const result = await setInstructorDashboardDefaultAction(selected || savedId, agentId, Boolean(selected))
        if (!result.success) {
          setFeedback({state: 'error', message: result.error || 'Impossible de modifier la zone par défaut.'})
          return
        }
        setDraft(null)
        setFeedback({state: 'success', message: 'Zone enregistrée.'})
      } catch {
        setFeedback({state: 'error', message: 'La modification n’a pas pu être confirmée. Rechargez la fiche pour vérifier la zone par défaut.'})
      }
    })
  }

  return (
    <form className='mb-5 border-b border-[var(--border-default-grey)] pb-4' onSubmit={save}>
      <Select
        className='fr-mb-0 w-full max-w-xl'
        label={label}
        hint='Cette zone s’affiche à l’ouverture du tableau de bord de l’agent.'
        disabled={!hydrated || pending}
        state={feedback?.state ?? 'default'}
        stateRelatedMessage={feedback?.message}
        nativeSelectProps={{
          id: 'agent-dashboard-zone',
          value: selected,
          onChange: event => {
            setDraft(event.target.value)
            setFeedback(null)
          }
        }}
      >
        <option value=''>{automatic}</option>
        {currentUnavailable && <option value={savedId} disabled>{current.zone.name} (accès indisponible)</option>}
        {eligible.map(({zone, zoneId}) => <option key={zoneId} value={zoneId}>{zone.name}</option>)}
      </Select>
      {changed && (
        <Button className='fr-mt-1w' size='small' type='submit' disabled={!hydrated || pending}>
          {pending ? 'Enregistrement…' : 'Enregistrer'}
        </Button>
      )}
    </form>
  )
}
