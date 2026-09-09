'use client'

import {useState} from 'react'

import Link from 'next/link'

import {CampaignField} from '@/components/campaigns/campaign-ui.js'
import {campaignPointChangeMailto, campaignPointName} from '@/lib/collection-campaigns.js'

const CampaignPointChangeRequest = ({context}) => {
  const [targetId, setTargetId] = useState('')
  const [message, setMessage] = useState('')
  const target = context.targets.find(item => item.id === targetId)
  const mailto = campaignPointChangeMailto({campaign: context.campaign, target, message})
  const owner = context.campaign.ownerContact
  const pointId = target?.pointPrelevementId || target?.pointPrelevement?.id
  return (
    <details className='mb-4 border border-gray-200 bg-white p-4'>
      <summary className='cursor-pointer font-bold'>Un point manque ou doit être corrigé ?</summary>
      <p className='mt-3'>Prévenez {owner?.label || 'l’organisateur de la collecte'}.</p>
      <CampaignField label='Point concerné' value={targetId} options={[{value: '', label: 'Point manquant / nouveau point'}, ...context.targets.map(item => ({value: item.id, label: campaignPointName(item)}))]} onChange={setTargetId} />
      {pointId && <Link className='fr-link fr-mb-2w' href={`/points-prelevement/${pointId}`}>Consulter la fiche du point</Link>}
      {owner?.email ? <>
        <CampaignField multiline label='Que faut-il ajouter ou corriger ?' value={message} onChange={setMessage} />
        {mailto ? <a className='fr-btn fr-btn--secondary' href={mailto}>Préparer le courriel</a> : <button disabled className='fr-btn fr-btn--secondary' type='button'>Décrivez votre demande</button>}
        <p className='fr-hint-text fr-mt-1w'>Votre messagerie s’ouvrira. Il vous restera à envoyer le courriel.</p>
      </> : <p>Contactez l’organisateur par votre moyen habituel en précisant le point concerné.</p>}
    </details>
  )
}

export default CampaignPointChangeRequest
