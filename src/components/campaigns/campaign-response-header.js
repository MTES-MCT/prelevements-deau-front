import {isCampaignDay} from '@/lib/campaign-calendar.js'
import {
  campaignDate, campaignDeadlineLabel, campaignInclusiveEnd, CAMPAIGN_KIND_LABELS
} from '@/lib/collection-campaigns.js'

const day = value => typeof value === 'string' ? value.slice(0, 10) : ''

function responsePeriod(campaign, kind) {
  const periods = (campaign.periods || []).filter(period => period.kind === kind)
  let dates
  if (kind === 'INDEX') {
    dates = (campaign.indexDates || []).map(value => day(value)).filter(value => isCampaignDay(value))
    if (dates.length === 0) {
      dates = periods.flatMap(period => [period.startReadingDate, period.endReadingDate]).map(value => day(value)).filter(value => isCampaignDay(value))
    }
  } else {
    dates = periods.flatMap(period => {
      const start = day(period.startDate)
      const end = day(period.endDate)
      return isCampaignDay(start) && isCampaignDay(end) && start < end ? [start, campaignInclusiveEnd(end)] : []
    })
  }

  dates.sort()
  if (dates.length === 0) {
    return null
  }

  return dates[0] === dates.at(-1) ? `le ${campaignDate(dates[0])}` : `du ${campaignDate(dates[0])} au ${campaignDate(dates.at(-1))}`
}

const CampaignResponseHeader = ({campaign, kind}) => {
  const organization = campaign.owner?.label || campaign.ownerContact?.label
  const period = responsePeriod(campaign, kind)
  return (
    <header className='mb-5 mt-4 min-w-0 border border-gray-200 bg-white p-4 md:p-5'>
      <div className='flex flex-col gap-4 md:flex-row md:items-start md:justify-between'>
        <div className='min-w-0'>
          <h1 className='fr-h3 fr-mb-1v break-words'>{CAMPAIGN_KIND_LABELS[kind]}</h1>
          <p className='fr-text--sm fr-mb-0 max-w-3xl break-words text-gray-700'>{campaign.name}</p>
          <div className='mt-2 flex flex-wrap items-baseline gap-x-4 gap-y-1 text-xs text-gray-600'>
            {organization && <p className='fr-mb-0 min-w-0 break-words'>Collecteur : <strong className='font-medium'>{organization}</strong></p>}
            {period && <p className='fr-mb-0 min-w-0 break-words'>{kind === 'INDEX' ? 'Relevés' : 'Besoins'} {period}</p>}
          </div>
        </div>
        {campaign.closesAt && <div className='min-w-0 md:max-w-xs md:shrink-0 md:pt-1'>
          <p className='fr-text--xs fr-mb-1v text-gray-600'>Date limite de réponse</p>
          <p className='fr-text--sm fr-mb-0 break-words font-semibold text-gray-900'><time dateTime={campaign.closesAt}>{campaignDeadlineLabel(campaign.closesAt, campaign.timezone)}</time></p>
        </div>}
      </div>
      {campaign.openingMessage && <div className='mt-3 border-t border-gray-100 pt-3'><p className='fr-text--sm fr-mb-0 max-w-3xl break-words whitespace-pre-wrap text-gray-700'>{campaign.openingMessage}</p></div>}
    </header>
  )
}

export default CampaignResponseHeader
