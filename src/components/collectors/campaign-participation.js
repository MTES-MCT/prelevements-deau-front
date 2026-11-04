'use client'

import {useRef, useState} from 'react'

import {Alert} from '@codegouvfr/react-dsfr/Alert'
import {Button} from '@codegouvfr/react-dsfr/Button'
import {Select} from '@codegouvfr/react-dsfr/SelectNext'

import {createCollectorCampaignParticipationAction} from '@/server/actions/collector-points.js'

export function CollectorCampaignResponseLinks({responses = []}) {
  return responses.map(response => <Button key={`${response.campaignId}-${response.responseId}`} priority='secondary'
    linkProps={{href: `/campagnes/${response.campaignId}/reponses/${response.responseId}`}}>
    Voir le formulaire{response.campaignName ? ` — ${response.campaignName}` : ''}
  </Button>)
}

export default function CollectorCampaignParticipation({exploitationId, result, label}) {
  const [campaigns, setCampaigns] = useState(result?.data?.campaigns ?? [])
  const [selectedId, setSelectedId] = useState('')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState(null)
  const [added, setAdded] = useState(false)
  const submitting = useRef(false)
  if (!result?.success) return <Alert small severity='warning' title='Les formulaires de campagne ne peuvent pas être chargés.'
    description='Rechargez la page pour consulter les formulaires ou ajouter cette exploitation à une campagne.' />
  const eligible = campaigns.filter(item => item.eligible && !item.responseId)
  const campaignId = eligible.length === 1 ? eligible[0].id : selectedId
  const existing = campaigns.filter(item => item.responseId)
  if (!campaigns.length) return null

  async function add() {
    if (submitting.current || !campaignId) return
    submitting.current = true
    setPending(true)
    setError(null)
    try {
      const saved = await createCollectorCampaignParticipationAction(campaignId, exploitationId)
      if (!saved.success) {
        setError(saved.error || 'Le formulaire n’a pas pu être créé. Réessayez.')
        return
      }
      const participation = saved.data.campaignParticipation
      setCampaigns(previous => previous.map(item => item.id === participation.campaignId
        ? {...item, eligible: false, responseId: participation.responseId} : item))
      setSelectedId('')
      setAdded(true)
    } catch {
      setError('La réponse n’a pas pu être confirmée. Réessayez : un formulaire déjà créé sera retrouvé.')
    } finally {
      submitting.current = false
      setPending(false)
    }
  }

  return <section className='rounded border border-[var(--border-default-grey)] p-4 flex flex-col gap-3' aria-label={label || 'Formulaires de campagne'}>
    <h3 className='fr-h6 fr-mb-0'>{label || 'Formulaires de campagne'}</h3>
    {added && <Alert small severity='success' title='Le formulaire est disponible. Vous pouvez maintenant le compléter.' />}
    <div className='flex flex-wrap gap-3'>
      <CollectorCampaignResponseLinks responses={existing.map(item => ({campaignId: item.id, responseId: item.responseId, campaignName: item.name}))} />
    </div>
    {eligible.length > 0 && <div>
      {eligible.length > 1 ? <Select label='Campagne' placeholder='Choisir une campagne'
        options={eligible.map(item => ({value: item.id, label: item.name}))}
        nativeSelectProps={{value: selectedId, disabled: pending, onChange: event => setSelectedId(event.target.value)}} />
        : <p>Campagne : {eligible[0].name}</p>}
      <Button priority='secondary' disabled={pending || !campaignId} onClick={add}>
        {pending ? 'Ajout…' : 'Ajouter à la campagne'}
      </Button>
    </div>}
    {campaigns.filter(item => !item.eligible && !item.responseId && item.reason).map(item => <p key={item.id} className='fr-text--sm'>{item.name} : {item.reason}</p>)}
    {error && <Alert small severity='error' title={error} />}
  </section>
}
