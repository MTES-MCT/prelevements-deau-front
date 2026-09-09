'use client'

import {useState} from 'react'

import {CampaignCard, CampaignField, CampaignNotice} from '@/components/campaigns/campaign-ui.js'
import {confirmCampaignAction, unwrapCampaignResult} from '@/lib/collection-campaigns.js'
import {saveCampaignManagersAction} from '@/server/actions/campaigns.js'

const ROLE_LABELS = {READER: 'Consulter', MANAGER: 'Gérer la campagne'}
const managerPayload = managers => managers.map(({userId, role}) => ({userId, role}))

export const CampaignSharing = ({campaign, managerOptions = [], canManageSharing = false, onSaved, onDirtyChange}) => {
  const [managers, setManagers] = useState(() => campaign.managers || [])
  const [selectedUserId, setSelectedUserId] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const original = JSON.stringify(managerPayload(campaign.managers || []))
  const dirty = JSON.stringify(managerPayload(managers)) !== original
  const people = new Map([...managerOptions, ...(campaign.managers || [])].map(person => [person.userId, person]))
  const labelOf = manager => manager.label || people.get(manager.userId)?.label || 'Organisme'
  const available = managerOptions.filter(person => person.userId !== campaign.owner?.userId && person.userId !== campaign.ownerCollecteurUserId && !managers.some(manager => manager.userId === person.userId))
  const update = next => {
    setManagers(next)
    onDirtyChange?.(JSON.stringify(managerPayload(next)) !== original)
    setError(null)
  }

  const submit = async event => {
    event.preventDefault()
    if (!canManageSharing || !dirty || !confirmCampaignAction('Enregistrer les accès à cette campagne ?')) {
      return
    }

    setBusy(true)
    setError(null)
    try {
      const saved = unwrapCampaignResult(await saveCampaignManagersAction(campaign.id, {expectedVersion: campaign.version, managers: managerPayload(managers)}))
      await onSaved(saved)
      onDirtyChange?.(false)
    } catch (error_) {
      setError(error_.code === 409 ? 'Les accès ont changé. Actualisez la campagne avant de réessayer.' : error_.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <CampaignCard title='Partage de la campagne'>
      <p>Donnez accès au suivi à un autre organisme. Cela ne l’autorise pas à saisir les réponses des préleveurs.</p>
      <p className='fr-text--sm'><strong>{campaign.owner?.label || campaign.ownerContact?.label || 'Organisme responsable'}</strong> organise cette collecte et conserve son accès.</p>
      <CampaignNotice error>{error}</CampaignNotice>
      {canManageSharing ? (
        <form onSubmit={submit}>
          <fieldset disabled={busy}>
            <legend className='sr-only'>Accès des organismes</legend>
            {managers.map(manager => (
              <div key={manager.userId} className='mb-3 grid items-end gap-x-3 border-b border-gray-200 md:grid-cols-[1fr_auto]'>
                <CampaignField label={labelOf(manager)} value={manager.role} options={Object.entries(ROLE_LABELS).map(([value, label]) => ({value, label}))} onChange={role => update(managers.map(item => item.userId === manager.userId ? {...item, role} : item))} />
                <button type='button' className='fr-btn fr-btn--tertiary-no-outline fr-btn--sm fr-mb-2w' aria-label={`Retirer l’accès de ${labelOf(manager)}`} onClick={() => update(managers.filter(item => item.userId !== manager.userId))}>Retirer l’accès</button>
              </div>
            ))}
            {managers.length === 0 && <p>Aucun autre organisme n’a accès à cette campagne.</p>}
            {available.length > 0 ? <div className='grid items-end gap-x-3 md:grid-cols-[1fr_auto]'>
              <CampaignField label='Ajouter un organisme' value={selectedUserId} options={[{value: '', label: 'Choisir un organisme'}, ...available.map(person => ({value: person.userId, label: person.label}))]} onChange={setSelectedUserId} />
              <button type='button' className='fr-btn fr-btn--secondary fr-btn--sm fr-mb-2w' disabled={!selectedUserId} onClick={() => {
                update([...managers, {userId: selectedUserId, role: 'READER', label: people.get(selectedUserId)?.label}])
                setSelectedUserId('')
              }}
              >Ajouter en consultation</button>
            </div> : <p className='fr-text--sm'>Aucun autre organisme disponible.</p>}
            <p className='fr-hint-text'>« Consulter » permet de suivre les réponses et de les télécharger. « Gérer » permet aussi d’ouvrir ou de clôturer la saisie, de relancer les préleveurs et de gérer les accès.</p>
            <button type='submit' className='fr-btn' disabled={!dirty || busy}>{busy ? 'Enregistrement…' : 'Enregistrer les accès'}</button>
          </fieldset>
        </form>
      ) : (managers.length > 0 ? <dl className='space-y-2'>{managers.map(manager => <div key={manager.userId}><dt className='font-bold'>{labelOf(manager)}</dt><dd>{ROLE_LABELS[manager.role] || 'Consulter'}</dd></div>)}</dl> : <p>Aucun autre organisme n’a accès à cette campagne.</p>)}
    </CampaignCard>
  )
}

export default CampaignSharing
