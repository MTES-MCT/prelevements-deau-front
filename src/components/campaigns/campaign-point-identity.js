import {campaignPointIdentity} from '@/lib/campaign-points.js'

export default function CampaignPointIdentity({response}) {
  const {name, referenceName, location, countingCode} = campaignPointIdentity(response)
  return <span className='block min-w-0 break-words'>
    <span className='block w-fit bg-[var(--background-alt-grey)] px-2 py-1 text-xs font-normal text-[var(--text-default-grey)]'>Code autorisation de prélèvement : <strong>{name}</strong></span>
    {referenceName && <span className='block text-sm text-[var(--text-mention-grey)]'>{referenceName}</span>}
    {location && <span className='mt-1 block text-sm font-normal text-[var(--text-mention-grey)]'>{location}</span>}
    {countingCode && <span className='mt-2 inline-block bg-[var(--background-alt-grey)] px-2 py-1 text-xs font-normal text-[var(--text-default-grey)]'>Code compteur Agence de l’eau : <strong>{countingCode}</strong></span>}
  </span>
}
