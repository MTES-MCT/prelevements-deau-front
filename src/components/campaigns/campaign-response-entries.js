'use client'

import {useCallback, useId, useState} from 'react'

import CampaignMeterEvents from '@/components/campaigns/campaign-meter-events.js'
import {CampaignField} from '@/components/campaigns/campaign-ui.js'
import {campaignIndexEntryFilled, campaignTargetIndexEntries, campaignTargetMeterEvents} from '@/lib/campaign-response-readings.js'
import {
  campaignDate, campaignEditableTargets, campaignInclusiveEnd, campaignMeterName,
  campaignPointName, campaignReferenceReading, campaignUpdateReading,
  decimalInput, needKey, readingKey, replaceCampaignRow
} from '@/lib/collection-campaigns.js'
import {getUsageColor, getUsageTextColor} from '@/lib/water-uses.js'

// Même densité et mêmes champs que la saisie rapide ; les dates de campagne
// restent toutes visibles et les usages ne sont pas modifiables ici.
const columns = 'md:grid-cols-[minmax(160px,1fr)_minmax(260px,1.5fr)_minmax(120px,0.7fr)]'
const indexColumns = 'grid grid-cols-[minmax(0,1fr)_minmax(5.5rem,7rem)] gap-3'
const rowClassName = filled => `grid grid-cols-1 gap-3 border-b border-r border-l-4 border-b-gray-200 border-r-gray-200 px-2 py-2 md:items-start data-[active=true]:border-l-blue-600 data-[active=true]:bg-blue-50 ${columns} ${filled ? 'border-l-green-600 bg-green-50' : 'border-l-transparent bg-white focus-within:border-l-blue-500 focus-within:bg-blue-50 hover:bg-gray-50'}`
const isFilled = value => value !== undefined && value !== null && value !== ''

const PointSummary = ({target}) => {
  const name = campaignPointName(target)
  const technicalName = target.pointPrelevement?.name
  return (
    <div className='min-w-0 md:pt-1'>
      <h3 className='fr-mb-0 break-words text-sm font-semibold leading-tight'>{name}</h3>
      {technicalName && technicalName !== name && <p className='fr-mb-0 mt-1 break-words text-xs text-gray-500'>Nom technique : {technicalName}</p>}
      {target.preleveur?.label && <p className='fr-mb-0 mt-1 break-words text-xs text-gray-600'>{target.preleveur.label}</p>}
    </div>
  )
}

const PointUsage = ({target}) => (
  <div className='min-w-0 md:self-center'>
    <span className='sr-only'>Usage : </span>
    <span className='inline-flex max-w-full rounded px-2 py-1 text-xs font-medium leading-tight' style={{backgroundColor: getUsageColor(target.usage), color: getUsageTextColor(target.usage)}}>{target.usage?.name || target.usage?.label || 'Usage non renseigné'}</span>
  </div>
)

const ValueHeader = ({kind, mobile = false}) => (
  <div className={`${indexColumns}${mobile ? ' mb-2 text-xs font-bold text-gray-600 md:hidden' : ''}`} aria-hidden={mobile ? 'true' : undefined}>
    <div>{kind === 'INDEX' ? 'Date de relevé' : 'Période'}</div>
    <div className='text-right'>{kind === 'INDEX' ? 'Index (m³)' : 'Besoin en eau (m³)'}</div>
  </div>
)

const EntryHeader = ({kind}) => (
  <div className={`hidden gap-3 border-y border-l-4 border-r border-y-gray-200 border-x-transparent bg-white px-2 py-2 text-xs font-bold text-gray-600 md:grid ${columns}`} aria-hidden='true'>
    <div>Point</div>
    <ValueHeader kind={kind} />
    <div>Usage</div>
  </div>
)

const NumberField = ({label, target, disabled, value, onChange}) => {
  const id = useId()
  return (
    <div className='fr-input-group fr-mb-0 min-w-0'>
      <label className='sr-only' htmlFor={id}>{label} · {campaignPointName(target)}</label>
      <div className='quick-declaration-field'>
        <input id={id} className='fr-input quick-declaration-control text-right text-xs font-semibold tabular-nums' type='text' inputMode='decimal' disabled={disabled} value={value ?? ''} onChange={event => onChange(event.target.value)} />
      </div>
    </div>
  )
}

export const HistoricalReading = ({candidates, meter, value, disabled, onChange}) => {
  const [candidateId, setCandidateId] = useState('')
  if (candidates.length === 0) {
    return null
  }

  const selected = candidates.find(item => item.sourceChunkValueId === candidateId)
  return (
    <details className='mt-2 rounded border border-gray-200 bg-white p-2 text-xs'>
      <summary className='cursor-pointer'>Relevés existants à cette date ({candidates.length}){value.sourceChunkValueId ? ' · relevé repris' : ''}</summary>
      <div className='mt-2'>
        <CampaignField compact label='Choisir un relevé' disabled={disabled} value={candidateId} options={[{value: '', label: 'Choisir un relevé'}, ...candidates.map(candidate => ({value: candidate.sourceChunkValueId, label: `${candidate.value} m³ · ${candidate.sourceType === 'CAMPAIGN' ? 'Campagne précédente' : 'Déclaration'}${candidate.declarationCode ? ` ${candidate.declarationCode}` : ''}`}))]} onChange={setCandidateId} />
        {selected?.requiresMeterConfirmation && meter.compteurId && <p className='text-xs'>En reprenant ce relevé, vous confirmez qu’il concerne « {campaignMeterName(meter)} ».</p>}
        <button type='button' className='fr-btn fr-btn--secondary fr-btn--sm' disabled={disabled || !selected} onClick={() => {
          if (!disabled && selected) {
            onChange(campaignReferenceReading(selected, meter.compteurId))
            setCandidateId('')
          }
        }}
        >Reprendre ce relevé</button>
      </div>
    </details>
  )
}

const IndexEntry = ({target, date, meter, value, candidates, disabled, onChange}) => {
  const identity = {targetId: target.id, compteurId: meter.compteurId, readingDate: date}
  return (
    <fieldset className='min-w-0 border-b border-gray-200 py-2 first:pt-0 last:border-b-0 last:pb-0' disabled={disabled}>
      <legend className='sr-only'>Index au {campaignDate(date)} (m³){meter.compteurId && ` · ${campaignMeterName(meter)}`}</legend>
      <div className={`${indexColumns} items-start`}>
        <div className='min-w-0 pt-2 text-xs leading-tight'>
          <time dateTime={date} className='font-medium'>{campaignDate(date)}</time>
          {meter.compteurId && <span className='mt-1 block break-words text-gray-600'>{campaignMeterName(meter)}</span>}
          {value.sourceChunkValueId && <span className='mt-1 block text-gray-600'>Déjà déclaré</span>}
        </div>
        <NumberField label={`Index au ${campaignDate(date)} (m³)${meter.compteurId ? ` · ${campaignMeterName(meter)}` : ''}`} target={target} disabled={disabled || Boolean(value.sourceChunkValueId)} value={value.value} onChange={input => onChange({...value, value: input === '' ? null : decimalInput(input), missingReason: undefined})} />
      </div>
      {value.sourceChunkValueId && !disabled && (
        <button type='button' className='fr-btn fr-btn--tertiary-no-outline fr-btn--sm mt-1' onClick={() => {
          const {sourceChunkValueId, ...reading} = value
          onChange({...reading, correctionOfChunkValueId: sourceChunkValueId, correctionReason: ''})
        }}
        >Corriger ce relevé</button>
      )}
      {value.correctionOfChunkValueId && <div className='mt-2'><CampaignField compact label='Motif de la correction' value={value.correctionReason || ''} onChange={correctionReason => onChange({...value, correctionReason})} /></div>}
      {(value.value === null || value.value === '') && <details open={value.missingReason ? true : undefined} className='mt-1 text-xs'>
        <summary className='cursor-pointer'>Je n’ai pas ce relevé</summary>
        <div className='mt-2'><CampaignField compact label='Motif d’indisponibilité' value={value.missingReason || ''} onChange={missingReason => onChange({...identity, value: null, missingReason})} /></div>
      </details>}
      <HistoricalReading candidates={candidates} meter={meter} value={value} disabled={disabled} onChange={onChange} />
    </fieldset>
  )
}

const EventReadingEntry = ({date, meter, eventReadings, awaitingMeter}) => (
  <div className='min-w-0 border-b border-gray-200 py-2 first:pt-0 last:border-b-0 last:pb-0'>
    <div className={`${indexColumns} items-start text-xs`}>
      <div className='min-w-0'>
        <time dateTime={date} className='font-medium'>{campaignDate(date)}</time>
        <span className='mt-1 block break-words text-gray-600'>{campaignMeterName(meter)}</span>
        {eventReadings && <span className='mt-2 inline-block rounded bg-[#e6f4ea] px-2 py-1 font-medium text-[#18753c]'>Renseigné dans le changement</span>}
      </div>
      {eventReadings ? <dl className='!m-0 grid min-w-0 gap-2 text-right'>{eventReadings.map(reading => (
        <div key={reading.side} className='min-w-0 break-words'>
          <dt className='text-gray-600'>{reading.side === 'previous' ? 'Avant le changement' : 'Après le changement'}</dt>
          <dd className='!ml-0 font-semibold tabular-nums'>{reading.value === null ? 'Index inconnu' : `${reading.value} m³`}</dd>
          {reading.value === null && reading.missingReason && <dd className='!ml-0 text-gray-600'>{reading.missingReason}</dd>}
        </div>
      ))}</dl> : awaitingMeter && <p className='fr-mb-0 col-span-2 text-xs text-gray-600'>Le relevé du nouveau compteur sera disponible après l’enregistrement du changement.</p>}
    </div>
  </div>
)

const PointMeterEvents = ({target, onPendingMeterEventChange, onEditorChange, ...props}) => {
  const onPendingChange = useCallback(pending => onPendingMeterEventChange?.(target.id, pending), [onPendingMeterEventChange, target.id])
  const onRecoveryChange = useCallback(value => onEditorChange?.(target.id, value), [onEditorChange, target.id])
  return <CampaignMeterEvents {...props} target={target} onPendingChange={onPendingChange} onRecoveryChange={onRecoveryChange} />
}

export const RecoveredMeterEditors = ({context, editors}) => Object.entries(editors).map(([targetId, {event}]) => {
  const target = context.targets.find(target => target.id === targetId)
  if (!target) {
    return null
  }

  const index = value => value === null ? 'Index inconnu' : (value === '' || value === undefined ? 'Non renseigné' : `${value} m³`)
  return (
    <details key={targetId} className='mb-3 border border-gray-200 p-3 text-sm'>
      <summary>Changement de compteur retrouvé · {target.pointPrelevement?.name || 'Point de prélèvement'}</summary>
      <p className='mb-2 mt-2 text-xs text-gray-600'>Saisie locale en lecture seule, non réappliquée à la réponse modifiée.</p>
      <dl className='!m-0 grid gap-1 text-xs'>
        <div><dt>Changement</dt><dd className='!ml-0'>{event.type === 'RESET' ? 'Remise à zéro' : 'Remplacement'}{event.at ? ` · ${campaignDate(event.at)}` : ''}</dd></div>
        <div><dt>Index avant / après</dt><dd className='!ml-0'>{index(event.previousIndex)} / {index(event.nextIndex)}</dd></div>
        {(event.serialNumber || event.identifier) && <div><dt>Nouveau compteur</dt><dd className='!ml-0'>{[event.serialNumber, event.identifier].filter(Boolean).join(' · ')}</dd></div>}
        {event.reason && <div><dt>Précisions</dt><dd className='!ml-0 whitespace-pre-wrap'>{event.reason}</dd></div>}
      </dl>
    </details>
  )
})

export const IndexRows = ({context, draft, disabled, issues, ignoredReadings = [], recoveredEditors = {}, onEditorChange, onChange, pointProps, onPendingMeterEventChange, onSaveMeterEvent}) => {
  const editable = new Set(campaignEditableTargets(context, 'INDEX'))
  const readings = new Map((draft.readings || []).map(reading => [readingKey(reading), reading]))
  const eventsByTarget = campaignTargetMeterEvents(draft.meterEvents)
  const candidates = new Map()
  for (const candidate of context.existingReadings || []) {
    const key = `${candidate.targetId}:${candidate.readingDate.slice(0, 10)}`
    if (!candidates.has(key)) {
      candidates.set(key, [])
    }

    candidates.get(key).push(candidate)
  }

  return (
    <section className='mb-4 min-w-0' aria-label='Saisie des relevés par point'>
      <EntryHeader kind='INDEX' />
      {context.targets.map(target => {
        const targetDisabled = disabled || !editable.has(target.id)
        const entries = campaignTargetIndexEntries({
          target, indexDates: context.campaign.indexDates, readings, events: eventsByTarget.get(target.id)
        })
        const expected = entries.filter(entry => !entry.unavailable)
        const filled = expected.filter(entry => campaignIndexEntryFilled(entry)).length
        const ignored = ignoredReadings.filter(reading => reading.targetId === target.id)
        return (
          <div key={target.id} {...pointProps?.(target.id)} className={rowClassName(expected.length > 0 && filled === expected.length)}>
            <PointSummary target={target} />
            <div className='min-w-0'>
              <ValueHeader mobile kind='INDEX' />
              {entries.map(entry => entry.unavailable ? <p key={entry.entryKey} className='fr-mb-0 py-2 text-xs'>Aucun compteur en service au {campaignDate(entry.date)}.</p> : (entry.eventReadings || entry.awaitingMeter ? <EventReadingEntry key={entry.entryKey} {...entry} /> : <IndexEntry
                key={entry.entryKey}
                {...entry}
                target={target}
                candidates={(candidates.get(`${target.id}:${entry.date}`) || []).filter(candidate => !candidate.compteurId || candidate.compteurId === entry.meter.compteurId)}
                disabled={targetDisabled}
                onChange={reading => {
                  if (!targetDisabled) {
                    onChange(campaignUpdateReading(draft, reading))
                  }
                }}
              />))}
            </div>
            <PointUsage target={target} />
            <div className='min-w-0 md:col-span-3'>
              {ignored.length > 0 && <details className='mb-3 text-xs text-gray-600'>
                <summary>{ignored.length} relevé{ignored.length > 1 ? 's' : ''} hors période du compteur</summary>
                <p className='mb-1 mt-2'>Ces valeurs restent dans le brouillon, mais ne sont ni utilisées dans les volumes ni transmises. Elles réapparaîtront si vous corrigez ou supprimez le changement concerné.</p>
                <ul>{ignored.map(reading => <li key={readingKey(reading)}>{campaignDate(reading.readingDate)} : {reading.value ?? 'Index inconnu'}{reading.value === null ? '' : ' m³'}</li>)}</ul>
              </details>}
              <PointMeterEvents context={context} target={target} draft={draft} disabled={targetDisabled} issues={issues} recoveredEditor={recoveredEditors[target.id]} onEditorChange={onEditorChange} onChange={onChange} onSaveMeterEvent={onSaveMeterEvent} onPendingMeterEventChange={onPendingMeterEventChange} />
            </div>
          </div>
        )
      })}
    </section>
  )
}

export const NeedsRows = ({context, draft, disabled, onChange, pointProps}) => {
  const periods = context.campaign.periods.filter(period => period.kind === 'NEEDS')
  const editable = new Set(campaignEditableTargets(context, 'NEEDS'))
  const needs = new Map((draft.needs || []).map(need => [needKey(need), need]))
  return (
    <section className='mb-4 min-w-0' aria-label='Saisie des besoins par point'>
      <EntryHeader kind='NEEDS' />
      {context.targets.map(target => {
        const targetDisabled = disabled || !editable.has(target.id)
        const entries = periods.map(period => {
          const identity = {targetId: target.id, periodId: period.id}
          return {period, value: needs.get(needKey(identity)) || {...identity, requestedVolume: ''}}
        })
        const filled = entries.filter(entry => isFilled(entry.value.requestedVolume)).length
        return (
          <div key={target.id} {...pointProps?.(target.id)} className={rowClassName(entries.length > 0 && filled === entries.length)}>
            <PointSummary target={target} />
            <div className='min-w-0'>
              <ValueHeader mobile kind='NEEDS' />
              {entries.map(({period, value}) => (
                <fieldset key={period.id} disabled={targetDisabled} className='min-w-0 border-b border-gray-200 py-2 first:pt-0 last:border-b-0 last:pb-0'>
                  <legend className='sr-only'>{period.label}</legend>
                  <div className={`${indexColumns} items-start`}>
                    <div className='min-w-0 pt-1 text-xs leading-tight'>
                      <span className='block font-medium'>{period.label}</span>
                      <span className='mt-1 block text-gray-600'>Du {campaignDate(period.startDate)} au {campaignDate(campaignInclusiveEnd(period.endDate))}</span>
                    </div>
                    <NumberField label={`Besoin en eau (m³) · ${period.label}`} target={target} disabled={targetDisabled} value={value.requestedVolume} onChange={input => {
                      if (!targetDisabled) {
                        onChange({...draft, needs: replaceCampaignRow(draft.needs || [], {...value, requestedVolume: decimalInput(input)}, needKey)})
                      }
                    }} />
                  </div>
                </fieldset>
              ))}
            </div>
            <PointUsage target={target} />
          </div>
        )
      })}
    </section>
  )
}
