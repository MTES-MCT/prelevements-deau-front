import DeclarationSummaryItem from '@/components/declarations/declaration-summary-item.js'

const DossierCard = ({dossier, url}) => (
  <DeclarationSummaryItem
    declaration={dossier}
    source={dossier?.source}
    url={url}
    showDeclarant={false}
  />
)

export default DossierCard
