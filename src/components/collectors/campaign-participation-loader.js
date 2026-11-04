import CollectorCampaignParticipation from '@/components/collectors/campaign-participation.js'
import CollectorCampaignParticipationEntry from '@/components/collectors/campaign-participation-entry.js'
import {getCollectorCampaignParticipationOptionsAction} from '@/server/actions/collector-points.js'

function exploitationLabel(exploitation, index) {
  const owner = exploitation.preleveur || exploitation.declarant || {}
  const name = owner.socialReason || owner.declarant?.socialReason || [owner.firstName, owner.lastName].filter(Boolean).join(' ')
  return [exploitation.pointPrelevement?.usageName || exploitation.pointPrelevement?.name, name,
    exploitation.countingCode && `Code comptage ${exploitation.countingCode}`].filter(Boolean).join(' — ') || `Exploitation ${index + 1}`
}

export default async function CollectorCampaignParticipationLoader({exploitations}) {
  if (exploitations.length === 0) return null
  if (exploitations.length === 1) return <CollectorCampaignParticipation exploitationId={exploitations[0].id}
    result={await getCollectorCampaignParticipationOptionsAction(exploitations[0].id)} />
  return <div className='flex flex-col gap-4'>
    {exploitations.map((exploitation, index) => <CollectorCampaignParticipationEntry key={exploitation.id}
      exploitationId={exploitation.id} label={exploitationLabel(exploitation, index)} />)}
  </div>
}
