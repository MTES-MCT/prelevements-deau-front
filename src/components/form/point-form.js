/* eslint-disable camelcase */

import {useState} from 'react'

import Input from '@codegouvfr/react-dsfr/Input'
import Select from '@codegouvfr/react-dsfr/SelectNext'
import {Typography} from '@mui/material'

import MiniMapForm from '@/components/form/mini-map-form.js'
import OptionalPointFieldsForm from '@/components/form/optional-point-fields-form.js'
import AccordionCentered from '@/components/ui/accordion-centered.js'

const PointForm = ({
  point,
  setPoint,
  handleSetGeom,
  bnpeList,
  bvBdCarthageList,
  meContinentalesBvList,
  mesoList
}) => {
  const [isExpanded, setIsExpanded] = useState(false)
  const typesDeMilieu = ['Eau de surface', 'Eau souterraine', 'Eau de transition']
  const precisionsGeom = [
    'Repérage carte',
    'Coordonnées précises',
    'Coordonnées précises (ARS)',
    'Coordonnées du centroïde de la commune',
    'Coordonnées précises (rapport HGA)',
    'Coordonnées précises (ARS 2013)',
    'Coordonnées précises (AP)',
    'Coordonnées précises (BSS)',
    'Coordonnées précises (BNPE – accès restreint)',
    'Précision inconnue',
    'Coordonnées estimées (précision du kilomètre)',
    'Coordonnées précises (BNPE)',
    'Coordonnées précises (DEAL)',
    'Coordonnées précises (DLE)'
  ]

  return (
    <>
      <Input
        required
        label='Nom du point de prélèvement *'
        nativeInputProps={{
          placeholder: 'Entrer le nom du point de prélèvement',
          defaultValue: point.nom,
          onChange: e => setPoint(prev => ({...prev, nom: e.target.value}))
        }}
      />
      <Select
        label='Type de milieu *'
        placeholder='Sélectionner le type de milieu'
        nativeSelectProps={{
          defaultValue: point.type_milieu,
          onChange: e => setPoint(prev => ({...prev, type_milieu: e.target.value}))
        }}
        options={typesDeMilieu.map(type => ({
          value: type,
          label: type
        }))}
      />
      <div className='pb-5'>
        <Typography variant='h5'>
          Localisation
        </Typography>
        <p>Sélectionner l&apos;emplacement du point sur la carte <small><i>(Cliquer ou déplacer le point)</i></small></p>
      </div>
      <div style={{height: '600px', marginBottom: '2rem'}}>
        <MiniMapForm geom={point.geom} setGeom={handleSetGeom} />
      </div>
      <Select
        label='Précision géométrique'
        placeholder='Sélectionner une précision géométrique'
        nativeSelectProps={{
          defaultValue: point.precision_geom,
          onChange: e => setPoint(prev => ({...prev, precision_geom: e.target.value}))
        }}
        options={precisionsGeom.map(precision => ({
          value: precision,
          label: precision
        }))}
      />
      <AccordionCentered
        isExpanded={isExpanded}
        setIsExpanded={setIsExpanded}
        label='les champs optionnels'
      >
        <OptionalPointFieldsForm
          point={point}
          setPoint={setPoint}
          bnpeList={bnpeList}
          bvBdCarthageList={bvBdCarthageList}
          mesoList={mesoList}
          meContinentalesBvList={meContinentalesBvList}
        />
      </AccordionCentered>
    </>
  )
}

export default PointForm
