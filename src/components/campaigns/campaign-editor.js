'use client'

import {useEffect, useRef, useState} from 'react'

import {Alert} from '@codegouvfr/react-dsfr/Alert'
import {useRouter} from 'next/navigation'
import Link from 'next/link'

import {CampaignPagination, CampaignShell} from '@/components/campaigns/campaign-common.js'
import ExploitationUsageChips from '@/components/exploitations/exploitation-usage-chips.js'
import {CAMPAIGN_TYPE, CAMPAIGN_TYPE_LABEL, campaignData, campaignExploitationLabel, campaignPersonLabel} from '@/lib/campaigns.js'
import {createCampaignAction, getCampaignCandidatesAction, updateCampaignAction} from '@/server/actions/campaigns.js'

export default function CampaignEditor({campaign = null, initialCandidates, initialError}) {
  const router = useRouter()
  const [form, setForm] = useState({name: campaign?.name || '', opensOn: campaign?.opensOn?.slice(0, 10) || '', closesOn: campaign?.closesOn?.slice(0, 10) || '', collecteurUserId: campaign?.collecteurUserId || campaign?.collecteur?.userId || ''})
  const [selected, setSelected] = useState(campaign?.exploitationIds || campaign?.responses?.map(response => response.exploitationId) || [])
  const [result, setResult] = useState(initialCandidates || {items: [], total: 0, page: 1, pageSize: 25})
  const [filters, setFilters] = useState({q: '', usageId: ''})
  const [appliedFilters, setAppliedFilters] = useState({q: '', usageId: ''})
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(initialError)
  const [ready, setReady] = useState(false)
  const requestId = useRef(0)
  const populationEditable = !campaign || campaign.status === 'DRAFT'
  const field = (name, value) => setForm(previous => ({...previous, [name]: value}))
  useEffect(() => () => { requestId.current += 1 }, [])
  useEffect(() => { setReady(true) }, [])

  async function search(page = 1, options = appliedFilters, selectAll = false) {
    const current = ++requestId.current
    setLoading(true)
    setError(null)
    try {
      const next = campaignData(await getCampaignCandidatesAction({...options, collecteurUserId: (options.collecteurUserId ?? form.collecteurUserId) || undefined, page, pageSize: 25, ...(selectAll ? {selectAll: true} : {})}))
      if (requestId.current !== current) return
      setResult(next)
      setAppliedFilters(options)
      if (selectAll) setSelected(previous => [...new Set([...previous, ...(next.selectedIds || [])])])
    } catch (error) {
      if (current === requestId.current) {
        setError(error.message)
        setResult(previous => ({...previous, items: [], total: 0}))
      }
    } finally { if (current === requestId.current) setLoading(false) }
  }
  function toggle(id, checked) {
    setSelected(previous => checked ? [...new Set([...previous, id])] : previous.filter(value => value !== id))
  }
  async function save(event) {
    event.preventDefault()
    setSaving(true)
    setError(null)
    try {
      const payload = {...form, opensOn: form.opensOn || null, closesOn: form.closesOn || null}
      if (populationEditable) Object.assign(payload, {type: CAMPAIGN_TYPE, exploitationIds: selected})
      else delete payload.collecteurUserId
      const saved = campaignData(campaign ? await updateCampaignAction(campaign.id, payload) : await createCampaignAction(payload))
      router.push(`/administration/campagnes/${saved.campaign?.id || saved.id || campaign.id}`)
      router.refresh()
    } catch (error) { setError(error.message) } finally { setSaving(false) }
  }
  return (
    <CampaignShell admin title={campaign ? 'Modifier la campagne' : 'Créer une campagne'} actions={<Link className='fr-btn fr-btn--sm fr-btn--tertiary' href={`/administration/campagnes${campaign ? `/${campaign.id}` : ''}`}>Retour</Link>}>
      <form onSubmit={save}>
        <fieldset disabled={!ready || saving} className='m-0 grid min-w-0 gap-4 border-0 p-0'>
          {error && <Alert severity='error' title='La campagne n’a pas été enregistrée' description={error} />}
          <section className='border bg-white p-4 md:p-5'>
            <h2 className='fr-h5'>Informations générales</h2>
            <div className='fr-input-group'><label className='fr-label' htmlFor='campaign-name'>Nom de la campagne</label><input id='campaign-name' className='fr-input' required maxLength={200} value={form.name} onChange={event => field('name', event.target.value)} /></div>
            <p className='fr-text--sm'><span className='font-semibold'>Type :</span> {CAMPAIGN_TYPE_LABEL}</p>
            <div className='grid gap-4 md:grid-cols-2'>
              <div className='fr-input-group'><label className='fr-label' htmlFor='campaign-opens'>Date de début <span className='fr-hint-text'>Peut être précisée avant l’ouverture.</span></label><input id='campaign-opens' className='fr-input' type='date' value={form.opensOn} onChange={event => field('opensOn', event.target.value)} /></div>
              <div className='fr-input-group'><label className='fr-label' htmlFor='campaign-closes'>Date de fin <span className='fr-hint-text'>Au plus tôt le 31 octobre 2026.</span></label><input id='campaign-closes' className='fr-input' type='date' min='2026-10-31' value={form.closesOn} onChange={event => field('closesOn', event.target.value)} /></div>
            </div>
            <div className='fr-select-group fr-mb-0'><label className='fr-label' htmlFor='campaign-collector'>Collecteur destinataire</label>
              <select id='campaign-collector' className='fr-select' required disabled={!populationEditable || saving} value={form.collecteurUserId} onChange={event => { const id = event.target.value; field('collecteurUserId', id); setSelected([]); search(1, {...filters, collecteurUserId: id}) }}>
                <option value=''>Choisir un collecteur</option>
                {(result.collecteurs?.length ? result.collecteurs : campaign?.collecteur ? [campaign.collecteur] : []).map(person => <option key={person.userId || person.id} value={person.userId || person.id}>{campaignPersonLabel(person)}</option>)}
              </select>
            </div>
          </section>
          {populationEditable ? (
            <section className='border bg-white p-4 md:p-5'>
              <h2 className='fr-h5'>Exploitations concernées</h2>
              <div className='mb-3 flex flex-wrap items-end gap-3'>
                <div className='fr-input-group fr-mb-0 min-w-52 flex-1'><label className='fr-label' htmlFor='campaign-search'>Rechercher</label><input id='campaign-search' className='fr-input' type='search' placeholder='Point, préleveur, code comptage' value={filters.q} onChange={event => setFilters(previous => ({...previous, q: event.target.value}))} onKeyDown={event => { if (event.key === 'Enter') { event.preventDefault(); search(1, filters) } }} /></div>
                <div className='fr-select-group fr-mb-0'><label className='fr-label' htmlFor='campaign-usage'>Usage</label><select id='campaign-usage' className='fr-select' value={filters.usageId} onChange={event => setFilters(previous => ({...previous, usageId: event.target.value}))}><option value=''>Tous les usages</option>{result.usages?.map(usage => <option key={usage.id} value={usage.id}>{usage.label}</option>)}</select></div>
                <button className='fr-btn fr-btn--secondary' type='button' disabled={loading} onClick={() => search(1, filters)}>Rechercher</button>
              </div>
              <div className='mb-3 flex flex-wrap items-center gap-3 text-sm'>
                <strong>{selected.length} exploitation{selected.length > 1 ? 's' : ''} sélectionnée{selected.length > 1 ? 's' : ''}</strong>
                <button className='fr-btn fr-btn--tertiary-no-outline fr-btn--sm' type='button' disabled={loading || !result.total || !form.collecteurUserId} onClick={() => search(1, appliedFilters, true)}>Sélectionner les {result.total} résultats</button>
                <button className='fr-btn fr-btn--tertiary-no-outline fr-btn--sm' type='button' disabled={!selected.length} onClick={() => setSelected([])}>Tout désélectionner</button>
              </div>
              {loading ? <p role='status'>Chargement des exploitations…</p> : (
                <><ul className='m-0 max-h-[32rem] list-none overflow-auto border p-0'>
                  {result.items?.map(item => (
                    <li key={item.id || item.exploitationId} className='flex items-start gap-3 border-b p-3 last:border-b-0'>
                      <input type='checkbox' className='mt-1 h-5 w-5 shrink-0 accent-[#000091]' disabled={!form.collecteurUserId || saving} id={`candidate-${item.id || item.exploitationId}`} checked={selected.includes(item.id || item.exploitationId)} onChange={event => toggle(item.id || item.exploitationId, event.target.checked)} />
                      <label className='min-w-0 flex-1 cursor-pointer text-sm' htmlFor={`candidate-${item.id || item.exploitationId}`}><span className='block font-semibold'>{campaignExploitationLabel(item)}</span><span>{campaignPersonLabel(item.preleveur || item.declarant)}{item.point?.commune?.name ? ` · ${item.point.commune.name}` : ''}</span></label>
                      <div className='hidden max-w-52 sm:block'><ExploitationUsageChips compact exploitation={item.exploitation || item} /></div>
                    </li>
                  ))}
                  {!result.items?.length && <li className='p-4'>Aucune exploitation ne correspond à la recherche.</li>}
                </ul><CampaignPagination page={result.page || 1} total={result.total || 0} pageSize={result.pageSize || 25} onChange={page => search(page)} /></>
              )}
            </section>
          ) : <p className='fr-text--sm'>Les exploitations et le collecteur ne sont plus modifiables après l’ouverture.</p>}
          <div><button className='fr-btn' disabled={saving || (populationEditable && !selected.length)} type='submit'>{saving ? 'Enregistrement…' : campaign ? 'Enregistrer les modifications' : 'Créer le brouillon'}</button></div>
        </fieldset>
      </form>
    </CampaignShell>
  )
}
