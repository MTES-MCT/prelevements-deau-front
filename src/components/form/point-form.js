'use client'

import {useState} from 'react'

import Input from '@codegouvfr/react-dsfr/Input'
import Select from '@codegouvfr/react-dsfr/SelectNext'
import {Typography} from '@mui/material'

import MiniMapForm from '@/components/form/mini-map-form.js'
import OptionalPointFieldsForm from '@/components/form/optional-point-fields-form.js'
import AccordionCentered from '@/components/ui/AccordionCentered/index.js'

const waterBodyTypes = [
  {value: 'SUPERFICIELLE', label: 'Eau superficielle'},
  {value: 'SOUTERRAIN', label: 'Eau souterraine'},
  {value: 'TRANSITION', label: 'Eau de transition'}
]

const pointNatures = [
  {value: 'NAPPE', label: 'Nappe'},
  {value: 'NAPPE_ACCOMPAGNEMENT', label: 'Nappe d’accompagnement'},
  {value: 'COURS_EAU', label: 'Cours d’eau'},
  {value: 'SOURCE', label: 'Source'},
  {value: 'PLAN_EAU', label: 'Plan d’eau'}
]

const withdrawalTypes = [
  {value: 'LITTORAL', label: 'Littoral'},
  {value: 'CONTINENTAL', label: 'Continental'},
  {value: 'SOUTERRAIN', label: 'Souterrain'},
  {value: 'STOCKAGE', label: 'Stockage'}
]

const precisionsGeom = [
  'Coordonnées précises',
  'Coordonnées estimées (précision du kilomètre)',
  'Coordonnées du centroïde de la commune',
  'Coordonnées précises (AP)',
  'Coordonnées précises (ARS)',
  'Coordonnées précises (ARS 2013)',
  'Coordonnées précises (BSS)',
  'Coordonnées précises (BNPE – accès restreint)',
  'Coordonnées précises (BNPE)',
  'Coordonnées précises (DEAL)',
  'Coordonnées précises (DLE)',
  'Coordonnées précises (rapport HGA)',
  'Précision inconnue',
  'Repérage carte'
]

const PointForm = ({
  point,
  setPoint,
  handleSetGeom,
  boundaryFeature = null
}) => {
  const [isExpanded, setIsExpanded] = useState(false)

  return (
    <>
      <Input
        required
        label='Nom du point de prélèvement *'
        nativeInputProps={{
          placeholder: 'Entrer le nom du point de prélèvement',
          defaultValue: point.name || '',
          onChange: e => setPoint(prev => ({...prev, name: e.target.value}))
        }}
      />

      <Select
        label='Type de milieu *'
        placeholder='Sélectionner le type de milieu'
        nativeSelectProps={{
          defaultValue: point.waterBodyType || '',
          onChange: e => setPoint(prev => ({...prev, waterBodyType: e.target.value}))
        }}
        options={waterBodyTypes}
      />

      <Select
        label='Nature du point de prélèvement'
        placeholder='Sélectionner la nature du point'
        nativeSelectProps={{
          defaultValue: point.nature || '',
          onChange: e => setPoint(prev => ({...prev, nature: e.target.value}))
        }}
        options={pointNatures}
      />

      <Select
        label='Type de prélèvement'
        placeholder='Sélectionner le type de prélèvement'
        nativeSelectProps={{
          defaultValue: point.withdrawalType || '',
          onChange: e => setPoint(prev => ({...prev, withdrawalType: e.target.value}))
        }}
        options={withdrawalTypes}
      />

      <div className='pb-5'>
        <Typography variant='h5'>
          Localisation
        </Typography>
        <p>Sélectionner l&apos;emplacement du point sur la carte <small><i>(Cliquer ou déplacer le point)</i></small></p>
        <p>Ou renseigner les coordonnées manuellement sous la carte</p>
        {boundaryFeature && (
          <p className='fr-text--sm fr-mt-1w fr-mb-0'>
            La limite de la zone est affichée sur la carte pour faciliter le positionnement.
          </p>
        )}
      </div>

      <div style={{height: '600px', marginBottom: '2rem'}}>
        <MiniMapForm boundaryFeature={boundaryFeature} geom={point.coordinates} setGeom={handleSetGeom} />
      </div>

      <Input
        label='Détails sur la localisation'
        nativeInputProps={{
          placeholder: 'Entrer les détails sur la localisation',
          defaultValue: point.locationDescription || '',
          onChange: e => setPoint(prev => ({...prev, locationDescription: e.target.value}))
        }}
      />

      <Select
        label='Précision géométrique'
        placeholder='Sélectionner une précision géométrique'
        nativeSelectProps={{
          defaultValue: point.geometryPrecision || '',
          onChange: e => setPoint(prev => ({...prev, geometryPrecision: e.target.value}))
        }}
        options={precisionsGeom.map(precision => ({
          value: precision,
          label: precision
        }))}
      />

      <Input
        textArea
        label='Remarque'
        nativeTextAreaProps={{
          placeholder: 'Entrer une remarque',
          defaultValue: point?.comment || '',
          onChange: e => setPoint(prev => ({...prev, comment: e.target.value}))
        }}
      />

      <Input
        textArea
        label='Remarque interne (visible uniquement par les agents)'
        nativeTextAreaProps={{
          placeholder: 'Entrer une remarque interne',
          defaultValue: point?.internalComment || '',
          onChange: e => setPoint(prev => ({...prev, internalComment: e.target.value}))
        }}
      />

      <AccordionCentered
        isExpanded={isExpanded}
        setIsExpanded={setIsExpanded}
        label='les champs optionnels'
      >
        <OptionalPointFieldsForm
          point={point}
          setPoint={setPoint}
        />
      </AccordionCentered>
    </>
  )
}

export default PointForm
