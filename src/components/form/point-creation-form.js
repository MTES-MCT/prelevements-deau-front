/* eslint-disable camelcase */
'use client'

import {useEffect, useState} from 'react'

import Button from '@codegouvfr/react-dsfr/Button'
import Input from '@codegouvfr/react-dsfr/Input'
import Select from '@codegouvfr/react-dsfr/SelectNext'
import {ChevronRight} from '@mui/icons-material'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import {
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Typography
} from '@mui/material'
import {useRouter} from 'next/navigation'

import {createPointPrelevement} from '@/app/api/points-prelevement.js'
import MiniMapForm from '@/components/form/mini-map-form.js'
import OptionalPointFieldsForm from '@/components/form/optional-point-fields-form.js'
import {getCommuneFromCoords} from '@/lib/communes.js'

const PointCreationForm = ({bnpeList, mesoList, meContinentalesBvList}) => {
  const router = useRouter()
  const [point, setPoint] = useState({
    nom: '',
    type_milieu: '',
    precision_geom: ''
  })
  const typesDeMilieu = ['Eau de surface', 'Eau souterraine', 'Eau de transition']
  const [isExpanded, setIsExpanded] = useState(false)
  const [isDisabled, setIsDisabled] = useState(true)
  const [validationErrors, setValidationErrors] = useState([])
  const [error, setError] = useState(null)
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

  const handleSubmit = async () => {
    setError(null)
    setValidationErrors([])

    try {
      const response = await createPointPrelevement(point)

      if (response.code === 400) {
        if (response.validationErrors) {
          setValidationErrors(response.validationErrors)
        } else {
          setError(response.message)
        }
      } else {
        router.push(`/prelevements?point-prelevement=${response.id_point}`)
      }
    } catch (error) {
      setError(error.message)
    }
  }

  const handleSetGeom = async geom => {
    try {
      const commune = await getCommuneFromCoords(
        {
          lon: geom.coordinates[0],
          lat: geom.coordinates[1]
        }
      )

      if (!commune) {
        setError('Cette commune est introuvable.')
        return
      }

      setPoint(prev => ({...prev, commune: commune.code, geom}))
    } catch (error) {
      setError(error.message)
    }
  }

  useEffect(() => {
    setIsDisabled(!(point.nom && point.type_milieu && point.precision_geom && point.geom))
  }, [point])

  return (
    <div className='fr-container'>
      <Typography variant='h3' sx={{pb: 5}}>
        Création d&apos;un point de prélèvement
      </Typography>
      <Input
        required
        label='Nom du point de prélèvement *'
        nativeInputProps={{
          placeholder: 'Entrer le nom du point de prélèvement',
          value: point.nom,
          onChange: e => setPoint({...point, nom: e.target.value})
        }}
      />
      <Select
        label='Type de milieu *'
        placeholder='Sélectionner le type de milieu'
        nativeSelectProps={{
          value: point.type_milieu,
          onChange: e => setPoint({...point, type_milieu: e.target.value})
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
        <MiniMapForm setGeom={handleSetGeom} />
      </div>
      <Select
        label='Précision géométrique'
        placeholder='Sélectionner une précision géométrique'
        nativeSelectProps={{
          value: point.precision_geom,
          onChange: e => setPoint({...point, precision_geom: e.target.value})
        }}
        options={precisionsGeom.map(precision => ({
          value: precision,
          label: precision
        }))}
      />
      <div className='py-5'>
        <Accordion
          expanded={isExpanded}
          elevation={0}
          sx={{
            border: '1px solid lightgrey'
          }}
          onChange={() => setIsExpanded(!isExpanded)}
        >
          <AccordionSummary>
            <Typography className='text-center w-full'>
              {isExpanded ? 'Masquer les champs optionnels' : 'Afficher les champs optionnels'}
              {isExpanded ? <ExpandMoreIcon /> : <ChevronRight />}
            </Typography>
          </AccordionSummary>
          <AccordionDetails>
            <OptionalPointFieldsForm
              point={point}
              setPoint={setPoint}
              bnpeList={bnpeList}
              mesoList={mesoList}
              meContinentalesBvList={meContinentalesBvList}
            />
          </AccordionDetails>
        </Accordion>
      </div>
      {error && (
        <div className='text-center p-5 text-red-500'>
          <p><b>Un problème est survenu :</b></p>
          {error}
        </div>
      )}
      {validationErrors?.length > 0 && (
        <div className='text-center p-5 text-red-500'>
          <p><b>{validationErrors.length === 1 ? 'Problème de validation :' : 'Problèmes de validation :'}</b></p>
          {validationErrors.map(err => (
            <p key={err.message}>{err.message}</p>
          )
          )}
        </div>
      )}
      <div className='w-full flex justify-center p-5 mb-8'>
        <Button disabled={isDisabled} onClick={handleSubmit}>
          Valider la création du point de prélèvement
        </Button>
      </div>
    </div>
  )
}

export default PointCreationForm
