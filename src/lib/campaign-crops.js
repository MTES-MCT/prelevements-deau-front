// Liste des cultures irriguées fournie pour la collecte des besoins OUGC Dropt.
export const CAMPAIGN_CROP_GROUPS = [
  {label: 'Céréales', children: ['Maïs grain', 'Maïs doux', 'Maïs waxy', 'Maïs ensilage', 'Autres variétés de maïs', 'Blé', 'Ray-grass', 'Sorgho']},
  {label: 'Oléagineux', children: ['Tournesol', 'Colza']},
  {label: 'Légumineuses', children: ['Soja', 'Trèfle violet', 'Trèfle semence', 'Luzerne', 'Pois chiches', 'Haricots', 'Féveroles', 'Mélange de légumineuses fourragères']},
  {label: 'Cultures industrielles et plantes sarclées', children: ['Betteraves', 'Betteraves porte-graines', 'Tabac', 'Pommes de terre']},
  {label: 'Légumes et fruits', children: ['Fraises', 'Courges', 'Tomates pour conserve', 'Maraîchage diversifié', 'Kiwis', 'Asperges']},
  {label: 'Arboriculture', children: ['Pruniers', 'Noisetiers', 'Amandiers', 'Oliviers', 'Noyers', 'Châtaigniers']},
  {label: 'Autres cultures', children: ['Truffiers', 'Pépinières', 'Fleurs']}
]

export const CAMPAIGN_CROP_OPTIONS = [
  {label: 'Aucune'},
  ...CAMPAIGN_CROP_GROUPS.flatMap(({label, children}) => [
    {label}, ...children.map(child => ({label: child, parent: label}))
  ])
]

const searchKey = value => value.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLocaleLowerCase('fr-FR')
const labels = new Map(CAMPAIGN_CROP_OPTIONS.map(({label}) => [searchKey(label), label]))

export function normalizeCampaignCrops(value) {
  const values = Array.isArray(value) ? value : [value]
  // Preserve historic free text as one choice: splitting it could change its meaning.
  return [...new Set(values.filter(item => typeof item === 'string' && item.trim()).map(item => labels.get(searchKey(item.trim())) || item.trim()))]
}
