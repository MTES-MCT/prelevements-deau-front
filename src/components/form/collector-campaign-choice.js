'use client'

import {Alert} from '@codegouvfr/react-dsfr/Alert'
import {Select} from '@codegouvfr/react-dsfr/SelectNext'
import {Checkbox, FormControlLabel} from '@mui/material'

export default function CollectorCampaignChoice({result, checked, campaignId, onCheckedChange, onCampaignChange}) {
  if (!result?.success) return <Alert small severity='warning' title='Les campagnes ne peuvent pas être chargées.'
    description='Vous pouvez enregistrer la fiche puis ajouter son exploitation à une campagne depuis sa fiche.' />
  const campaigns = (result.data?.campaigns ?? []).filter(item => item.eligible)
  if (!campaigns.length) return <p className='fr-text--sm'>Aucune campagne ouverte disponible. La fiche sera enregistrée sans formulaire de campagne.</p>
  return <div>
    <FormControlLabel label={campaigns.length === 1
      ? `Ajouter cette exploitation à la campagne « ${campaigns[0].name} »`
      : 'Ajouter cette exploitation à une campagne'} control={<Checkbox checked={checked}
      onChange={event => onCheckedChange(event.target.checked)} />} />
    {checked && campaigns.length > 1 && <Select label='Campagne' placeholder='Choisir une campagne'
      options={campaigns.map(item => ({value: item.id, label: item.name}))}
      nativeSelectProps={{value: campaignId, onChange: event => onCampaignChange(event.target.value)}} />}
    <p className='fr-text--sm'>Cette option crée un formulaire à compléter. Elle n’envoie pas la déclaration.</p>
  </div>
}
