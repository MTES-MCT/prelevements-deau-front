'use client'

import {
  useCallback, useEffect, useRef, useState
} from 'react'

import {useRouter} from 'next/navigation'

import CampaignPointsStep from '@/components/campaigns/campaign-points-step.js'
import CampaignTerritorySelect from '@/components/campaigns/campaign-territory-select.js'
import {CampaignGlobalTimeline} from '@/components/campaigns/campaign-timeline.js'
import {CampaignCard, CampaignField, CampaignNotice} from '@/components/campaigns/campaign-ui.js'
import {campaignResponseSchedule, isCampaignDay, shiftCampaignDay} from '@/lib/campaign-calendar.js'
import {
  CAMPAIGN_CONFIG_STEPS, addCampaignReadingDate, campaignConfigurationErrors, campaignConfigurationPayload, defaultCampaignCalendar,
  initialCampaignConfiguration, newCampaignPeriod, removeCampaignReadingDate, replaceCampaignReadingDate
} from '@/lib/campaign-configuration.js'
import {
  campaignDate, campaignExclusiveEnd, campaignInclusiveEnd, confirmCampaignAction, unwrapCampaignResult
} from '@/lib/collection-campaigns.js'
import {getCampaignOptionsAction, saveCampaignAction} from '@/server/actions/campaigns.js'

const personLabel = person => person.label || person.socialReason || [person.firstName || person.user?.firstName, person.lastName || person.user?.lastName].filter(Boolean).join(' ') || person.email || 'Compte'
const idOf = value => value.userId || value.id
const targetId = target => target.exploitationId || target.id
const pointId = target => target?.pointPrelevementId || target?.pointPrelevement?.id
const selectOptions = (items, placeholder = 'Choisir') => [{value: '', label: placeholder}, ...items.map(item => ({value: idOf(item), label: item.name || personLabel(item)}))]
const STEP_DESCRIPTIONS = [
  'Identifiez le territoire et le collecteur qui portera la campagne.',
  'Définissez les relevés, les besoins en eau et les dates de réponse, puis préparez les relances et le message d’invitation.',
  'Sélectionnez les points de prélèvement concernés, puis enregistrez votre brouillon.'
]

const PeriodFields = ({period, onChange, onRemove, canRemove}) => (
  <fieldset className='mb-4 rounded-md border border-[var(--border-default-grey)] p-4'>
    <legend className='px-2 font-bold'>{period.label || 'Nouvelle période'}</legend>
    <div className='grid gap-3 md:grid-cols-3'>
      <CampaignField required label='Nom de la période' value={period.label} onChange={label => onChange({label})} />
      <CampaignField required label='Du' type='date' max={campaignInclusiveEnd(period.endDate) || undefined} value={period.startDate?.slice(0, 10)} onChange={startDate => onChange({startDate})} />
      <CampaignField required label='Au (inclus)' type='date' min={period.startDate || undefined} value={campaignInclusiveEnd(period.endDate)} onChange={endDate => onChange({endDate: campaignExclusiveEnd(endDate)})} />
    </div>
    <button type='button' className='fr-btn fr-btn--tertiary-no-outline fr-btn--sm' disabled={!canRemove} onClick={onRemove}>Retirer cette période</button>
  </fieldset>
)

export const OrganizationStep = ({form, options, loadingOptions, onScopeChange, onYearChange, update}) => (
  <CampaignCard headingLevel='h3' title='Qui organise la collecte ?'>
    <CampaignTerritorySelect territories={options.zones || []} value={form.zoneId} onChange={zoneId => onScopeChange({zoneId, ownerCollecteurUserId: ''})} />
    <CampaignField required label='Collecteur' disabled={!form.zoneId || loadingOptions} options={selectOptions(options.collecteurs || [], loadingOptions ? 'Chargement des collecteurs…' : 'Choisir un collecteur')} value={form.ownerCollecteurUserId} onChange={ownerCollecteurUserId => onScopeChange({ownerCollecteurUserId})} />
    {!loadingOptions && options.zones?.length === 0 && <CampaignNotice>Aucun territoire actif disponible dans votre périmètre.</CampaignNotice>}
    {form.zoneId && !loadingOptions && options.collecteurs?.length === 0 && <CampaignNotice>Aucun collecteur disponible sur ce territoire. Choisissez un autre territoire ou contactez votre administrateur.</CampaignNotice>}
    <div className='grid items-center gap-3 md:grid-cols-[12rem_1fr]'>
      <CampaignField required label='Année des relevés' type='number' min='2000' max='2200' value={form.year} onChange={onYearChange} />
      <CampaignField required label='Nom de la campagne' value={form.name} onChange={name => update({name})} />
    </div>
  </CampaignCard>
)

export const CalendarStep = ({form, update}) => (
  <>
    <CampaignGlobalTimeline {...form} hideTitle />
    <CampaignNotice error>{campaignConfigurationErrors(form, 1).join(' ')}</CampaignNotice>
    <CampaignCard headingLevel='h3' title='À quelles dates relever les compteurs ?'>
      <div className='grid gap-3 md:grid-cols-3'>
        {form.indexDates.map((date, index) => (
          // Slots stay in place while a date is edited.
          // eslint-disable-next-line react/no-array-index-key
          <div key={'date-' + index}>
            <CampaignField required label={'Relevé ' + (index + 1)} type='date' min={shiftCampaignDay(form.indexDates[index - 1], 1) || undefined} max={shiftCampaignDay(form.indexDates[index + 1], -1) || undefined} value={date} onChange={value => update(replaceCampaignReadingDate(form, index, value))} />
            <button type='button' className='fr-btn fr-btn--tertiary-no-outline fr-btn--sm fr-mb-2w' aria-label={'Retirer le relevé ' + (index + 1)} disabled={form.indexDates.length <= 2} onClick={() => update(removeCampaignReadingDate(form, index))}>Retirer</button>
          </div>
        ))}
      </div>
      <button type='button' className='fr-btn fr-btn--tertiary fr-btn--sm' disabled={form.indexDates.length >= 100 || form.indexDates.length + form.periods.filter(period => period.kind === 'NEEDS').length > 100} onClick={() => update(addCampaignReadingDate(form))}>Ajouter un relevé</button>
    </CampaignCard>
    <CampaignCard headingLevel='h3' title='Pour quelles périodes demander les besoins en eau ?'>
      <p>Les préleveurs indiqueront le volume d’eau prévu pour chaque période, en m³.</p>
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
    <ResponseSettings form={form} update={update} />
  </>
)

export const ResponseSettings = ({form, update}) => {
  const schedule = campaignResponseSchedule(form)
  const lastReading = form.indexDates.filter(date => isCampaignDay(date)).sort().at(-1)
  const deadlineMinimum = [lastReading, schedule.opening].filter(Boolean).sort().at(-1)
  return (
    <CampaignCard headingLevel='h3' title='Quand et comment demander les réponses ?'>
      <div className='grid gap-3 md:grid-cols-2'>
        <CampaignField label='Début de saisie au plus tôt (facultatif)' hint={schedule.opening ? 'L’ouverture reste à votre initiative, à partir de cette date.' : 'Sans date, vous pourrez ouvrir la saisie dès que votre campagne sera prête.'} type='date' max={schedule.deadline || undefined} value={form.opensAt.slice(0, 10)} onChange={date => update({opensAt: date ? date + 'T00:00' : ''})} />
        <CampaignField label='Date limite de réponse (facultatif)' hint={schedule.deadline ? 'Les réponses restent modifiables jusqu’à cette date.' : 'Cette date doit permettre de saisir le dernier relevé demandé. Sans date, vous clôturerez la saisie vous-même.'} type='date' min={deadlineMinimum} value={form.closesAt.slice(0, 10)} onChange={date => update({closesAt: date ? date + 'T23:59' : '', ...(date ? {} : {reminderDays: []})})} />
      </div>
      <fieldset className='min-w-0 mb-5'>
        <legend className='fr-h6 fr-mb-1w'>Relances automatiques</legend>
        <p className='fr-text--sm'>Seuls les préleveurs qui n’ont pas répondu recevront ces rappels. Sans sélection, aucune relance automatique n’est envoyée.</p>
        {!form.closesAt && <p className='fr-hint-text'>Renseignez une date limite pour choisir les dates des relances.</p>}
        <div className='grid gap-3 sm:grid-cols-2 lg:grid-cols-4'>
          {[...new Set([14, 7, 3, 1, ...form.reminderDays])].sort((a, b) => b - a).map(days => {
            const reminderDate = shiftCampaignDay(schedule.deadline, -days)
            const beforeOpening = reminderDate && schedule.opening && reminderDate < schedule.opening
            return (
              <label key={days} className='flex items-start gap-2 rounded border border-[var(--border-default-grey)] p-3 text-sm'>
                <input type='checkbox' className='mt-1' disabled={!form.closesAt || (beforeOpening && !form.reminderDays.includes(days))} checked={form.reminderDays.includes(days)} onChange={event => update({reminderDays: event.target.checked ? [...form.reminderDays, days] : form.reminderDays.filter(value => value !== days)})} />
                <span><span className='block font-bold'>{days === 0 ? 'Le jour de la date limite' : `${days} jour${days > 1 ? 's' : ''} avant`}</span><span className='block text-[var(--text-mention-grey)]'>{reminderDate ? campaignDate(reminderDate) : 'Date à définir'}{beforeOpening && ' (avant l’ouverture)'}</span></span>
              </label>
            )
          })}
        </div>
      </fieldset>
      <CampaignField multiline label='Message aux préleveurs (facultatif)' hint='Ce message accompagnera l’invitation lors de l’ouverture de la saisie.' value={form.openingMessage} onChange={openingMessage => update({openingMessage})} />
    </CampaignCard>
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
  const [selectingPoints, setSelectingPoints] = useState(false)
  const [knownTargets, setKnownTargets] = useState(() => new Map([...(initialOptions.exploitations || []), ...(context?.targets || [])].map(item => [targetId(item), item])))
  const heading = useRef(null)
  const calendarYear = useRef(form.year)
  const finalStep = CAMPAIGN_CONFIG_STEPS.length - 1
  const pointsPending = step === finalStep && (loadingOptions || selectingPoints)
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
    if ((form.targets.length > 0 || form.managers.length > 0) && !confirmCampaignAction('Changer de territoire ou de collecteur retirera les points et les accès déjà sélectionnés. Continuer ?')) {
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
    if (saving || pointsPending) {
      return
    }

    const errors = campaignConfigurationErrors(form, step === finalStep ? undefined : step)
    if (step === finalStep) {
      const pointIds = form.targets.map(item => pointId(knownTargets.get(item.exploitationId))).filter(Boolean)
      if (new Set(pointIds).size !== pointIds.length) {
        errors.push('Un même point ne peut être sélectionné que pour une seule exploitation.')
      }
    }

    if (errors.length > 0) {
      setError(errors.join(' '))
      if (step === finalStep) {
        const invalidStep = CAMPAIGN_CONFIG_STEPS.findIndex((_label, index) => campaignConfigurationErrors(form, index).length > 0)
        if (invalidStep !== -1) {
          setStep(invalidStep)
        }
      }

      return
    }

    if (step < finalStep) {
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
      <ol aria-label='Étapes de préparation de la campagne' className='fr-mb-4w grid list-none grid-cols-1 gap-3 p-0 sm:grid-cols-3'>
        {CAMPAIGN_CONFIG_STEPS.map((label, index) => (
          <li key={label} style={{listStyle: 'none'}} aria-current={index === step ? 'step' : undefined} className={`flex items-center gap-3 border-b-2 pb-3 text-sm ${index === step ? 'border-[var(--border-active-blue-france)] font-bold text-[var(--text-action-high-blue-france)]' : 'border-[var(--border-default-grey)] text-[var(--text-mention-grey)]'}`}>
            <span aria-hidden='true' className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs ${index === step ? 'bg-[var(--background-action-high-blue-france)] text-[var(--text-inverted-blue-france)]' : 'bg-[var(--background-contrast-grey)]'}`}>{index + 1}</span>
            {label}
          </li>
        ))}
      </ol>
      <div className='fr-mb-3w'>
        <p className='fr-mb-1v text-xs font-bold uppercase tracking-widest text-[var(--text-mention-grey)]'>{`Étape ${step + 1} sur ${CAMPAIGN_CONFIG_STEPS.length}`}</p>
        <h2 ref={heading} tabIndex={-1} className='fr-h3 fr-mb-1w'>{CAMPAIGN_CONFIG_STEPS[step]}</h2>
        <p className='fr-mb-0 text-[var(--text-mention-grey)]'>{STEP_DESCRIPTIONS[step]}</p>
      </div>
      <CampaignNotice error>{error}</CampaignNotice>
      <fieldset className='min-w-0' disabled={saving}>
        <legend className='sr-only'>{CAMPAIGN_CONFIG_STEPS[step]}</legend>
        {step === 0 && <OrganizationStep form={form} loadingOptions={loadingOptions} options={options} update={update} onScopeChange={changeScope} onYearChange={changeYear} />}
        {step === 1 && <CalendarStep form={form} update={update} />}
        {step === finalStep && <>
          <CampaignPointsStep form={form} knownTargets={knownTargets} loadingOptions={loadingOptions} options={options} query={query} setQuery={changeQuery} usageId={usageId} setUsageId={changeUsage} update={update} onTargetsLoaded={rememberTargets} onBusyChange={setSelectingPoints} />
          <CampaignNotice>Vous enregistrez un brouillon, sans envoyer d’invitation. Vous ouvrirez ensuite la saisie depuis la fiche de la campagne.</CampaignNotice>
        </>}
        <div className='flex flex-wrap items-center justify-between gap-3 border-t border-gray-200 pt-4'>
          {step > 0 ? <button type='button' className='fr-btn fr-btn--secondary' onClick={() => goToStep(step - 1)}>Étape précédente</button> : <span />}
          <button type='submit' className='fr-btn' disabled={saving || pointsPending || (step === 0 && loadingOptions)}>{saving ? 'Enregistrement…' : (step === finalStep ? saveLabel : 'Continuer')}</button>
        </div>
      </fieldset>
    </form>
  )
}

export default CampaignConfigForm
