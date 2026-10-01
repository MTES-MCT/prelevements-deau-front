import {campaignPointIdentity} from '@/lib/campaign-points.js'

export default function CampaignPointIdentity({response}) {
  const {name, referenceName, location, countingCode} = campaignPointIdentity(response)
  return <span className='block min-w-0 break-words'>
    <span className='block font-semibold text-[#161616]'>{name}</span>
    {referenceName && <span className='block text-sm text-[#666666]'>{referenceName}</span>}
    {location && <span className='mt-1 block text-sm font-normal text-[#666666]'>{location}</span>}
    {countingCode && <span className='mt-2 inline-block bg-[#f6f6f6] px-2 py-1 text-xs font-normal text-[#3a3a3a]'>Code compteur Agence de l’eau : <strong>{countingCode}</strong></span>}
  </span>
}
