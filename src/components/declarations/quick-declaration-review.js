'use client'

import {useEffect, useId, useMemo, useRef, useState} from 'react'

import {Alert} from '@codegouvfr/react-dsfr/Alert'
import {Button} from '@codegouvfr/react-dsfr/Button'
import {createModal} from '@codegouvfr/react-dsfr/Modal'

import {
  describeQuickMeasure, describeQuickReviewDates, describeQuickVolumes, formatReviewPeriod, formatReviewVolume, groupQuickReview
} from '@/lib/quick-declaration-review.js'
import {getMyDeclarationURL} from '@/lib/urls.js'
import {
  createQuickDeclarationAction, previewQuickDeclarationAction, updateQuickDeclarationAction
} from '@/server/actions/declarations.js'

import QuickDeclarationContact from './quick-declaration-contact.js'

const previewDelay = 300

export {formatQuickDate} from '@/lib/quick-declaration-review.js'

function changeTextClass(before, after) {
  if (before == null) return 'text-[var(--text-default-success)]'
  if (after == null) return 'text-[var(--text-default-error)]'
  return undefined
}

function getDeltaLabel(before, after) {
  if (before == null) return 'Ajout'
  if (after == null) return 'Suppression'
  const delta = after - before
  return `${delta > 0 ? '+' : ''}${formatReviewVolume(delta)}`
}

function VolumeCell({value, kind, breakdown, showOrigin}) {
  const origin = kind === 'DECLARED' ? 'Déclaré' : 'Calculé'
  return (
    <td>
      <span data-volume>{formatReviewVolume(value)}</span>
      {breakdown ? (
        <small className='block'>Déclaré · {formatReviewVolume(breakdown.declared)}<br />Calculé · {formatReviewVolume(breakdown.computed)}</small>
      ) : showOrigin && kind && <small className='block'>{origin}</small>}
    </td>
  )
}

function PeriodDetails({changes, label}) {
  if (!changes.length) return null
  return (
    <details className='fr-mt-1v'>
      <summary className='w-fit cursor-pointer text-[var(--text-action-high-blue-france)] underline underline-offset-4'>Détail des périodes</summary>
      <div className='fr-table fr-table--sm fr-my-1w overflow-x-auto'>
        <table>
          <caption className='fr-sr-only'>Volumes concernés pour {label}</caption>
          <thead><tr>{['Période', 'Avant', 'Après', 'Écart'].map(title => <th key={title} scope='col'>{title}</th>)}</tr></thead>
          <tbody>
            {changes.map(change => (
              <tr key={[change.periodStartDate, change.periodEndDate, change.before, change.after].join(':')}>
                <td>{formatReviewPeriod(change.periodStartDate, change.periodEndDate)}</td>
                <VolumeCell value={change.before} kind={change.beforeKind} breakdown={change.beforeBreakdown} showOrigin={change.afterKind && change.beforeKind !== change.afterKind} />
                <VolumeCell value={change.after} kind={change.afterKind} breakdown={change.afterBreakdown} showOrigin={change.beforeKind && change.beforeKind !== change.afterKind} />
                <td><span className={changeTextClass(change.before, change.after)}>{getDeltaLabel(change.before, change.after)}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  )
}

function warningKey(warning) {
  return [warning.entryId, warning.declarationId ?? warning.declarationCode, warning.code, warning.readingDate, warning.periodStartDate, warning.periodEndDate, warning.value, warning.message].join(':')
}

function WarningMessage({warning, showMessage = true}) {
  return (
    <>
      {showMessage && warning.message}
      {warning.code === 'VOLUME_OVERLAP' && warning.value != null && (
        <> Volume existant de {formatReviewVolume(warning.value)} ({formatReviewPeriod(warning.periodStartDate, warning.periodEndDate)}).</>
      )}
      {warning.declarationId ? (
        <> <a className='fr-link' href={getMyDeclarationURL({id: warning.declarationId})} target='_blank' rel='noopener noreferrer'>
          {warning.declarationCode ? `Déclaration n°${warning.declarationCode}` : 'Déclaration source'} (nouvel onglet)
        </a></>
      ) : warning.declarationCode && <> Déclaration n°{warning.declarationCode}.</>}
    </>
  )
}

function PreviewWarningList({warnings}) {
  const items = []
  const overlaps = new Map()
  for (const warning of warnings) {
    if (warning.code !== 'VOLUME_OVERLAP' || warning.value == null) {
      items.push([warning])
      continue
    }

    const key = [warning.entryId, warning.message].join('/')
    if (!overlaps.has(key)) {
      const volumes = []
      overlaps.set(key, volumes)
      items.push(volumes)
    }

    overlaps.get(key).push(warning)
  }

  return <ul className='!my-1'>
    {items.map(([first, ...others]) => (
      <li key={warningKey(first)}>
        {others.length ? (
          <>
            La nouvelle période remplace en entier les {others.length + 1} volumes déclarés suivants.
            <ul>{[first, ...others].map(warning => (
              <li key={warningKey(warning)}><WarningMessage warning={warning} showMessage={false} /></li>
            ))}</ul>
          </>
        ) : <WarningMessage warning={first} />}
      </li>
    ))}
  </ul>
}

function IndexWarningContacts({group, payload, declarationId}) {
  const byReading = new Map()
  for (const warning of group.warnings) {
    if (warning.code !== 'INDEX_BELOW_PREVIOUS' && warning.code !== 'INDEX_ABOVE_NEXT') continue
    const key = [warning.entryId, warning.readingDate, warning.value].join('/')
    if (!byReading.has(key)) byReading.set(key, [])
    byReading.get(key).push(warning)
  }

  return [...byReading].map(([key, warnings]) => {
    const [warning] = warnings
    const measure = group.measures.find(row => row.after?.type === 'INDEX'
      && row.after.readingDate === warning.readingDate && Number(row.after.value) === Number(warning.value))
    return <QuickDeclarationContact key={key} declarationId={declarationId} payload={payload} measure={measure} warnings={warnings} />
  })
}

function PreviewWarnings({groups, payload, declarationId, originalDates}) {
  const affected = groups.filter(group => group.warnings.length > 0)
  if (!affected.length) return null
  return (
    <Alert
      className='fr-my-2w'
      severity='warning'
      title='Saisie à vérifier'
      description={(
        <>
          {affected.map(group => (
            <section key={group.key} aria-label={group.label} className='fr-mb-2w'>
              <strong>{group.label.replace(' — ', ' · ')}</strong>
              {group.measures.filter(row => row.before == null || row.after == null).map(row => {
                const {action, detail} = describeQuickMeasure(row, [], originalDates)
                return <p key={row.id || group.key} className='!mb-0'><strong className={changeTextClass(row.before, row.after)}>{action}</strong> · {detail}</p>
              })}
              <PreviewWarningList warnings={group.warnings} />
              <IndexWarningContacts group={group} payload={payload} declarationId={declarationId} />
            </section>
          ))}
          Vous pouvez confirmer cette saisie.
        </>
      )}
    />
  )
}

function ReviewPoints({groups, originalDates}) {
  return groups.map(group => {
    const impact = describeQuickVolumes(group)
    const [name, code] = group.label.split(' — Code comptage : ')
    return (
      <section key={group.key} aria-label={group.label} className='border-t border-[var(--border-default-grey)] py-3'>
        <h3 className='fr-h6 !mb-1'>
          {name}{code && <small className='fr-text--sm !mb-0 ml-2 inline-block font-normal text-[var(--text-mention-grey)]'>Code comptage {code}</small>}
        </h3>
        {group.measures.map(row => {
          const {action, detail} = describeQuickMeasure(row, group.measures.length === 1 ? group.warnings : [], originalDates)
          return <p key={row.id || group.key} className='!mb-1'><strong className={changeTextClass(row.before, row.after)}>{action}</strong> · {detail}</p>
        })}
        {impact && <p className='!mb-1'>{impact}</p>}
        {group.warnings.length > 0 && (
          <ul aria-label='À vérifier' className='!my-1 list-none !pl-0'>
            {group.warnings.map(warning => (
              <li key={warningKey(warning)} data-warning-code={warning.code} className='flex items-baseline gap-2'>
                <span aria-hidden='true' className='fr-icon-warning-line fr-icon--sm text-[var(--text-default-warning)]' />
                <span><span className='fr-sr-only'>À vérifier. </span><WarningMessage warning={warning} /></span>
              </li>
            ))}
          </ul>
        )}
        <PeriodDetails changes={group.changes} label={name} />
      </section>
    )
  })
}

export default function QuickDeclarationReview({declarationId = null, payload, submitLabel, onSaved, reviewEntries = [], seriesLabels = {}, seriesOrder, originalDates = null}) {
  const instanceId = useId().replaceAll(':', '')
  const modal = useMemo(() => createModal({id: `quick-review-${instanceId}`, isOpenedByDefault: false}), [instanceId])
  const [attempt, setAttempt] = useState(0)
  const [result, setResult] = useState(null)
  const [saveError, setSaveError] = useState(null)
  const [saving, setSaving] = useState(false)
  const savingRef = useRef(false)

  // Identity changes immediately for a new draft, including returning to a previous date.
  // An older response must neither be displayed nor authorize confirmation.
  const preview = result?.payload === payload && result.attempt === attempt ? result : null
  const dates = payload && describeQuickReviewDates(payload, originalDates)
  const data = preview?.data
  const groups = data ? groupQuickReview(reviewEntries, data.changes || [], data.warnings || [], seriesLabels, seriesOrder) : []
  const error = saveError?.payload === payload ? saveError : null
  const isEditing = Boolean(declarationId)

  useEffect(() => {
    if (!payload) return
    let current = true
    const timer = setTimeout(async () => {
      try {
        const response = await previewQuickDeclarationAction(payload, declarationId)
        const data = response?.data?.data
        if (!response?.success || !response.data?.success || !data?.previewToken) {
          if (current) setResult({payload, attempt, error: response?.error || 'La vérification n’a pas abouti.', code: response?.code})
        } else if (current) {
          setResult({payload, attempt, data})
        }
      } catch {
        if (current) setResult({payload, attempt, error: 'Impossible de vérifier la saisie. Réessayez.'})
      }
    }, previewDelay)

    return () => {
      current = false
      clearTimeout(timer)
    }
  }, [attempt, declarationId, payload])

  async function save() {
    if (!payload || !data?.previewToken || savingRef.current) return
    savingRef.current = true
    setSaving(true)
    setSaveError(null)
    try {
      const confirmed = {...payload, previewToken: data.previewToken}
      const response = isEditing
        ? await updateQuickDeclarationAction(declarationId, confirmed)
        : await createQuickDeclarationAction(confirmed)
      if (!response?.success || !response.data?.success) {
        const conflict = Number(response?.code) === 409
        setSaveError({payload, message: response?.error || 'L’enregistrement n’a pas abouti.'})
        if (conflict) setAttempt(previous => previous + 1)
        return
      }
      onSaved(response.data.data)
    } catch {
      setSaveError({payload, message: 'L’enregistrement n’a pas pu être confirmé. Vérifiez votre déclaration avant de réessayer.'})
    } finally {
      savingRef.current = false
      setSaving(false)
    }
  }

  const checkStatus = payload && !preview
    ? <p role='status'>Vérification des volumes en cours…</p>
    : preview?.error && (
      <Alert className='fr-my-2w' severity='error' title='Vérification impossible' description={(
        <>
          <p>{preview.error}</p>
          {isEditing && Number(preview.code) === 409 ? (
            <>
              <p>Recharger la déclaration effacera les modifications en cours.</p>
              <Button priority='secondary' onClick={() => window.location.reload()}>Recharger la déclaration</Button>
            </>
          ) : (
            <Button priority='secondary' onClick={() => setAttempt(previous => previous + 1)}>Réessayer la vérification</Button>
          )}
        </>
      )} />
    )

  return (
    <>
      <div aria-live='polite'>
        {checkStatus}
        <PreviewWarnings groups={groups} payload={payload} declarationId={declarationId} originalDates={originalDates} />
      </div>
      <Button disabled={!payload || saving} nativeButtonProps={modal.buttonProps}>{submitLabel}</Button>
      <modal.Component
        title={isEditing ? 'Vérifiez vos modifications' : 'Vérifiez votre déclaration'}
        size='large'
        titleAs='h2'
        buttons={[
          {children: 'Revenir à la saisie', priority: 'secondary', disabled: saving},
          {
            children: saving ? 'Enregistrement…' : isEditing ? 'Confirmer la modification' : 'Confirmer la déclaration',
            priority: 'primary', disabled: !data?.previewToken || saving, doClosesModal: false, onClick: save
          }
        ]}
      >
        {checkStatus}
        {data && (
          <>
            {dates && (
              <div className='fr-mb-2w'>
                <p className='fr-mb-0'><strong>{dates.title}</strong> · {dates.detail}</p>
                {dates.previous && <p className='fr-hint-text fr-mb-0'>{dates.previous}</p>}
              </div>
            )}
            <ReviewPoints originalDates={originalDates} groups={groups} />
            {data.warnings?.length > 0 && <p className='fr-mt-2w fr-mb-0'>Vous pouvez confirmer cette saisie.</p>}
          </>
        )}
        {error && <Alert severity='error' title='Enregistrement impossible' description={error.message} />}
      </modal.Component>
    </>
  )
}
