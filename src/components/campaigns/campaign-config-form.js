'use client'

import {
  useCallback, useEffect, useRef, useState
} from 'react'

import {useRouter} from 'next/navigation'

import CampaignPointsStep from '@/components/campaigns/campaign-points-step.js'
import CampaignTerritorySelect from '@/components/campaigns/campaign-territory-select.js'
import {CampaignCard, CampaignField, CampaignNotice} from '@/components/campaigns/campaign-ui.js'
import {
  CAMPAIGN_CONFIG_STEPS, addCampaignReadingDate, campaignConfigurationErrors, campaignConfigurationPayload, defaultCampaignCalendar,
  initialCampaignConfiguration, newCampaignPeriod, removeCampaignReadingDate, replaceCampaignReadingDate
} from '@/lib/campaign-configuration.js'
import {
  campaignDate, campaignExclusiveEnd, campaignInclusiveEnd, campaignPointName, confirmCampaignAction, unwrapCampaignResult
} from '@/lib/collection-campaigns.js'
import {getCampaignOptionsAction, saveCampaignAction} from '@/server/actions/campaigns.js'

const personLabel = person => person.label || person.socialReason || [person.firstName || person.user?.firstName, person.lastName || person.user?.lastName].filter(Boolean).join(' ') || person.email || 'Compte'
const idOf = value => value.userId || value.id
const targetId = target => target.exploitationId || target.id
const pointId = target => target?.pointPrelevementId || target?.pointPrelevement?.id
const selectOptions = (items, placeholder = 'Choisir') => [{value: '', label: placeholder}, ...items.map(item => ({value: idOf(item), label: item.name || personLabel(item)}))]
const periodRange = period => 'Du ' + campaignDate(period.startDate) + ' au ' + campaignDate(campaignInclusiveEnd(period.endDate)) + ' inclus'

const PeriodFields = ({period, onChange, onRemove, canRemove}) => (
  <fieldset className='mb-4 border border-gray-200 p-4'>
    <legend className='px-2 font-bold'>{period.label || 'Nouvelle période'}</legend>
    <div className='grid gap-3 md:grid-cols-2'>
      <CampaignField required label='Du' type='date' value={period.startDate?.slice(0, 10)} onChange={startDate => onChange({startDate})} />
      <CampaignField required label='Au (inclus)' type='date' value={campaignInclusiveEnd(period.endDate)} onChange={endDate => onChange({endDate: campaignExclusiveEnd(endDate)})} />
    </div>
    <details>
      <summary className='cursor-pointer text-[#000091]'>Modifier le nom</summary>
      <div className='pt-3'>
        <CampaignField required label='Nom de la période' value={period.label} onChange={label => onChange({label})} />
        <button type='button' className='fr-btn fr-btn--tertiary-no-outline fr-btn--sm' disabled={!canRemove} onClick={onRemove}>Retirer cette période</button>
      </div>
    </details>
  </fieldset>
)

export const OrganizationStep = ({form, options, loadingOptions, onScopeChange, onYearChange, update}) => (
  <CampaignCard title='Qui organise la collecte ?'>
    <CampaignTerritorySelect territories={options.zones || []} value={form.zoneId} onChange={zoneId => onScopeChange({zoneId, ownerCollecteurUserId: ''})} />
    <CampaignField required label='Organisme responsable' disabled={!form.zoneId || loadingOptions} options={selectOptions(options.collecteurs || [], loadingOptions ? 'Chargement des organismes…' : 'Choisir un organisme')} value={form.ownerCollecteurUserId} onChange={ownerCollecteurUserId => onScopeChange({ownerCollecteurUserId})} />
    {form.zoneId && !loadingOptions && options.collecteurs?.length === 0 && <CampaignNotice>Aucun organisme disponible sur ce territoire. Choisissez un autre territoire ou contactez votre administrateur.</CampaignNotice>}
    <div className='grid items-center gap-3 md:grid-cols-[12rem_1fr]'>
      <CampaignField required label='Année des relevés' type='number' min='2000' max='2200' value={form.year} onChange={onYearChange} />
      <CampaignField required label='Nom de la campagne' value={form.name} onChange={name => update({name})} />
    </div>
  </CampaignCard>
)

export const CalendarStep = ({form, update}) => (
  <>
    <CampaignCard title='À quelles dates relever les compteurs ?'>
      <p>Le volume prélevé sera déduit de deux relevés successifs.</p>
      <div className='grid gap-3 md:grid-cols-3'>
        {form.indexDates.map((date, index) => (
          // Slots stay in place while a date is edited.
          // eslint-disable-next-line react/no-array-index-key
          <div key={'date-' + index}>
            <CampaignField required label={'Relevé ' + (index + 1)} type='date' value={date} onChange={value => update(replaceCampaignReadingDate(form, index, value))} />
            <button type='button' className='fr-btn fr-btn--tertiary-no-outline fr-btn--sm fr-mb-2w' aria-label={'Retirer le relevé ' + (index + 1)} disabled={form.indexDates.length <= 2} onClick={() => update(removeCampaignReadingDate(form, index))}>Retirer</button>
          </div>
        ))}
      </div>
      <button type='button' className='fr-btn fr-btn--tertiary fr-btn--sm' disabled={form.indexDates.length >= 100 || form.indexDates.length + form.periods.filter(period => period.kind === 'NEEDS').length > 100} onClick={() => update(addCampaignReadingDate(form))}>Ajouter un relevé</button>
    </CampaignCard>
    <CampaignCard title='Pour quelles périodes demander les besoins en eau ?'>
      <p>Les préleveurs indiqueront le débit et le volume dont ils prévoient d’avoir besoin pour chaque période.</p>
      {form.periods.filter(period => period.kind === 'NEEDS').map(period => (
        <PeriodFields
          key={period.kind + '-' + period.position}
          canRemove={form.periods.filter(item => item.kind === 'NEEDS').length > 1}
          period={period}
          onChange={changes => update({periods: form.periods.map(item => item === period ? {...item, ...changes} : item)})}
          onRemove={() => update({periods: form.periods.filter(item => item !== period)})}
        />
      ))}
      <button type='button' className='fr-btn fr-btn--tertiary fr-btn--sm' disabled={form.indexDates.length - 1 + form.periods.filter(period => period.kind === 'NEEDS').length >= 100} onClick={() => update({periods: [...form.periods, newCampaignPeriod('NEEDS', form.periods)]})}>Ajouter une période de besoins</button>
    </CampaignCard>
  </>
)

export const ReviewStep = ({form, options, knownTargets, update, goToStep}) => {
  const zone = (options.zones || []).find(item => item.id === form.zoneId)
  const owner = (options.collecteurs || []).find(item => idOf(item) === form.ownerCollecteurUserId)
  return (
    <>
      <CampaignCard title='Votre campagne en résumé'>
        <dl className='grid gap-x-6 gap-y-2 md:grid-cols-[12rem_1fr]'>
          <dt className='font-bold'>Nom</dt><dd>{form.name}</dd>
          <dt className='font-bold'>Territoire</dt><dd>{zone?.name || 'Territoire sélectionné'}</dd>
          <dt className='font-bold'>Organisme</dt><dd>{owner ? personLabel(owner) : 'Organisme sélectionné'}</dd>
          <dt className='font-bold'>Dates des relevés</dt><dd>{form.indexDates.map(date => campaignDate(date)).join(' · ')}</dd>
          <dt className='font-bold'>Points concernés</dt><dd>{form.targets.length}</dd>
        </dl>
        <div className='fr-mt-2w'>
          <h3 className='fr-h6 fr-mb-1w'>Besoins en eau</h3>
          <ul className='fr-mb-0'>{form.periods.filter(period => period.kind === 'NEEDS').map(period => <li key={period.kind + '-' + period.position}>{period.label + ' : ' + periodRange(period)}</li>)}</ul>
        </div>
        {form.targets.length > 0 && (
          <details className='fr-mt-2w'>
            <summary className='cursor-pointer text-[#000091]'>Voir les points sélectionnés</summary>
            <ul className='fr-mt-1w'>{form.targets.map(item => <li key={item.exploitationId}>{campaignPointName(knownTargets.get(item.exploitationId) || {})}</li>)}</ul>
          </details>
        )}
        <div className='fr-mt-2w flex flex-wrap gap-3'>
          <button type='button' className='fr-btn fr-btn--tertiary fr-btn--sm' onClick={() => goToStep(0)}>Modifier l’organisation</button>
          <button type='button' className='fr-btn fr-btn--tertiary fr-btn--sm' onClick={() => goToStep(1)}>Modifier le calendrier</button>
          <button type='button' className='fr-btn fr-btn--tertiary fr-btn--sm' onClick={() => goToStep(2)}>Modifier les points</button>
        </div>
      </CampaignCard>
      <CampaignCard title='Quand et comment demander les réponses ?'>
        <CampaignField label='Date limite de réponse (facultatif)' hint='Les réponses sont acceptées jusqu’à la fin de cette journée.' type='date' value={form.closesAt.slice(0, 10)} onChange={date => update({closesAt: date ? date + 'T23:59' : ''})} />
        <CampaignField multiline label='Message aux préleveurs (facultatif)' hint='Ce texte accompagnera l’invitation à répondre, lorsque vous ouvrirez la saisie.' value={form.openingMessage} onChange={openingMessage => update({openingMessage})} />
        <details className='fr-mt-2w'>
          <summary className='cursor-pointer text-[#000091]'>Début de saisie et relances (facultatif)</summary>
          <div className='pt-4'>
            <CampaignField label='Début de saisie au plus tôt (facultatif)' hint='Vous devrez aussi ouvrir la saisie pour envoyer les invitations.' type='date' value={form.opensAt.slice(0, 10)} onChange={date => update({opensAt: date ? date + 'T00:00' : ''})} />
            <fieldset className='fr-mb-3w'>
              <legend className='font-bold'>Relancer les préleveurs qui n’ont pas répondu</legend>
              <p className='fr-hint-text'>Les relances nécessitent une date limite de réponse.</p>
              <div className='flex flex-wrap gap-4'>
                {[...new Set([14, 7, 3, 1, ...form.reminderDays])].sort((a, b) => b - a).map(days => (
                  <label key={days} className='flex items-center gap-2'><input type='checkbox' disabled={!form.closesAt} checked={form.reminderDays.includes(days)} onChange={event => update({reminderDays: event.target.checked ? [...form.reminderDays, days] : form.reminderDays.filter(value => value !== days)})} />{days + ' jour' + (days > 1 ? 's' : '') + ' avant'}</label>
                ))}
              </div>
            </fieldset>
          </div>
        </details>
      </CampaignCard>
      <CampaignNotice>Vous enregistrez un brouillon, sans envoyer d’invitation. Les préleveurs pourront saisir leurs relevés une fois la saisie ouverte.</CampaignNotice>
    </>
  )
}

const CampaignConfigForm = ({context, initialOptions = {}, onSaved}) => {
  const router = useRouter()
  const campaign = context?.campaign
  const saveLabel = campaign ? 'Enregistrer les modifications' : 'Créer le brouillon'
  const [form, setForm] = useState(() => initialCampaignConfiguration(context, initialOptions))
  const [options, setOptions] = useState(initialOptions)
  const [query, setQuery] = useState('')
  const [usageId, setUsageId] = useState('')
  const [step, setStep] = useState(0)
  const [error, setError] = useState(null)
  const [saving, setSaving] = useState(false)
  const [loadingOptions, setLoadingOptions] = useState(false)
  const [knownTargets, setKnownTargets] = useState(() => new Map([...(initialOptions.exploitations || []), ...(context?.targets || [])].map(item => [targetId(item), item])))
  const heading = useRef(null)
  const calendarYear = useRef(form.year)
  const update = changes => setForm(previous => ({...previous, ...changes}))
  const rememberTargets = useCallback(rows => setKnownTargets(previous => new Map([...previous, ...rows.map(item => [targetId(item), item])])), [])
  const changeQuery = value => {
    if (value !== query) {
      setLoadingOptions(true)
      setQuery(value)
    }
  }

  const changeUsage = value => {
    if (value !== usageId) {
      setLoadingOptions(true)
      setUsageId(value)
    }
  }

  const goToStep = nextStep => {
    setError(null)
    setStep(nextStep)
  }

  useEffect(() => {
    heading.current?.focus()
  }, [step])

  useEffect(() => {
    let active = true
    setLoadingOptions(true)
    const timeout = setTimeout(async () => {
      try {
        const result = unwrapCampaignResult(await getCampaignOptionsAction({
          zoneId: form.zoneId, ownerCollecteurUserId: form.ownerCollecteurUserId, q: query, usageId
        }))
        if (active) {
          setOptions(result)
          setKnownTargets(previous => new Map([...previous, ...(result.exploitations || []).map(item => [targetId(item), item])]))
          setForm(previous => {
            const zoneId = previous.zoneId || (result.zones?.length === 1 ? result.zones[0].id : '')
            const ownerCollecteurUserId = previous.ownerCollecteurUserId || (zoneId && result.collecteurs?.length === 1 ? result.collecteurs[0].userId : '')
            return zoneId === previous.zoneId && ownerCollecteurUserId === previous.ownerCollecteurUserId ? previous : {...previous, zoneId, ownerCollecteurUserId}
          })
        }
      } catch (error_) {
        if (active) {
          setError(error_.message)
        }
      } finally {
        if (active) {
          setLoadingOptions(false)
        }
      }
    }, 350)
    return () => {
      active = false
      clearTimeout(timeout)
    }
  }, [form.zoneId, form.ownerCollecteurUserId, query, usageId])

  const changeScope = changes => {
    if ((form.targets.length > 0 || form.managers.length > 0) && !confirmCampaignAction('Changer de territoire ou d’organisme retirera les points et les accès déjà sélectionnés. Continuer ?')) {
      return
    }

    update({...changes, targets: [], managers: []})
    setQuery('')
    setUsageId('')
    setError(null)
    setOptions(previous => ({
      ...previous, exploitations: [], managers: [], ...(Object.hasOwn(changes, 'zoneId') ? {collecteurs: []} : {})
    }))
  }

  const changeYear = year => {
    const value = Number(year)
    if (campaign || value < 2000 || value > 2200 || !Number.isInteger(value) || value === Number(calendarYear.current)) {
      update({year})
      return
    }

    const previousCalendar = defaultCampaignCalendar(calendarYear.current)
    const customized = JSON.stringify(form.indexDates) !== JSON.stringify(previousCalendar.indexDates) || JSON.stringify(form.periods) !== JSON.stringify(previousCalendar.periods)
    if (customized && !confirmCampaignAction('Changer l’année remplacera les dates personnalisées par le calendrier proposé pour cette nouvelle année. Continuer ?')) {
      return
    }

    const previousName = 'Relevés ' + calendarYear.current + ' et besoins ' + (Number(calendarYear.current) + 1)
    calendarYear.current = value
    update({year, ...defaultCampaignCalendar(value), ...(form.name === previousName ? {name: 'Relevés ' + value + ' et besoins ' + (value + 1)} : {})})
  }

  const submit = async event => {
    event.preventDefault()
    const errors = campaignConfigurationErrors(form, step === 3 ? undefined : step)
    const pointIds = form.targets.map(item => pointId(knownTargets.get(item.exploitationId))).filter(Boolean)
    if (new Set(pointIds).size !== pointIds.length) {
      errors.push('Un même point ne peut être sélectionné que pour une seule exploitation.')
    }

    if (errors.length > 0) {
      setError(errors.join(' '))
      if (step === 3) {
        const invalidStep = [0, 1, 2].find(index => campaignConfigurationErrors(form, index).length > 0)
        if (invalidStep !== undefined) {
          setStep(invalidStep)
        }
      }

      return
    }

    if (step < 3) {
      goToStep(step + 1)
      return
    }

    setSaving(true)
    setError(null)
    try {
      const saved = unwrapCampaignResult(await saveCampaignAction(campaign?.id, campaignConfigurationPayload(form, campaign)))
      if (onSaved) {
        await onSaved(saved)
      } else {
        router.push('/campagnes/' + (saved.campaign?.id || saved.id))
      }
    } catch (error_) {
      setError(error_.code === 409 ? 'La campagne a été modifiée ailleurs. Conservez votre saisie et rechargez avant de réessayer.' : error_.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <form noValidate onSubmit={submit}>
      <ol aria-label='Étapes de préparation de la campagne' className='fr-mb-4w grid list-none grid-cols-2 gap-2 p-0 md:grid-cols-4'>
        {CAMPAIGN_CONFIG_STEPS.map((label, index) => <li key={label} style={{display: 'block', listStyle: 'none'}} aria-current={index === step ? 'step' : undefined} className={'border-t-4 px-2 py-3 text-sm ' + (index === step ? 'border-[#000091] bg-[#eeeeff] font-bold text-[#000091]' : 'border-gray-300 text-gray-600')}>{index + 1 + '. ' + label}</li>)}
      </ol>
      <h2 ref={heading} tabIndex={-1} className='fr-h4 fr-mb-3w'>{'Étape ' + (step + 1) + ' sur 4 — ' + CAMPAIGN_CONFIG_STEPS[step]}</h2>
      <CampaignNotice error>{error}</CampaignNotice>
      <fieldset disabled={saving}>
        <legend className='sr-only'>{CAMPAIGN_CONFIG_STEPS[step]}</legend>
        {step === 0 && <OrganizationStep form={form} loadingOptions={loadingOptions} options={options} update={update} onScopeChange={changeScope} onYearChange={changeYear} />}
        {step === 1 && <CalendarStep form={form} update={update} />}
        {step === 2 && <CampaignPointsStep form={form} knownTargets={knownTargets} loadingOptions={loadingOptions} options={options} query={query} setQuery={changeQuery} usageId={usageId} setUsageId={changeUsage} update={update} onTargetsLoaded={rememberTargets} />}
        {step === 3 && <ReviewStep form={form} goToStep={goToStep} knownTargets={knownTargets} options={options} update={update} />}
        <div className='flex flex-wrap items-center justify-between gap-3 border-t border-gray-200 pt-4'>
          {step > 0 ? <button type='button' className='fr-btn fr-btn--secondary' onClick={() => goToStep(step - 1)}>Étape précédente</button> : <span />}
          <button type='submit' className='fr-btn' disabled={saving || (step === 0 && loadingOptions)}>{saving ? 'Enregistrement…' : (step === 3 ? saveLabel : 'Continuer')}</button>
        </div>
      </fieldset>
    </form>
  )
}

export default CampaignConfigForm
