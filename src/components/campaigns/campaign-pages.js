import CampaignConfigForm from '@/components/campaigns/campaign-config-form.js'
import CampaignList from '@/components/campaigns/campaign-list.js'
import CampaignManagement from '@/components/campaigns/campaign-management.js'
import CampaignResponseForm from '@/components/campaigns/campaign-response-form.js'
import {CampaignNotice, CampaignShell} from '@/components/campaigns/campaign-ui.js'
import {StartDsfrOnHydration} from '@/dsfr-bootstrap/index.js'
import {CAMPAIGN_KIND_LABELS, unwrapCampaignResult} from '@/lib/collection-campaigns.js'
import {
  getCampaignAction, getCampaignContextAction, getCampaignOptionsAction, listCampaignsAction
} from '@/server/actions/campaigns.js'

export const CampaignListPage = async ({kind}) => {
  let data
  let error
  try {
    data = unwrapCampaignResult(await listCampaignsAction())
  } catch (error_) {
    error = error_.message
  }

  return <><StartDsfrOnHydration /><CampaignList data={data} error={error} kind={kind} /></>
}

export const CampaignDetailPage = async ({id, kind, preleveurUserId}) => {
  let context
  let error
  try {
    context = unwrapCampaignResult(await (kind ? getCampaignContextAction(id, preleveurUserId) : getCampaignAction(id)))
    if (context.permissions?.canRead !== true) {
      throw new Error('Vous n’avez pas accès à cette campagne.')
    }
  } catch (error_) {
    error = error_.message
  }

  return <><StartDsfrOnHydration />{error ? <CampaignShell title={CAMPAIGN_KIND_LABELS[kind] || 'Campagne'} backHref={kind ? '/mes-declarations#demandes' : '/campagnes'} backLabel={kind ? 'Mes déclarations' : 'Retour'}><CampaignNotice error>{error}</CampaignNotice></CampaignShell> : (kind ? <CampaignResponseForm key={`${id}-${context.preleveurUserId}-${kind}`} initialContext={context} kind={kind} /> : <CampaignManagement initialContext={context} />)}</>
}

export const CampaignCreatePage = async () => {
  let options
  let error
  let creationUnavailable = false
  try {
    const list = unwrapCampaignResult(await listCampaignsAction())
    if (list.permissions?.canCreate !== true) {
      creationUnavailable = true
      throw new Error('Votre compte ne permet pas de créer une campagne. Vous pouvez consulter et répondre aux demandes qui vous concernent.')
    }

    options = unwrapCampaignResult(await getCampaignOptionsAction())
  } catch (error_) {
    error = error_.message
  }

  return (
    <>
      <StartDsfrOnHydration />
      <CampaignShell title='Créer une campagne de collecte' description={error ? undefined : 'Choisissez les dates et les points concernés. Vous enverrez les invitations quand tout sera prêt.'} backHref={creationUnavailable ? '/mes-declarations#demandes' : '/campagnes'} backLabel={creationUnavailable ? 'Mes déclarations' : 'Retour'}>
        {error ? <CampaignNotice error>{error}</CampaignNotice> : <CampaignConfigForm initialOptions={options} />}
      </CampaignShell>
    </>
  )
}
