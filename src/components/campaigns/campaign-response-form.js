'use client'

import {useEffect, useMemo, useRef, useState} from 'react'

import {Alert} from '@codegouvfr/react-dsfr/Alert'
import dynamic from 'next/dynamic'
import Link from 'next/link'

import {CampaignShell, CampaignStatus, CampaignVolumes} from '@/components/campaigns/campaign-common.js'
import CampaignCropsSelect from '@/components/campaigns/campaign-crops-select.js'
import CampaignMeterReview from '@/components/campaigns/campaign-meter-review.js'
import UsageCombobox, {compareUsageOptions} from '@/components/form/usage-combobox.js'
import {formatCampaignNumberInput, normalizeCampaignNumberInput} from '@/lib/campaign-numbers.js'
import {campaignSaveError} from '@/lib/campaign-response-errors.js'
import {
  CAMPAIGN_REQUESTER_DESCRIPTION, CAMPAIGN_REQUESTER_TITLE,
  campaignDate, campaignExploitationLabel, campaignPersonLabel, campaignRequiresIrrigationDetails, campaignState,
  campaignUsageOptions, getCampaignField, initialCampaignAnswer,
  setCampaignField, validateCampaignAnswer, validateCampaignIndices
} from '@/lib/campaigns.js'
import {getUsageParent, normalizeUsageOption} from '@/lib/water-uses.js'
import {getCampaignResponseAction, saveCampaignResponseAction} from '@/server/actions/campaigns.js'

const PointMap = dynamic(() => import('@/components/declarations/quick-declaration-map.js'), {ssr: false, loading: () => <p role='status'>Chargement de la carte…</p>})

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

function UsageInput({value, options, update, path, readOnly, ...props}) {
  const [search, setSearch] = useState(null)
  const selected = options.find(option => option.value === value)
  return <UsageCombobox {...props} variant='campaign' options={options} selectedValue={value} readOnly={readOnly} required={!readOnly} value={selected?.label || (readOnly ? '' : search || '')} onUsageChange={changes => {
    setSearch(changes.usageSearch)
    update(path, changes.usageId)
  }} />
}

function ResponseField({path, label, answer, errors, update, validateField, readOnly, disabled, required = true, type = 'number', hint, options, maxLength = 3000}) {
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
        <UsageInput id={id} name={path} value={value} options={options} path={path} update={update} readOnly={readOnly} disabled={disabled} invalid={Boolean(error)} describedBy={inputProps['aria-describedby']} />
      ) : type === 'number' ? (
        <NumericInput {...inputProps} value={value} onChange={value => update(path, value)} />
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
    <fieldset className={`m-0 min-w-0 rounded border-t-4 p-3 md:p-4 ${season ? 'border-t-[#c3992a] bg-[#fff9e6]' : 'border-t-[#465f9d] bg-[#eef2fa]'}`}>
      <legend className={`float-left mb-0 w-full ${needs ? 'pb-4' : 'pb-1'} text-base font-semibold ${season ? 'text-[#715300]' : 'text-[#3558a2]'}`}>{title}</legend>
      {!needs && <p className={`clear-both mb-4 text-xs ${season ? 'text-[#715300]' : 'text-[#3558a2]'}`}>{dates}</p>}
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

function PublicationNotice({response}) {
  if (!response?.lastSubmittedAt || !response.publicationStatus || ['PUBLISHED', 'COMPLETED'].includes(response.publicationStatus)) return null
  const issues = response.publicationIssues || []
  return <Alert severity='info' title='Réponse enregistrée — volumes en attente de vérification' description={issues.map(issue => typeof issue === 'string' ? issue : issue.message).filter(Boolean).join(' ') || 'Le rattachement ou le partage des compteurs doit être vérifié avant de publier les volumes.'} className='mb-4' />
}

export default function CampaignResponseForm({initialContext, admin = false}) {
  const [context, setContext] = useState(initialContext)
  const [initialAnswer] = useState(() => initialCampaignAnswer(initialContext.data, initialContext.meters))
  const [answer, setAnswer] = useState(initialAnswer)
  const [savedValue, setSavedValue] = useState(() => JSON.stringify(initialAnswer))
  const [fieldErrors, setErrors] = useState({})
  const [indexErrors, setIndexErrors] = useState({})
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)
  const [saving, setSaving] = useState(false)
  const [editing, setEditing] = useState(!initialContext.response.lastSubmittedAt || initialContext.response.hasDraft)
  const [ready, setReady] = useState(false)
  const formRef = useRef(null)
  const inFlight = useRef(false)
  const {campaign, response, permissions = {}} = context
  const readOnly = !permissions.canEdit || !editing
  const dirty = !readOnly && JSON.stringify(answer) !== savedValue
  const exploitation = context.exploitation || response.exploitation || {}
  const rawPoint = context.context?.point || context.point || response.point || exploitation.pointPrelevement || exploitation.point
  const point = useMemo(() => ({...rawPoint, coordinates: Array.isArray(rawPoint?.coordinates) ? {type: 'Point', coordinates: rawPoint.coordinates} : rawPoint?.coordinates}), [rawPoint])
  const mapPoints = useMemo(() => [point], [point])
  const hasCoordinates = point.coordinates?.coordinates?.length === 2 && point.coordinates.coordinates.every(Number.isFinite)
  const preleveur = context.preleveur || response.preleveur || exploitation.declarant || {}
  const usageOptions = campaignUsageOptions(context.waterUses).map(usage => ({...normalizeUsageOption(usage), parentUsage: getUsageParent(usage)})).sort(compareUsageOptions)
  const base = admin ? '/administration/campagnes' : '/campagnes'
  const applicant = !admin && !permissions.canManage && !permissions.canReadResults
  const errors = {...fieldErrors, ...indexErrors}
  const indexPath = path => /^meters\.\d+\.(?:offSeason|season)\.index(?:Start|End)$/.test(path)
  const fieldProps = {answer, errors, readOnly, disabled: saving || !ready, usageOptions, validateField: path => {
    if (indexPath(path)) setIndexErrors(validateCampaignIndices(answer))
  }, update: (path, value) => {
    const nextAnswer = setCampaignField(answer, path, value)
    setAnswer(nextAnswer)
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
    if (indexPath(path) && Object.keys(indexErrors).length) setIndexErrors(validateCampaignIndices(nextAnswer))
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
    setSavedValue(JSON.stringify(nextAnswer))
  }
  async function refreshAfterApproval() {
    const result = await getCampaignResponseAction(campaign.id, response.id)
    if (result.success) acceptContext(result.data.data)
    else setError('La vérification a été enregistrée. Rechargez la page pour actualiser les volumes.')
  }
  function focusInvalidField() {
    requestAnimationFrame(() => {
      const invalid = formRef.current?.querySelector('[aria-invalid="true"]')
      invalid?.focus({preventScroll: true})
      invalid?.scrollIntoView({block: 'center', behavior: 'instant'})
    })
  }
  async function persist(submit) {
    if (inFlight.current) return
    setError(null)
    setSuccess(null)
    const nextErrors = submit ? validateCampaignAnswer(answer, usageOptions) : validateCampaignIndices(answer)
    const nextIndexErrors = validateCampaignIndices(answer)
    setIndexErrors(nextIndexErrors)
    setErrors(Object.fromEntries(Object.entries(nextErrors).filter(([path]) => !Object.hasOwn(nextIndexErrors, path))))
    if (submit && Object.keys(nextErrors).length) {
      setError('Vérifiez les champs signalés avant d’envoyer votre réponse.')
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
      const result = await saveCampaignResponseAction(campaign.id, response.id, {revision: response.revision, data: answer}, submit)
      if (!result.success) {
        setErrors(result.data?.fields || result.data?.data?.fields || result.validationErrors || {})
        focusInvalidField()
        throw new Error(campaignSaveError(result))
      }
      const refreshed = await getCampaignResponseAction(campaign.id, response.id)
      const next = refreshed.success ? refreshed.data?.data : result.data?.data
      if (next?.response) acceptContext(next)
      else throw new Error('La réponse a été enregistrée, mais son actualisation a échoué. Rechargez la page avant de poursuivre.')
      setEditing(!submit)
      setSuccess(submit ? 'Votre réponse a bien été envoyée.' : Object.keys(nextErrors).length ? 'Brouillon enregistré. Les index signalés restent à corriger avant l’envoi.' : 'Brouillon enregistré.')
    } catch (error) { setError(error.message) } finally { inFlight.current = false; setSaving(false) }
  }

  const pointDetails = (
    <section className='my-4 grid gap-4 border bg-white p-4 md:grid-cols-2'>
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
      <div className='mb-4 flex flex-wrap items-center gap-3'><CampaignStatus response status={response.status} />
        {response.lastSubmittedAt && <span className='text-sm'>Premier envoi : {campaignDate(response.firstSubmittedAt)} · Dernier envoi : {campaignDate(response.lastSubmittedAt)}</span>}
        {permissions.canEdit && !editing && <button className='fr-btn fr-btn--sm fr-btn--secondary' type='button' onClick={() => setEditing(true)}>Modifier ma réponse</button>}
      </div>
      {applicant && !permissions.canEdit && ['CLOSED', 'ARCHIVED'].includes(campaignState(campaign)) && <p className='fr-text--sm'>Cette collecte est clôturée. Votre réponse reste consultable.</p>}
      {response.hasDraft && response.lastSubmittedAt && <p className='fr-text--sm'>Ces modifications ne sont pas encore envoyées. Le collecteur voit votre dernière réponse envoyée.</p>}
      <PublicationNotice response={response} />
      {response.lastSubmittedAt && <CampaignVolumes volumes={response.volumes} />}
      {response.declarationId && !admin && <p className='fr-text--sm'><Link href={`/mes-declarations/${response.declarationId}`}>Consulter la déclaration d’index générée</Link></p>}
      {!applicant && pointDetails}
      {context.prefill?.active && <p className='fr-hint-text fr-mb-2w'>Données préremplies à vérifier.</p>}
      {readOnly && error && <Alert className='mb-4' severity='error' title='Vérifiez votre réponse' description={error} />}
      {readOnly && success && <div className='mb-4' role='status'><Alert severity='success' title={success} small /></div>}
      <form ref={formRef} noValidate onSubmit={event => { event.preventDefault(); persist(true) }} className='grid gap-4'>
        {!readOnly && <p className='fr-hint-text fr-mb-0'>Les champs marqués d’un astérisque (*) sont obligatoires.</p>}
        <section className='border bg-white p-4 md:p-5'>
          <h2 className='fr-h4'>Bilan des prélèvements 2025–2026</h2>
          <div className='grid gap-5'>
            {answer.meters.map((meter, index) => (
              <div key={meter.compteurId || `new-${index}`} className='min-w-0 rounded border border-gray-200'>
                <div className='flex flex-wrap items-center gap-3 border-b border-gray-200 bg-gray-50 px-3 py-3 md:px-4'>
                  <span className='fr-icon-dashboard-3-line flex h-9 w-9 shrink-0 items-center justify-center rounded bg-white text-[#000091]' aria-hidden='true' />
                  {meter.compteurId && context.meters?.some(known => (known.compteurId || known.id) === meter.compteurId && known.serialNumber) ? <h3 className='fr-h6 fr-mb-0 min-w-0 flex-1 break-words'>Numéro de série de compteur : <span className='font-mono'>{meter.serialNumber}</span></h3> : <div className='min-w-0 max-w-sm flex-1'><ResponseField {...fieldProps} path={`meters.${index}.serialNumber`} label='Numéro de série de compteur' type='text' required={false} hint={!readOnly && !initialAnswer.meters[index]?.serialNumber ? 'Nous n’avons pas le numéro de série de votre compteur. Pouvez-vous le renseigner ici' : undefined} maxLength={100} /></div>}
                  {!readOnly && !meter.compteurId && answer.meters.length > 1 && <button className='fr-btn fr-btn--sm fr-btn--tertiary' type='button' disabled={saving || !ready} onClick={() => { setAnswer(previous => ({...previous, meters: previous.meters.filter((_, meterIndex) => meterIndex !== index)})); setSuccess(null); setErrors({}); setIndexErrors({}) }}>Retirer ce compteur</button>}
                </div>
                <div className='grid gap-3 p-3 md:p-4 lg:grid-cols-2'>
                  <PeriodFields title='Hors étiage 2025–2026' path={`meters.${index}.offSeason`} fieldProps={fieldProps} />
                  <PeriodFields season title='Étiage 2026' path={`meters.${index}.season`} fieldProps={fieldProps} />
                </div>
                {admin && response.lastSubmittedAt && meter.compteurId && <div className='px-3 pb-3 md:px-4'><CampaignMeterReview campaignId={campaign.id} compteurId={meter.compteurId} serialNumber={meter.serialNumber} onApproved={refreshAfterApproval} /></div>}
              </div>
            ))}
          </div>
          {!readOnly && <p className='fr-hint-text fr-mt-2w fr-mb-0'>Un compteur a été remplacé ? Indiquez-le dans le commentaire.</p>}
        </section>
        <section className='border bg-white p-4 md:p-5'>
          <h2 className='fr-h4'>Besoins 2027–2028</h2>
          <div className='grid gap-5 lg:grid-cols-2'>
            <PeriodFields needs season title='Demande étiage du 1er juin au 31 octobre 2027' path='needs.season' fieldProps={fieldProps} />
            <PeriodFields needs title='Demande hors-étiage du 1er novembre 2027 au 31 mai 2028' path='needs.offSeason' fieldProps={fieldProps} />
          </div>
        </section>
        <section className='border bg-white p-4 md:p-5'>
          <label className='fr-label' htmlFor='campaign-comment'>Commentaire (facultatif)</label>
          <textarea id='campaign-comment' className='fr-input' rows={3} readOnly={readOnly || saving || !ready} maxLength={20000} value={answer.comment} placeholder='Modifications : raison sociale, SIRET, localisation du point, changement de compteurs…' onChange={event => fieldProps.update('comment', event.target.value)} />
        </section>
        {!readOnly && <div role='region' aria-label='Enregistrement de la réponse' className='sticky bottom-0 z-10 flex flex-wrap items-center gap-3 border bg-white p-3 shadow-sm'>
          <button className='fr-btn fr-btn--secondary' type='button' disabled={saving || !ready} onClick={() => persist(false)}>Enregistrer le brouillon</button>
          <button className='fr-btn' type='submit' disabled={saving || !ready}>{saving ? 'Enregistrement…' : response.lastSubmittedAt ? 'Envoyer les modifications' : 'Envoyer ma réponse'}</button>
          {success && <p role='status' className='m-0 text-sm font-semibold text-[#18753c]'>{success}</p>}
          {dirty && !saving && !success && <span className='text-sm text-gray-600'>Modifications non enregistrées</span>}
          {error && <div className='w-full' role='alert'><p className='fr-error-text m-0'>{error}</p>
            {Object.keys(errors).length > 0 && <button className='fr-link fr-text--sm mt-1' type='button' onClick={focusInvalidField}>Voir les champs à corriger ({Object.keys(errors).length})</button>}
          </div>}
          {!permissions.canSubmit && context.blockers?.length > 0 && !error && <span className='text-sm text-gray-600'>{context.blockers[0].replace(/\s*Vous pouvez enregistrer un brouillon\.?/g, '')}</span>}
        </div>}
      </form>
      {applicant && pointDetails}
    </CampaignShell>
  )
}
