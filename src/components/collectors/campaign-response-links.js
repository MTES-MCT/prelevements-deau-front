'use client'

import {Button} from '@codegouvfr/react-dsfr/Button'

export function CollectorCampaignResponseLinks({responses = []}) {
  return responses.map(response => <Button key={`${response.campaignId}-${response.responseId}`} priority='secondary'
    linkProps={{href: `/campagnes/${response.campaignId}/reponses/${response.responseId}`}}>
    Voir le formulaire{response.campaignName ? ` — ${response.campaignName}` : ''}
  </Button>)
}
