import DeclarationSummaryItem from '@/components/declarations/declaration-summary-item.js'

const DeclarationItemCard = ({source, url}) => (
  <DeclarationSummaryItem
    declaration={source?.declaration}
    source={source}
    url={url}
  />
)

export default DeclarationItemCard
