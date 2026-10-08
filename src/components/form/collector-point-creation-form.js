'use client'

import {useRef, useState, useSyncExternalStore} from 'react'

import {useRouter} from '@bprogress/next/app'
import {Alert} from '@codegouvfr/react-dsfr/Alert'
import {Button} from '@codegouvfr/react-dsfr/Button'
import {Input} from '@codegouvfr/react-dsfr/Input'
import {SegmentedControl} from '@codegouvfr/react-dsfr/SegmentedControl'
import {Select} from '@codegouvfr/react-dsfr/SelectNext'
import {Autocomplete, Checkbox, FormControlLabel, TextField} from '@mui/material'
import Link from 'next/link'

import PointForm from '@/components/form/point-form.js'
import PreleveurMoralForm from '@/components/form/preleveur-moral-form.js'
import PreleveurPhysiqueForm from '@/components/form/preleveur-physique-form.js'
import WaterUseSelect from '@/components/form/water-use-select.js'
import SectionCard from '@/components/ui/SectionCard/index.js'
import {
  buildCollectorPointCreationPayload,
  COLLECTOR_POINT_CREATION_FIELDS,
  findSimilarAccessiblePoints
} from '@/lib/collector-point-creation.js'
import {getDeclarantTitleFromDeclarant, PRELEVEUR_TYPE_OPTIONS} from '@/lib/declarants.js'
import {createCollectorPointAction} from '@/server/actions/collector-points.js'

const CreationSection = ({number, title, children}) => (
  <SectionCard title={`${number}. ${title}`}>
    <div className='mt-5'>{children}</div>
  </SectionCard>
)

function getMinimumEndDate() {
  const tomorrow = new Date()
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1)
  return tomorrow.toISOString().slice(0, 10)
}

const subscribeToHydration = () => () => {}
const getClientSnapshot = () => true
const getServerSnapshot = () => false

export default function CollectorPointCreationForm({preleveurs, accessiblePoints = [], zones = [], initialPreleveurId = ''}) {
  const router = useRouter()
  const hydrated = useSyncExternalStore(subscribeToHydration, getClientSnapshot, getServerSnapshot)
  const requestId = useRef(null)
  const submitting = useRef(false)
  const [mode, setMode] = useState(preleveurs.length ? 'existing' : 'new')
  const [preleveurId, setPreleveurId] = useState(preleveurs.some(item => item.id === initialPreleveurId) ? initialPreleveurId : '')
  const [preleveur, setPreleveur] = useState({declarantType: 'NATURAL_PERSON', preleveurType: '', firstName: '', lastName: '', email: ''})
  const [point, setPoint] = useState({name: '', usageName: '', flowType: '', waterBodyType: '', geometryPrecision: ''})
  const [exploitation, setExploitation] = useState({usageId: '', secondaryUsageIds: [], status: 'EN_ACTIVITE', startDate: '', endDate: ''})
  const [notifyAccountCreation, setNotifyAccountCreation] = useState(false)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState(null)
  const [validationErrors, setValidationErrors] = useState([])
  const [created, setCreated] = useState(null)
  const isNaturalPerson = preleveur.declarantType === 'NATURAL_PERSON'
  const similarPoints = findSimilarAccessiblePoints(point, accessiblePoints)
  const hasIdentity = mode === 'existing' ? Boolean(preleveurId) : Boolean(preleveur.preleveurType
    && (isNaturalPerson ? preleveur.firstName?.trim() && preleveur.lastName?.trim() : preleveur.socialReason?.trim()))
  const canSubmit = hasIdentity && point.name?.trim() && point.flowType && point.waterBodyType && point.coordinates && exploitation.usageId

  async function handleSubmit() {
    if (submitting.current || created) return
    submitting.current = true
    setPending(true)
    setError(null)
    setValidationErrors([])
    requestId.current ??= globalThis.crypto.randomUUID()
    try {
      const result = await createCollectorPointAction(buildCollectorPointCreationPayload({
        requestId: requestId.current, point, preleveur, preleveurId, mode, exploitation, notifyAccountCreation
      }))
      if (!result.success) {
        setError(result.error || 'Le point n’a pas pu être enregistré.')
        setValidationErrors(result.validationErrors || [])
        return
      }

      setCreated(result.data)
      if (!['failed', 'pending'].includes(result.data.notification.status)) {
        router.push(`/points-prelevement/${result.data.point.id}`)
        router.refresh()
      }
    } catch {
      setError('La connexion a été interrompue. Réessayez sans fermer ce formulaire : votre demande ne sera pas créée en double.')
    } finally {
      submitting.current = false
      setPending(false)
    }
  }

  if (created) {
    return <div className='fr-container mb-8'>
      <Alert severity='success' title='Le point et son exploitation ont été créés.' />
      {created.notification.status === 'failed' && <Alert className='mt-4' severity='warning' title='L’email d’accès n’a pas pu être envoyé.'
        description='Le préleveur et le point sont bien enregistrés. Un administrateur peut renvoyer l’email d’accès.' />}
      {created.notification.status === 'pending' && <Alert className='mt-4' severity='info' title='L’envoi de l’email d’accès n’est pas encore confirmé.'
        description='Le point est bien enregistré. Ne recréez pas la demande.' />}
      <Button className='mt-5' linkProps={{href: `/points-prelevement/${created.point.id}`}}>Voir le point</Button>
    </div>
  }

  return <div className='fr-container mb-8'>
    <h1 className='fr-h3'>Ajouter un point</h1>
    <p className='fr-text--sm' style={{color: 'var(--text-mention-grey)'}}>
      Zones autorisées : {zones.map(zone => zone.name).join(', ')}.
    </p>
    <fieldset disabled={!hydrated || pending} className='m-0 min-w-0 border-0 p-0 flex flex-col gap-5' aria-busy={!hydrated || pending}>
      <legend className='sr-only'>Création d’un point et de son exploitation</legend>
      <CreationSection number={1} title='Préleveur'>
        <SegmentedControl legend='Associer le point à' segments={[
          {label: 'Un préleveur déjà suivi', nativeInputProps: {checked: mode === 'existing', onChange: () => setMode('existing')}},
          {label: 'Un nouveau préleveur', nativeInputProps: {checked: mode === 'new', onChange: () => setMode('new')}}
        ]} />
        {mode === 'existing' ? <div className='mt-5'>
          <Autocomplete options={preleveurs} value={preleveurs.find(item => item.id === preleveurId) ?? null}
            getOptionLabel={item => `${getDeclarantTitleFromDeclarant(item)}${item.city ? ` · ${item.city}` : ''}`}
            isOptionEqualToValue={(left, right) => left.id === right.id}
            noOptionsText='Aucun préleveur actuellement suivi'
            onChange={(_event, item) => setPreleveurId(item?.id ?? '')}
            renderInput={params => <TextField {...params} label='Préleveur *' />} />
        </div> : <div className='mt-5'>
          <Select label='Type de préleveur *' placeholder='Sélectionner le type de préleveur' options={PRELEVEUR_TYPE_OPTIONS}
            nativeSelectProps={{value: preleveur.preleveurType, onChange: event => setPreleveur(previous => ({...previous, preleveurType: event.target.value}))}} />
          <SegmentedControl className='mb-5' legend='Type de personne' segments={[
            {label: 'Personne physique', nativeInputProps: {checked: isNaturalPerson, onChange: () => setPreleveur(previous => ({...previous, declarantType: 'NATURAL_PERSON'}))}},
            {label: 'Personne morale', nativeInputProps: {checked: !isNaturalPerson, onChange: () => setPreleveur(previous => ({...previous, declarantType: 'LEGAL_PERSON'}))}}
          ]} />
          {isNaturalPerson
            ? <PreleveurPhysiqueForm preleveur={preleveur} setPreleveur={setPreleveur} />
            : <PreleveurMoralForm preleveur={preleveur} setPreleveur={setPreleveur} />}
          <FormControlLabel label='Envoyer un email d’accès' control={<Checkbox
            checked={Boolean(preleveur.email?.trim()) && notifyAccountCreation} disabled={!preleveur.email?.trim()}
            onChange={event => setNotifyAccountCreation(event.target.checked)} />} />
        </div>}
      </CreationSection>
      <CreationSection number={2} title='Point'>
        <PointForm point={point} setPoint={setPoint} editableFields={COLLECTOR_POINT_CREATION_FIELDS}
          handleSetGeom={coordinates => setPoint(previous => ({...previous, coordinates}))} />
        {similarPoints.length > 0 && <Alert small severity='info' title='Un point du même nom existe déjà dans vos données.' description={<ul>
          {similarPoints.map(item => <li key={item.id}><Link href={`/points-prelevement/${item.id}`} target='_blank' rel='noopener noreferrer'>{item.usageName || item.name}</Link></li>)}
        </ul>} />}
      </CreationSection>
      <CreationSection number={3} title='Exploitation'>
        <WaterUseSelect value={exploitation.usageId} secondaryValues={exploitation.secondaryUsageIds}
          onChange={usageId => setExploitation(previous => ({...previous, usageId}))}
          onSecondaryChange={secondaryUsageIds => setExploitation(previous => ({...previous, secondaryUsageIds}))} />
        <div className='grid grid-cols-1 md:grid-cols-2 gap-4 mt-5'>
          <Input label='Début d’activité' hintText='Facultatif' nativeInputProps={{type: 'date', value: exploitation.startDate,
            max: new Date().toISOString().slice(0, 10), onChange: event => setExploitation(previous => ({...previous, startDate: event.target.value}))}} />
          <Input label='Fin d’activité' hintText='À laisser vide si l’exploitation se poursuit' nativeInputProps={{type: 'date', value: exploitation.endDate,
            min: getMinimumEndDate(), onChange: event => setExploitation(previous => ({...previous, endDate: event.target.value}))}} />
        </div>
      </CreationSection>
      {error && <Alert severity='error' title={error} description={validationErrors.length > 0 ? <ul>
        {validationErrors.map((item, index) => <li key={`${item.path}-${index}`}>{item.message}</li>)}
      </ul> : undefined} />}
      <div className='flex justify-end'>
        <Button disabled={!canSubmit || pending} onClick={handleSubmit}>{pending ? 'Enregistrement…' : 'Créer le point et son exploitation'}</Button>
      </div>
    </fieldset>
  </div>
}
