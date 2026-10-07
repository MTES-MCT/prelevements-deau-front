'use client'

import {useEffect, useMemo, useRef, useState} from 'react'

import {Alert} from '@codegouvfr/react-dsfr/Alert'
import dynamic from 'next/dynamic'
import Link from 'next/link'

import {CampaignShell, CampaignStatus, CampaignVolumes} from '@/components/campaigns/campaign-common.js'
import CampaignCropsSelect from '@/components/campaigns/campaign-crops-select.js'
import UsageCombobox, {compareUsageOptions} from '@/components/form/usage-combobox.js'
import {formatCampaignNumberInput, normalizeCampaignNumberInput} from '@/lib/campaign-numbers.js'
import {campaignSaveError} from '@/lib/campaign-response-errors.js'
import {
  CAMPAIGN_REQUESTER_DESCRIPTION, CAMPAIGN_REQUESTER_TITLE,
  campaignDate, campaignExploitationLabel, campaignPersonLabel, campaignRequiresIrrigationDetails, campaignState,
  campaignUsageOptions, campaignSelectableUsageOptions, getCampaignField, initialCampaignAnswer,
  normalizeCampaignMeterChanges, setCampaignField, validateCampaignAnswer, validateCampaignIndices
} from '@/lib/campaigns.js'
import {getUsageParent, normalizeUsageOption} from '@/lib/water-uses.js'
import {getCampaignResponseAction, saveCampaignResponseAction} from '@/server/actions/campaigns.js'

const PointMap = dynamic(() => import('@/components/declarations/quick-declaration-map.js'), {ssr: false, loading: () => <p role='status'>Chargement de la carte…</p>})
const DynamicCheckbox = dynamic(() => import('@codegouvfr/react-dsfr/Checkbox'), {ssr: false})

function NumericInput({value, onChange, ...props}) {
  const inputRef = useRef(null)
  function change(event) {
    const count = event.target.value.slice(0, event.target.selectionStart ?? event.target.value.length).replaceAll(/\s/g, '').length
    const next = normalizeCampaignNumberInput(event.target.value)
    onChange(next)
    requestAnimationFrame(() => {
      const input = inputRef.current
      if (input && document.activeElement === input) {
        const formatted = formatCampaignNumberInput(next)
        let position = 0
        let characters = 0
        while (position < formatted.length && characters < count) {
          if (!/\s/.test(formatted[position])) characters++
          position++
        }
        input.setSelectionRange(position, position)
      }
    })
  }
  return <input {...props} ref={inputRef} className='fr-input quick-declaration-control text-right font-semibold tabular-nums' type='text' inputMode='decimal' value={formatCampaignNumberInput(value)} onChange={change} />
}

function UsageInput({value, options, selectableOptions, update, path, readOnly, ...props}) {
  const [search, setSearch] = useState(null)
  const selected = options.find(option => option.value === value)
  return <UsageCombobox {...props} variant='campaign' options={selectableOptions} referenceOptions={options} selectedValue={value} readOnly={readOnly} required={!readOnly} value={selected?.label || (readOnly ? '' : search || '')} onUsageChange={changes => {
    setSearch(changes.usageSearch)
    update(path, changes.usageId)
  }} />
}

function ResponseField({path, label, answer, errors, update, validateField, readOnly, disabled, required = true, type = 'number', hint, options, selectableUsageOptions, maxLength = 3000}) {
  const id = `campaign-${path.replaceAll('.', '-')}`
  const value = getCampaignField(answer, path)
  const error = errors[path]
  if (type === 'crops') return <CampaignCropsSelect id={id} value={value} onChange={value => update(path, value)} readOnly={readOnly} disabled={disabled} error={error} required={required} />
  const inputProps = {id, name: path, readOnly, disabled, onBlur: () => validateField?.(path), 'aria-required': !readOnly && required, 'aria-invalid': Boolean(error), 'aria-describedby': [hint && `${id}-hint`, error && `${id}-error`].filter(Boolean).join(' ') || undefined}
  return (
    <div className={`fr-input-group fr-mb-0 ${error ? 'fr-input-group--error' : ''}`}>
      <label className='fr-label text-sm' htmlFor={id}>{label}{!readOnly && required && <span aria-hidden='true'> *</span>}{!required && ' (facultatif)'}</label>
      {hint && <p id={`${id}-hint`} className='fr-hint-text fr-mb-1w'>{hint}</p>}
      {options ? (
        <UsageInput id={id} name={path} value={value} options={options} selectableOptions={selectableUsageOptions} path={path} update={update} readOnly={readOnly} disabled={disabled} invalid={Boolean(error)} describedBy={inputProps['aria-describedby']} />
      ) : type === 'number' ? (
        <NumericInput {...inputProps} value={value} onChange={value => update(path, value)} />
      ) : type === 'textarea' ? (
        <textarea {...inputProps} className='fr-input' rows={3} value={value} maxLength={maxLength} onChange={event => update(path, event.target.value)} />
      ) : (
        <input {...inputProps} className='fr-input quick-declaration-control' type='text' value={value} maxLength={maxLength} onChange={event => update(path, event.target.value)} />
      )}
      {error && <p id={`${id}-error`} className='fr-error-text'>{error}</p>}
    </div>
  )
}

function PeriodFields({path, title, needs = false, season = false, fieldProps}) {
  const dates = season ? 'Du 1er juin au 31 octobre 2026' : 'Du 1er novembre 2025 au 31 mai 2026'
  const irrigationDetailsRequired = campaignRequiresIrrigationDetails(getCampaignField(fieldProps.answer, `${path}.usageId`), fieldProps.usageOptions)
  return (
    <fieldset className={`m-0 min-w-0 rounded border-t-4 p-3 md:p-4 ${season ? 'border-t-[var(--border-plain-yellow-tournesol)] bg-[var(--background-alt-yellow-tournesol)]' : 'border-t-[var(--border-plain-blue-cumulus)] bg-[var(--background-alt-blue-cumulus)]'}`}>
      <legend className={`float-left mb-0 w-full ${needs ? 'pb-4' : 'pb-1'} text-base font-semibold ${season ? 'text-[var(--text-label-yellow-tournesol)]' : 'text-[var(--text-label-blue-cumulus)]'}`}>{title}</legend>
      {!needs && <p className={`clear-both mb-4 text-xs ${season ? 'text-[var(--text-label-yellow-tournesol)]' : 'text-[var(--text-label-blue-cumulus)]'}`}>{dates}</p>}
      <div className='clear-both grid grid-cols-1 items-start gap-3 sm:grid-cols-2'>
        {needs ? <>
          <ResponseField {...fieldProps} path={`${path}.flow`} label='Débit demandé (m³/h)' />
          <ResponseField {...fieldProps} path={`${path}.volume`} label='Volume demandé (m³)' />
        </> : <>
          {!season && <ResponseField {...fieldProps} path={`${path}.indexStart`} label='Index au 01/11/2025' />}
          <ResponseField {...fieldProps} path={`${path}.indexEnd`} label={season ? 'Index au 31/10/2026' : 'Index au 31/05/2026'} />
        </>}
        <div className='sm:col-span-2'>
          <ResponseField {...fieldProps} path={`${path}.usageId`} label={season ? 'Usage étiage' : 'Usage hors étiage'} options={fieldProps.usageOptions} />
        </div>
        <ResponseField {...fieldProps} path={`${path}.surface`} label='Surface irriguée (ha)' required={irrigationDetailsRequired} />
        <div className='sm:col-span-2'><ResponseField {...fieldProps} path={`${path}.crops`} label='Cultures irriguées' type='crops' required={irrigationDetailsRequired} /></div>
      </div>
    </fieldset>
  )
}

export default function CampaignResponseForm({initialContext, admin = false, initialEditing = false}) {
  const [context, setContext] = useState(initialContext)
  const [initialAnswer] = useState(() => initialCampaignAnswer(initialContext.data, initialContext.meters))
  const [answer, setAnswer] = useState(initialAnswer)
  const [savedValue, setSavedValue] = useState(() => JSON.stringify(initialAnswer))
  const [fieldErrors, setErrors] = useState({})
  const [indexErrors, setIndexErrors] = useState({})
  const [validatedAnswer, setValidatedAnswer] = useState(initialAnswer)
  const [historicalMeterChanges, setHistoricalMeterChanges] = useState([])
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)
  const [saving, setSaving] = useState(false)
  const [editing, setEditing] = useState(Boolean(initialContext.permissions?.canEdit && initialEditing) || !initialContext.response.lastSubmittedAt || initialContext.response.hasDraft)
  const [ready, setReady] = useState(false)
  const formRef = useRef(null)
  const inFlight = useRef(false)
  const automaticMeterChanges = useRef(new Set(initialAnswer.meters.flatMap((meter, index) => meter.meterChanged && !initialContext.data?.meters?.[index]?.meterChanged ? [index] : [])))
  const {campaign, response, permissions = {}} = context
  const respondingOnBehalf = permissions.respondingOnBehalf === true
  const readOnly = !permissions.canEdit || !editing
  const dirty = !readOnly && JSON.stringify(answer) !== savedValue
  const exploitation = context.exploitation || response.exploitation || {}
  const rawPoint = context.context?.point || context.point || response.point || exploitation.pointPrelevement || exploitation.point
  const point = useMemo(() => ({...rawPoint, coordinates: Array.isArray(rawPoint?.coordinates) ? {type: 'Point', coordinates: rawPoint.coordinates} : rawPoint?.coordinates}), [rawPoint])
  const mapPoints = useMemo(() => [point], [point])
  const hasCoordinates = point.coordinates?.coordinates?.length === 2 && point.coordinates.coordinates.every(Number.isFinite)
  const preleveur = context.preleveur || response.preleveur || exploitation.declarant || {}
  const usageOptions = useMemo(() => campaignUsageOptions(context.waterUses).map(usage => ({...normalizeUsageOption(usage), parentUsage: getUsageParent(usage)})).sort(compareUsageOptions), [context.waterUses])
  const selectableUsageOptions = useMemo(() => campaignSelectableUsageOptions(usageOptions), [usageOptions])
  const base = admin ? '/administration/campagnes' : '/campagnes'
  const applicant = !admin && !respondingOnBehalf && !permissions.canManage && !permissions.canReadResults
  const errors = {...fieldErrors, ...indexErrors}
  const indexPath = path => /^meters\.\d+\.(?:offSeason|season)\.index(?:Start|End)$/.test(path)
  const validateIndices = data => validateCampaignIndices(data, {allowMeterChanges: true})
  const inconsistentMeters = new Set(Object.keys(validateCampaignIndices(validatedAnswer)).map(path => Number(path.split('.')[1])))
  function commitIndexChanges(data) {
    const nextAnswer = normalizeCampaignMeterChanges(data)
    const inconsistent = new Set(Object.keys(validateCampaignIndices(data)).map(path => Number(path.split('.')[1])))
    for (const [index, meter] of nextAnswer.meters.entries()) {
      if (!data.meters[index].meterChanged && meter.meterChanged) automaticMeterChanges.current.add(index)
      if (!inconsistent.has(index) && !historicalMeterChanges.includes(index) && automaticMeterChanges.current.has(index)) {
        meter.meterChanged = Boolean(meter.meterChangeReason.trim())
        automaticMeterChanges.current.delete(index)
      }
    }
    setAnswer(nextAnswer)
    setValidatedAnswer(nextAnswer)
    return nextAnswer
  }
  const fieldProps = {answer, errors, readOnly, disabled: saving || !ready, usageOptions, selectableUsageOptions, validateField: path => {
    if (indexPath(path)) setIndexErrors(validateIndices(commitIndexChanges(answer)))
  }, update: (path, value) => {
    const nextAnswer = setCampaignField(answer, path, value, {normalizeMeterChanges: false})
    const meterIndex = Number(path.split('.')[1])
    if (path.endsWith('.meterChanged')) automaticMeterChanges.current.delete(meterIndex)
    setAnswer(nextAnswer)
    if (indexPath(path)) setHistoricalMeterChanges(previous => previous.filter(index => index !== Number(path.split('.')[1])))
    setSuccess(null)
    setErrors(previous => {
      const next = {...previous}
      delete next[path]
      if (path.endsWith('.usageId')) {
        const validation = validateCampaignAnswer(nextAnswer, usageOptions)
        for (const field of ['surface', 'crops']) {
          const dependentPath = path.replace(/usageId$/, field)
          if (!next[dependentPath]) continue
          if (validation[dependentPath]) next[dependentPath] = validation[dependentPath]
          else delete next[dependentPath]
        }
      }
      return next
    })
    if ((path.endsWith('.meterChangeReason') || path.endsWith('.meterChanged')) && Object.keys(indexErrors).length) setIndexErrors(validateIndices(nextAnswer))
  }}

  useEffect(() => { setReady(true) }, [])

  useEffect(() => {
    if (!dirty) return
    const beforeUnload = event => { event.preventDefault(); event.returnValue = '' }
    const beforeLink = event => {
      const link = event.target.closest?.('a[href]')
      if (link && !event.defaultPrevented && !link.getAttribute('href').startsWith('#') && !window.confirm('Quitter sans enregistrer vos modifications ?')) event.preventDefault()
    }
    window.addEventListener('beforeunload', beforeUnload)
    document.addEventListener('click', beforeLink, true)
    return () => { window.removeEventListener('beforeunload', beforeUnload); document.removeEventListener('click', beforeLink, true) }
  }, [dirty])

  function acceptContext(next) {
    const nextAnswer = initialCampaignAnswer(next.data, next.meters)
    setContext(next)
    setAnswer(nextAnswer)
    setValidatedAnswer(nextAnswer)
    setSavedValue(JSON.stringify(nextAnswer))
  }
  function focusInvalidField() {
    requestAnimationFrame(() => {
      const invalid = formRef.current?.querySelector('[aria-invalid="true"]')
      invalid?.focus({preventScroll: true})
      invalid?.scrollIntoView({block: 'center', behavior: 'instant'})
    })
  }
  async function persist(submit) {
    if (readOnly || inFlight.current) return
    setError(null)
    setSuccess(null)
    const nextAnswer = commitIndexChanges(answer)
    const nextErrors = submit ? validateCampaignAnswer(nextAnswer, usageOptions) : validateIndices(nextAnswer)
    const nextIndexErrors = validateIndices(nextAnswer)
    setIndexErrors(nextIndexErrors)
    setErrors(Object.fromEntries(Object.entries(nextErrors).filter(([path]) => !Object.hasOwn(nextIndexErrors, path))))
    if (submit && Object.keys(nextErrors).length) {
      setError(respondingOnBehalf ? 'Vérifiez les champs signalés avant d’envoyer la réponse.' : 'Vérifiez les champs signalés avant d’envoyer votre réponse.')
      focusInvalidField()
      return
    }
    if (submit && permissions.canSubmit === false) {
      setError(context.blockers?.join(' ') || 'L’envoi de cette réponse est actuellement indisponible. Vous pouvez enregistrer un brouillon.')
      return
    }
    inFlight.current = true
    setSaving(true)
    try {
      const result = await saveCampaignResponseAction(campaign.id, response.id, {revision: response.revision, data: nextAnswer}, submit)
      if (!result.success) {
        const errors = result.data?.fields || result.data?.data?.fields || result.validationErrors || {}
        const changed = Object.keys(errors).filter(path => /^meters\.\d+\.meterChanged$/.test(path)).map(path => Number(path.split('.')[1]))
        if (changed.length) {
          for (const index of changed) automaticMeterChanges.current.add(index)
          setHistoricalMeterChanges(changed)
          setAnswer(previous => ({...previous, meters: previous.meters.map((meter, index) => changed.includes(index) ? {...meter, meterChanged: true} : meter)}))
        }
        setErrors(errors)
        focusInvalidField()
        throw new Error(campaignSaveError(result))
      }
      const refreshed = await getCampaignResponseAction(campaign.id, response.id)
      const next = refreshed.success ? refreshed.data?.data : result.data?.data
      if (next?.response) acceptContext(next)
      else throw new Error('La réponse a été enregistrée, mais son actualisation a échoué. Rechargez la page avant de poursuivre.')
      setEditing(!submit)
      setSuccess(submit ? respondingOnBehalf ? 'La réponse a bien été envoyée.' : 'Votre réponse a bien été envoyée.' : Object.keys(nextErrors).length ? 'Brouillon enregistré. Complétez le motif du changement de compteur ou corrigez les index avant l’envoi.' : 'Brouillon enregistré.')
    } catch (error) { setError(error.message) } finally { inFlight.current = false; setSaving(false) }
  }

  const pointDetails = (
    <section className='my-4 grid gap-4 border border-[var(--border-default-grey)] bg-[var(--background-default-grey)] p-4 text-[var(--text-default-grey)] md:grid-cols-2'>
      <div><h2 className='fr-h6 fr-mb-1w'>Préleveur</h2><p className='fr-mb-1v font-semibold'>{campaignPersonLabel(preleveur)}</p><p className='fr-text--sm fr-mb-0'>SIRET : {preleveur.siret || 'Non renseigné'}<br />{preleveur.email || preleveur.user?.email || 'Email non renseigné'}<br />{preleveur.phoneNumber || preleveur.phone || preleveur.telephone || 'Téléphone non renseigné'}</p></div>
      <div><h2 className='fr-h6 fr-mb-1w'>Point de prélèvement</h2><p className='fr-mb-1v'>{point.name}</p><p className='fr-text--sm fr-mb-1w'>{point.commune?.name || point.communeName || point.commune || 'Commune non renseignée'}</p>
        {point.locationDescription && <p className='fr-text--sm fr-mb-1w'>{point.locationDescription}</p>}
      </div>
      {hasCoordinates && <div className='h-64 md:col-span-2' role='region' aria-label='Localisation du point de prélèvement'><PointMap points={mapPoints} /></div>}
    </section>
  )
  const pointLabel = campaignExploitationLabel({point, countingCode: exploitation.countingCode || response.countingCode})

  return (
    <CampaignShell admin={admin} title={applicant ? CAMPAIGN_REQUESTER_TITLE : pointLabel} description={applicant ? CAMPAIGN_REQUESTER_DESCRIPTION : campaign.name} actions={<Link className='fr-btn fr-btn--sm fr-btn--tertiary' href={applicant ? '/tableau-de-bord' : `${base}/${campaign.id}`}>{applicant ? 'Mon activité' : 'Retour à la campagne'}</Link>}>
      {applicant && <h2 className='fr-h5'>{pointLabel}</h2>}
      {respondingOnBehalf && <p className='fr-text--sm'>{permissions.canEdit ? 'Vous répondez pour' : 'Vous consultez la réponse de'} <strong>{campaignPersonLabel(preleveur)}</strong>. Le brouillon enregistré est partagé avec ce préleveur.</p>}
      <div className='mb-4 flex flex-wrap items-center gap-3'><CampaignStatus response status={response.status} />
        {response.lastSubmittedAt && <span className='text-sm'>Premier envoi : {campaignDate(response.firstSubmittedAt)} · Dernier envoi : {campaignDate(response.lastSubmittedAt)}</span>}
        {permissions.canEdit && !editing && <button className='fr-btn fr-btn--sm fr-btn--secondary' type='button' onClick={() => setEditing(true)}>{respondingOnBehalf ? 'Modifier la réponse' : 'Modifier ma réponse'}</button>}
      </div>
      {(applicant || respondingOnBehalf) && !permissions.canEdit && ['CLOSED', 'ARCHIVED'].includes(campaignState(campaign)) && <p className='fr-text--sm'>Cette collecte est clôturée. {respondingOnBehalf ? 'La réponse reste consultable.' : 'Votre réponse reste consultable.'}</p>}
      {response.hasDraft && response.lastSubmittedAt && <p className='fr-text--sm'>Ces modifications ne sont pas encore envoyées.</p>}
      {response.lastSubmittedAt && <CampaignVolumes volumes={response.volumes} />}
      {response.declarationId && !admin && <p className='fr-text--sm'><Link href={`/mes-declarations/${response.declarationId}`}>Consulter la déclaration d’index générée</Link></p>}
      {!applicant && pointDetails}
      {context.prefill?.active && <p className='fr-hint-text fr-mb-2w'>Données préremplies à vérifier.</p>}
      {readOnly && error && <Alert className='mb-4' severity='error' title='Vérifiez votre réponse' description={error} />}
      {readOnly && success && <div className='mb-4' role='status'><Alert severity='success' title={success} small /></div>}
      <form id='campaign-response-form' ref={formRef} noValidate onSubmit={event => { event.preventDefault(); persist(true) }} className='grid gap-4'>
        {applicant && permissions.canEdit && <p className='fr-text--sm fr-mb-0'>L’OUGC peut aussi compléter cette réponse et consulter le brouillon enregistré.</p>}
        {!readOnly && <p className='fr-hint-text fr-mb-0'>Les champs marqués d’un astérisque (*) sont obligatoires.</p>}
        <section className='border border-[var(--border-default-grey)] bg-[var(--background-default-grey)] p-4 text-[var(--text-default-grey)] md:p-5'>
          <h2 className='fr-h4'>Bilan des prélèvements 2025–2026</h2>
          <div className='grid gap-5'>
            {answer.meters.map((meter, index) => (
              <div key={meter.compteurId || `new-${index}`} className='min-w-0 rounded border border-[var(--border-default-grey)]'>
                <div className='flex flex-wrap items-center gap-3 border-b border-[var(--border-default-grey)] bg-[var(--background-alt-grey)] px-3 py-3 md:px-4'>
                  <span className='fr-icon-dashboard-3-line flex h-9 w-9 shrink-0 items-center justify-center rounded bg-[var(--background-default-grey)] text-[var(--text-action-high-blue-france)]' aria-hidden='true' />
                  {meter.serialNumber && meter.compteurId && context.meters?.some(known => (known.compteurId || known.id) === meter.compteurId && known.serialNumber) ? <h3 className='fr-h6 fr-mb-0 min-w-0 flex-1 break-words'>Numéro de série du compteur : <span className='font-mono'>{meter.serialNumber}</span></h3> : <div className='min-w-0 max-w-sm flex-1'><ResponseField {...fieldProps} path={`meters.${index}.serialNumber`} label='Numéro de série du compteur' type='text' hint={!readOnly && !initialAnswer.meters[index]?.serialNumber ? 'Nous n’avons pas le numéro de série de votre compteur. Pouvez-vous le renseigner ici' : undefined} maxLength={100} /></div>}
                  <DynamicCheckbox id={`campaign-meter-changed-${index}`} className='fr-mb-0' options={[{
                    label: 'Je souhaite signaler un changement de compteur',
                    nativeInputProps: {
                      checked: meter.meterChanged,
                      disabled: readOnly || saving || !ready || inconsistentMeters.has(index) || historicalMeterChanges.includes(index),
                      onChange: event => fieldProps.update(`meters.${index}.meterChanged`, event.target.checked),
                      'aria-describedby': meter.meterChanged ? `campaign-meter-changed-${index}-hint` : undefined
                    }
                  }]} />
                  {!readOnly && !meter.compteurId && answer.meters.length > 1 && <button className='fr-btn fr-btn--sm fr-btn--tertiary' type='button' disabled={saving || !ready} onClick={() => { setAnswer(previous => ({...previous, meters: previous.meters.filter((_, meterIndex) => meterIndex !== index)})); setValidatedAnswer(previous => ({...previous, meters: previous.meters.filter((_, meterIndex) => meterIndex !== index)})); setSuccess(null); setErrors({}); setIndexErrors({}) }}>Retirer ce compteur</button>}
                </div>
                {meter.meterChanged && <div className='grid gap-3 px-3 pt-3 md:px-4'>
                  <p id={`campaign-meter-changed-${index}-hint`} className='fr-text--sm fr-mb-0'>{inconsistentMeters.has(index) || historicalMeterChanges.includes(index) ? 'Les index renseignés sont incohérents. Le changement de compteur est signalé automatiquement ; précisez le motif ou corrigez les index.' : 'Le signalement est enregistré avec votre réponse.'}</p>
                  <ResponseField {...fieldProps} path={`meters.${index}.meterChangeReason`} label='Motif du changement de compteur' type='textarea' hint='Indiquez la raison du changement et le numéro de série du nouveau compteur.' maxLength={2000} />
                </div>}
                <div className='grid gap-3 p-3 md:p-4 lg:grid-cols-2'>
                  <PeriodFields title='Hors étiage 2025–2026' path={`meters.${index}.offSeason`} fieldProps={fieldProps} />
                  <PeriodFields season title='Étiage 2026' path={`meters.${index}.season`} fieldProps={fieldProps} />
                </div>
              </div>
            ))}
          </div>
        </section>
        <section className='border border-[var(--border-default-grey)] bg-[var(--background-default-grey)] p-4 text-[var(--text-default-grey)] md:p-5'>
          <h2 className='fr-h4'>Besoins 2027–2028</h2>
          <div className='grid gap-5 lg:grid-cols-2'>
            <PeriodFields needs season title='Demande étiage du 1er juin au 31 octobre 2027' path='needs.season' fieldProps={fieldProps} />
            <PeriodFields needs title='Demande hors-étiage du 1er novembre 2027 au 31 mai 2028' path='needs.offSeason' fieldProps={fieldProps} />
          </div>
        </section>
        <section className='border border-[var(--border-default-grey)] bg-[var(--background-default-grey)] p-4 text-[var(--text-default-grey)] md:p-5'>
          <label className='fr-label' htmlFor='campaign-comment'>Commentaire (facultatif)</label>
          <textarea id='campaign-comment' className='fr-input' rows={3} readOnly={readOnly || saving || !ready} maxLength={20000} value={answer.comment} placeholder='Modifications : raison sociale, SIRET, localisation du point, changement de compteurs…' onChange={event => fieldProps.update('comment', event.target.value)} />
        </section>
      </form>
      {!readOnly && <div role='region' aria-label='Enregistrement de la réponse' className='sticky bottom-0 z-10 flex flex-wrap items-center gap-3 border border-[var(--border-default-grey)] bg-[var(--background-default-grey)] p-3 text-[var(--text-default-grey)] shadow-sm'>
        <button className='fr-btn fr-btn--secondary' type='button' disabled={saving || !ready} onClick={() => persist(false)}>Enregistrer le brouillon</button>
        <button className='fr-btn' type='submit' form='campaign-response-form' disabled={saving || !ready}>{saving ? 'Enregistrement…' : response.lastSubmittedAt ? 'Envoyer les modifications' : respondingOnBehalf ? 'Envoyer la réponse' : 'Envoyer ma réponse'}</button>
        {success && <p role='status' className='m-0 text-sm font-semibold text-[var(--text-default-success)]'>{success}</p>}
        {dirty && !saving && !success && <span className='text-sm text-[var(--text-mention-grey)]'>Modifications non enregistrées</span>}
        {error && <div className='w-full' role='alert'><p className='fr-error-text m-0'>{error}</p>
          {Object.keys(errors).length > 0 && <button className='fr-link fr-text--sm mt-1' type='button' onClick={focusInvalidField}>Voir les champs à corriger ({Object.keys(errors).length})</button>}
        </div>}
        {!permissions.canSubmit && context.blockers?.length > 0 && !error && <span className='text-sm text-[var(--text-mention-grey)]'>{context.blockers[0].replace(/\s*Vous pouvez enregistrer un brouillon\.?/g, '')}</span>}
      </div>}
      {applicant && pointDetails}
    </CampaignShell>
  )
}
