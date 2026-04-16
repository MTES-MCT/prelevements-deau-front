'use client'

import {useMemo, useState} from 'react'

import Alert from '@codegouvfr/react-dsfr/Alert'
import Button from '@codegouvfr/react-dsfr/Button'
import Input from '@codegouvfr/react-dsfr/Input'
import {Box, Link} from '@mui/material'

import {getPreleveurLabel} from '@/components/preleveurs/preleveur.js'
import GroupedMultiselect from '@/components/ui/GroupedMultiselect/index.js'

const sortOptionsByContent = options =>
  [...(options || [])].sort((a, b) =>
    String(a.content || '').localeCompare(String(b.content || ''), 'fr', {sensitivity: 'base'})
  )

const buildPointOptions = points => [
  {
    label: 'Points de prélèvement',
    options: sortOptionsByContent(
      (points || []).map(point => ({
        value: point._id,
        content: point.nom,
        title: point.nom
      }))
    )
  }
]

const buildPreleveurOptions = preleveurs => [
  {
    label: 'Préleveurs',
    options: sortOptionsByContent(
      (preleveurs || []).map(preleveur => {
        const label = getPreleveurLabel(preleveur)

        return {
          value: preleveur._id,
          content: label,
          title: label
        }
      })
    )
  }
]

const ExportForm = ({points = [], preleveurs = []}) => {
  const [selectedPointIds, setSelectedPointIds] = useState([])
  const [selectedPreleveurIds, setSelectedPreleveurIds] = useState([])
  const [dateDebut, setDateDebut] = useState('')
  const [dateFin, setDateFin] = useState('')
  const [error, setError] = useState(null)
  const [submittedUrl, setSubmittedUrl] = useState(null)

  const pointOptions = useMemo(() => buildPointOptions(points), [points])
  const preleveurOptions = useMemo(() => buildPreleveurOptions(preleveurs), [preleveurs])

  const handleSubmit = event => {
    event.preventDefault()
    setError(null)
    setSubmittedUrl(null)

    if (selectedPointIds.length === 0 && selectedPreleveurIds.length === 0) {
      setError('Veuillez sélectionner au moins un point ou un préleveur.')
      return
    }

    if (dateDebut && dateFin && dateDebut > dateFin) {
      setError('La date de début doit être antérieure ou égale à la date de fin.')
      return
    }

    const params = new URLSearchParams()

    for (const pointId of selectedPointIds) {
      params.append('pointIds', pointId)
    }

    for (const preleveurId of selectedPreleveurIds) {
      params.append('preleveurIds', preleveurId)
    }

    if (dateDebut) {
      params.set('startDate', dateDebut)
    }

    if (dateFin) {
      params.set('endDate', dateFin)
    }

    const url = `/api/exports/raw?${params.toString()}`
    setSubmittedUrl(url)

    window.open(url, '_blank')
  }

  return (
    <Box
      component='form'
      className='flex flex-col gap-4'
      sx={{maxWidth: 900}}
      onSubmit={handleSubmit}
    >
      {error && (
        <Alert
          small
          severity='error'
          description={error}
          className='fr-mb-2w'
        />
      )}

      <GroupedMultiselect
        searchable
        label='Points de prélèvement'
        hint='Optionnel'
        placeholder='Rechercher un point'
        options={pointOptions}
        value={selectedPointIds}
        onChange={setSelectedPointIds}
      />

      <GroupedMultiselect
        searchable
        label='Préleveurs'
        hint='Optionnel'
        placeholder='Rechercher un préleveur'
        options={preleveurOptions}
        value={selectedPreleveurIds}
        onChange={setSelectedPreleveurIds}
      />

      <Box className='grid grid-cols-1 md:grid-cols-2 gap-4'>
        <Input
          label='Date de début'
          hintText='Optionnel'
          nativeInputProps={{
            type: 'date',
            value: dateDebut,
            onChange: event => setDateDebut(event.target.value)
          }}
        />

        <Input
          label='Date de fin'
          hintText='Optionnel'
          nativeInputProps={{
            type: 'date',
            value: dateFin,
            onChange: event => setDateFin(event.target.value)
          }}
        />
      </Box>

      <Box className='flex items-center gap-3'>
        <Button type='submit'>
          Exporter les données brutes
        </Button>
      </Box>

      {submittedUrl && (
        <Alert
          small
          severity='info'
          description={
            <span>
              Export lancé :{' '}
              <Link href={submittedUrl} target='_blank' rel='noopener noreferrer'>
                ouvrir le téléchargement
              </Link>
            </span>
          }
        />
      )}
    </Box>
  )
}

export default ExportForm
