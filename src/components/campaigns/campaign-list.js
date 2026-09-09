'use client'

import Link from 'next/link'

import {CampaignCard, CampaignNotice, CampaignShell} from '@/components/campaigns/campaign-ui.js'
import {
  campaignArray, campaignDeadlineLabel, CAMPAIGN_KIND_LABELS, CAMPAIGN_STATUS_LABELS
} from '@/lib/collection-campaigns.js'

const STATUS_DESCRIPTIONS = {
  DRAFT: 'En préparation : aucune invitation envoyée.',
  OPEN: 'Les préleveurs peuvent répondre.',
  CLOSED: 'La saisie est terminée. Les réponses restent consultables.'
}
const LIST_STATUS_LABELS = {...CAMPAIGN_STATUS_LABELS, OPEN: 'Saisie ouverte', CLOSED: 'Saisie terminée'}

const CampaignList = ({data, error, kind, embedded = false}) => {
  const items = campaignArray(data).filter(item => !kind || (item.campaign ?? item).status !== 'DRAFT')
  const base = kind === 'INDEX' ? '/mes-index' : '/mes-besoins'
  const canCreate = !kind && !error && data?.permissions?.canCreate === true
  const content = (
    <>
      <CampaignNotice error>{error}</CampaignNotice>
      {canCreate && (
        <div className='fr-mb-3w'>
          <Link className='fr-btn fr-icon-add-line fr-btn--icon-left' href='/campagnes/nouvelle'>Créer une campagne de collecte</Link>
          <p className='fr-text--sm fr-mt-1w fr-mb-0'>La création enregistre un brouillon, sans envoyer d’invitation.</p>
        </div>
      )}
      {!error && items.length === 0 && (canCreate ? (
        <CampaignCard title='Préparer votre première collecte'>
          <ol className='fr-mb-0 space-y-2'>
            <li><strong>Préparez la demande.</strong> Choisissez les dates et les points concernés.</li>
            <li><strong>Ouvrez la saisie.</strong> Les préleveurs reçoivent une invitation pour saisir leurs relevés et leurs besoins.</li>
            <li><strong>Suivez les réponses.</strong> Consultez leur avancement et téléchargez les résultats.</li>
          </ol>
        </CampaignCard>
      ) : (
        <CampaignNotice>{kind ? 'Aucune demande en cours pour vos points de prélèvement.' : 'Aucune campagne disponible pour votre compte.'}</CampaignNotice>
      ))}
      {items.map(item => {
        const campaign = item.campaign ?? item
        const canManage = item.permissions?.canManage === true || campaign.permissions?.canManage === true
        const linkLabel = kind
          ? (campaign.status === 'CLOSED' ? 'Consulter mes réponses' : 'Consulter et répondre')
          : (campaign.status === 'DRAFT' && canManage ? 'Préparer la campagne' : 'Consulter le suivi')
        return (
          <CampaignCard key={campaign.id} title={campaign.name} aside={<span className='fr-badge'>{LIST_STATUS_LABELS[campaign.status] || campaign.status}</span>}>
            <p className='fr-text--sm'>Année {campaign.year}{campaign.closesAt ? ` · Date limite de réponse : ${campaignDeadlineLabel(campaign.closesAt, campaign.timezone)}` : ''}</p>
            {!kind && <p className='fr-text--sm'>{STATUS_DESCRIPTIONS[campaign.status]}</p>}
            <Link className='fr-btn fr-btn--secondary' href={kind ? `${base}/${campaign.id}` : `/campagnes/${campaign.id}`}>{linkLabel}</Link>
          </CampaignCard>
        )
      })}
    </>
  )
  return embedded ? content : (
    <CampaignShell
      title={CAMPAIGN_KIND_LABELS[kind] || 'Campagnes de collecte'}
      description={kind ? 'Répondez aux demandes concernant vos points de prélèvement.' : 'Demandez les relevés de compteurs et les besoins en eau, puis suivez les réponses.'}
      backHref='/tableau-de-bord'
    >
      {content}
    </CampaignShell>
  )
}

export default CampaignList
