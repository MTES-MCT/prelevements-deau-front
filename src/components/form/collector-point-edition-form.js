'use client'

import {useRef, useState, useSyncExternalStore} from 'react'
import {useRouter} from '@bprogress/next/app'
import {Alert} from '@codegouvfr/react-dsfr/Alert'
import {Button} from '@codegouvfr/react-dsfr/Button'

import PointForm from '@/components/form/point-form.js'
import CountingCodeField from '@/components/form/counting-code-field.js'
import CollectorMeterFields from '@/components/form/collector-meter-fields.js'
import SectionCard from '@/components/ui/SectionCard/index.js'
import {buildCollectorPointEditionPayload, collectorExploitationLabel} from '@/lib/collector-point-edition.js'
import {updateCollectorPointFormAction} from '@/server/actions/collector-points.js'

const subscribeToHydration = () => () => {}
const getClientSnapshot = () => true
const getServerSnapshot = () => false

export default function CollectorPointEditionForm({form}) {
  const router = useRouter()
  const hydrated = useSyncExternalStore(subscribeToHydration, getClientSnapshot, getServerSnapshot)
  const [initial] = useState(form)
  const [pointPatch, setPointPatch] = useState({})
  const [exploitations, setExploitations] = useState(form.exploitations)
  const [saving, setSaving] = useState(false)
  const submitting = useRef(false)
  const [error, setError] = useState(null)
  const [validationErrors, setValidationErrors] = useState([])
  const [mustReload, setMustReload] = useState(false)
  const point = {...initial.point, ...pointPatch}
  const updateExploitation = (id, changes) => setExploitations(previous => previous.map(item => item.id === id ? {...item, ...changes} : item))

  async function save() {
    if (submitting.current || mustReload) return
    const payload = buildCollectorPointEditionPayload(initial, {pointPatch, exploitations})
    if (!Object.keys(payload.point).length && !payload.exploitations.length) {
      router.push(`/points-prelevement/${point.id}`)
      return
    }
    submitting.current = true
    setSaving(true)
    setError(null)
    setValidationErrors([])
    try {
      const result = await updateCollectorPointFormAction(point.id, payload)
      if (result.success) {
        router.push(`/points-prelevement/${point.id}`)
        router.refresh()
      } else {
        setError(result.error || 'Les modifications n’ont pas pu être enregistrées.')
        setValidationErrors(result.validationErrors ?? [])
        setMustReload(result.code === 409 || !result.code || result.code >= 500)
      }
    } catch {
      setError('La réponse n’a pas pu être confirmée. Rechargez la fiche avant de recommencer.')
      setMustReload(true)
    } finally {
      submitting.current = false
      setSaving(false)
    }
  }

  return <div>
    {point.right.isShared && <Alert severity='info' small className='fr-mb-3w'
      description='Ces informations sont communes à toutes les exploitations de ce point.' />}
    <fieldset disabled={!hydrated || saving} className='m-0 min-w-0 border-0 p-0' aria-busy={!hydrated || saving}>
      <legend className='sr-only'>Modification du point et de ses exploitations</legend>
      <PointForm point={point} setPoint={setPointPatch} editableFields={point.right.editableFields}
        canEditLocation={point.right.canEditLocation}
        handleSetGeom={coordinates => setPointPatch(previous => ({...previous, coordinates}))} />
      <div className='mt-6 flex flex-col gap-5'>
        {exploitations.map((exploitation, index) => <section key={exploitation.id} aria-label={collectorExploitationLabel(exploitation, index)}>
          <SectionCard title={collectorExploitationLabel(exploitation, index)}>
            <div className='mt-5'>
              {exploitation.capabilities.canEditCountingCode
                ? <CountingCodeField label='Code comptage Agence de l’eau' value={exploitation.countingCode}
                  onChange={countingCode => updateExploitation(exploitation.id, {countingCode})} />
                : <p>Code comptage Agence de l’eau : {exploitation.countingCode || 'Non renseigné'}</p>}
              <CollectorMeterFields meters={exploitation.meters} canAddMeter={exploitation.capabilities.canAddMeter}
                onChange={meters => updateExploitation(exploitation.id, {meters})} />
            </div>
          </SectionCard>
        </section>)}
      </div>
      {error && <Alert className='mt-5' severity='error' title={error} description={validationErrors.length > 0 ? <ul>
        {validationErrors.map((item, index) => <li key={`${item.path}-${index}`}>{item.message}</li>)}
      </ul> : undefined} />}
      {mustReload && <p role='status'>Votre saisie reste affichée. Rechargez la fiche pour vérifier les valeurs enregistrées avant une nouvelle modification.</p>}
      <div className='my-5 flex flex-wrap justify-end gap-3'>
        {mustReload && <Button priority='secondary' onClick={() => window.location.reload()}>Recharger la fiche</Button>}
        <Button disabled={saving || mustReload || !point.waterBodyType} onClick={save}>
          {saving ? 'Enregistrement…' : 'Enregistrer les modifications'}
        </Button>
      </div>
    </fieldset>
  </div>
}
