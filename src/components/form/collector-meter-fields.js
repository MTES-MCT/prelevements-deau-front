'use client'

import {Button} from '@codegouvfr/react-dsfr/Button'
import {Input} from '@codegouvfr/react-dsfr/Input'

const readOnlyReasons = {
  SHARED_METER: 'Compteur partagé entre plusieurs exploitations.',
  EXTERNAL_METER: 'Compteur lié à un fournisseur de données.',
  AMBIGUOUS_HISTORY: 'Rattachement historique à vérifier.'
}

export default function CollectorMeterFields({meters, onChange, canAddMeter = false}) {
  return <div className='mt-4'>
    <h3 className='fr-h6'>Compteurs</h3>
    {meters.length === 0 && <p className='fr-text--sm'>Aucun compteur renseigné.</p>}
    {meters.map((meter, index) => {
      const editable = meter.id ? meter.capabilities?.canEditSerialNumber === true : canAddMeter
      return <div key={meter.id ?? meter.draftId} className='mb-4 rounded border border-[var(--border-default-grey)] p-4'>
        <Input label={`Numéro de série du compteur ${index + 1}`}
          hintText={editable ? 'Facultatif. Vider le numéro d’un compteur existant conserve son historique.'
            : `Correction par un administrateur. ${readOnlyReasons[meter.capabilities?.reason] ?? 'Ce compteur ne peut pas être modifié depuis ce formulaire.'}`}
          nativeInputProps={{type: 'text', maxLength: 100, readOnly: !editable, value: meter.serialNumber ?? '',
            onChange: event => onChange(meters.map((item, position) => position === index ? {...item, serialNumber: event.target.value} : item))}} />
        {!meter.id && <Button priority='tertiary no outline' type='button' onClick={() => onChange(meters.filter((_item, position) => position !== index))}>
          Retirer ce nouveau compteur
        </Button>}
      </div>
    })}
    {canAddMeter && <Button type='button' priority='secondary' iconId='fr-icon-add-line'
      onClick={() => onChange([...meters, {draftId: globalThis.crypto.randomUUID(), serialNumber: ''}])}>
      Ajouter un compteur
    </Button>}
  </div>
}
