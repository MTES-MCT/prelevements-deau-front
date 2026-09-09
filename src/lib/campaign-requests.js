export const campaignRequestKey = item => `${item.campaign.id}:${item.preleveur.userId}`

export function mergeCampaignRequests(current, incoming) {
  return [...new Map([...current, ...incoming].map(item => [campaignRequestKey(item), item])).values()]
}

export function campaignRequestResponseState(campaign, response = {}, now = Date.now()) {
  if (response?.status === 'SUBMITTED') {
    return {
      label: 'Transmis', action: 'Consulter', tone: 'success', actionable: false
    }
  }

  if (response?.canEdit) {
    if (response.status === 'DRAFT' && response.latestSubmissionAt) {
      return {
        label: 'Modifications à transmettre', action: 'Reprendre', tone: 'pending', actionable: true
      }
    }

    return response.status === 'DRAFT'
      ? {
        label: 'En cours', action: 'Reprendre', tone: 'pending', actionable: true
      }
      : {
        label: 'À compléter', action: 'Renseigner', tone: 'pending', actionable: true
      }
  }

  if (campaign.status === 'OPEN' && campaign.opensAt && new Date(campaign.opensAt).getTime() > now) {
    return {
      label: 'À venir', action: 'Consulter', tone: 'neutral', actionable: false
    }
  }

  if (campaign.status === 'CLOSED' || (campaign.closesAt && new Date(campaign.closesAt).getTime() <= now)) {
    return {
      label: 'Non transmis — saisie terminée', action: 'Consulter', tone: 'neutral', actionable: false
    }
  }

  return {
    label: 'Consultation uniquement', action: 'Consulter', tone: 'neutral', actionable: false
  }
}

export function campaignRequestHasAction(item, now) {
  return ['INDEX', 'NEEDS'].some(kind => campaignRequestResponseState(item.campaign, item.responses?.[kind], now).actionable)
}
