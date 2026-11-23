'use client'

import {useEffect, useId, useMemo, useRef, useState} from 'react'

import {Alert} from '@codegouvfr/react-dsfr/Alert'
import {Button} from '@codegouvfr/react-dsfr/Button'
import {createModal} from '@codegouvfr/react-dsfr/Modal'

import {parseDateInput} from '@/lib/date-range.js'
import {getMyDeclarationURL} from '@/lib/urls.js'
import {
  createQuickDeclarationAction, previewQuickDeclarationAction, updateQuickDeclarationAction
} from '@/server/actions/declarations.js'
import {formatNumber} from '@/utils/number.js'

import QuickDeclarationContact from './quick-declaration-contact.js'

const previewDelay = 300

export function formatQuickDate(date) {
  const parsed = parseDateInput(date)
  return parsed ? parsed.toLocaleDateString('fr-FR') : '—'
}

function formatPeriod(start, end) {
  return start === end ? formatQuickDate(start) : `${formatQuickDate(start)} au ${formatQuickDate(end)}`
}

function formatVolume(value) {
  return value == null ? '—' : `${formatNumber(value, {maximumFractionDigits: 10})} m³`
}

function getDeltaLabel(before, after) {
  if (before == null) return 'Ajout'
  if (after == null) return 'Suppression'
  const delta = after - before
  return `${delta > 0 ? '+' : ''}${formatVolume(delta)}`
}

function getSeriesLabel(row, seriesLabels) {
  const exploitation = row.exploitationId || row.pointPrelevementId
  return seriesLabels[`${exploitation}/${row.compteurId}`] || seriesLabels[exploitation] || row.pointName || 'Point de prélèvement'
}

function VolumeChanges({changes, seriesLabels}) {
  if (!changes.length) {
    return <p>Aucun volume à recalculer pour cette saisie.</p>
  }

  return (
    <div className='fr-table mb-4 overflow-x-auto'>
      <table>
        <caption>Volumes concernés</caption>
        <thead>
          <tr>{['Point', 'Période', 'Avant', 'Après', 'Écart'].map(label => <th key={label} scope='col'>{label}</th>)}</tr>
        </thead>
        <tbody>
          {changes.map(change => (
            <tr key={[change.exploitationId, change.pointPrelevementId, change.compteurId, change.periodStartDate, change.periodEndDate, change.before, change.after].join(':')}>
              <th scope='row'>{getSeriesLabel(change, seriesLabels)}</th>
              <td>{formatPeriod(change.periodStartDate, change.periodEndDate)}</td>
              <td>{formatVolume(change.before)}</td>
              <td>{formatVolume(change.after)}</td>
              <td>{getDeltaLabel(change.before, change.after)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function PreviewWarnings({warnings, seriesLabels, payload, declarationId, withContact = false}) {
  if (!warnings?.length) return null

  return (
    <Alert
      className='fr-my-2w'
      severity='warning'
      title='Saisie à vérifier'
      description={(
        <>
          <ul>
            {warnings.map(warning => (
              <li key={[warning.pointPrelevementId, warning.exploitationId, warning.compteurId, warning.code, warning.periodStartDate, warning.periodEndDate, warning.value, warning.message].join(':')}>
                <strong>{getSeriesLabel(warning, seriesLabels)} — </strong>{warning.message}
                {['INDEX_SAME_DATE', 'VOLUME_OVERLAP'].includes(warning.code) && warning.value != null && (
                  <span> Valeur existante — {formatVolume(warning.value)}{warning.periodStartDate && ` (${formatPeriod(warning.periodStartDate, warning.periodEndDate)})`}.</span>
                )}
                {warning.declarationId ? (
                  <> <a className='fr-link' href={getMyDeclarationURL({id: warning.declarationId})} target='_blank' rel='noopener noreferrer'>
                    {warning.declarationCode ? `Déclaration n°${warning.declarationCode}` : 'Déclaration source'} (nouvel onglet)
                  </a></>
                ) : warning.declarationCode && <span> Déclaration n°{warning.declarationCode}.</span>}
                {withContact && <QuickDeclarationContact declarationId={declarationId} payload={payload} warning={warning} />}
              </li>
            ))}
          </ul>
          <span>Vous pouvez confirmer cette saisie.</span>
        </>
      )}
    />
  )
}

export default function QuickDeclarationReview({declarationId = null, payload, submitLabel, onSaved, summary, seriesLabels = {}}) {
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
  const data = preview?.data
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
        <PreviewWarnings withContact seriesLabels={seriesLabels} warnings={data?.warnings} payload={payload} declarationId={declarationId} />
      </div>
      <Button disabled={!payload || saving} nativeButtonProps={modal.buttonProps}>{submitLabel}</Button>
      <modal.Component
        title={isEditing ? 'Vérifiez les volumes modifiés' : 'Vérifiez votre déclaration'}
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
        {summary}
        {checkStatus}
        {data && (
          <>
            <VolumeChanges seriesLabels={seriesLabels} changes={data.changes || []} />
            {data.changes?.length > 0 && <p>Les volumes affichés dans le tableau de bord et les exports seront mis à jour.</p>}
            <PreviewWarnings seriesLabels={seriesLabels} warnings={data.warnings} />
          </>
        )}
        {error && <Alert severity='error' title='Enregistrement impossible' description={error.message} />}
      </modal.Component>
    </>
  )
}
