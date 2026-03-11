'use client'

import {useState, useTransition, useMemo} from 'react'

import {fr} from '@codegouvfr/react-dsfr'
import {
  Alert,
  Box,
  Button,
  FormControl,
  FormControlLabel,
  FormLabel,
  Grid2 as Grid,
  Radio,
  RadioGroup,
  TextField,
  Typography,
  Autocomplete,
  createFilterOptions
} from '@mui/material'
import {useRouter} from 'next/navigation'

import {CHUNK_STATUS} from '@/components/declarations/instruction/chunk-instruction-badge.js'
import {instructChunkAction} from '@/server/actions/chunks'

const filterOptions = createFilterOptions({
  limit: 50
})

const ChunkInstructionForm = ({
  chunkId,
  availablePoints = [],
  borderColor,
  pointPrelevementId,
  instructionStatus: initialInstructionStatus = 'PENDING',
  instructionComment: initialInstructionComment = '',
  conflictMessage = null
}) => {
  const router = useRouter()
  const [isSubmitting, startTransition] = useTransition()

  const [selectedPointId, setSelectedPointId] = useState(pointPrelevementId ?? '')
  const [instructionStatus, setInstructionStatus] = useState(initialInstructionStatus ?? 'PENDING')
  const [instructionComment, setInstructionComment] = useState(initialInstructionComment ?? '')
  const [submitError, setSubmitError] = useState(null)
  const [submitSuccess, setSubmitSuccess] = useState(null)

  const INSTRUCTION_OPTIONS = useMemo(() => Object.keys(CHUNK_STATUS)
    .filter(k => CHUNK_STATUS[k].selectable)
    .map(k => ({
      label: CHUNK_STATUS[k].instructionLabel,
      color: CHUNK_STATUS[k].color,
      value: k
    })), [])

  const pointOptions = useMemo(() => availablePoints.map(point => ({
    id: point.id,
    label: point.name
  })), [availablePoints])

  const selectedPoint = useMemo(() => pointOptions.find(point => point.id === selectedPointId) ?? null, [pointOptions, selectedPointId])

  const handleSubmit = event => {
    event.preventDefault()

    setSubmitError(null)
    setSubmitSuccess(null)

    startTransition(async () => {
      const result = await instructChunkAction({
        chunkId,
        pointPrelevementId: selectedPointId || null,
        status: instructionStatus,
        comment: instructionComment
      })

      if (!result?.success) {
        setSubmitError(result?.error || 'Une erreur est survenue.')
        return
      }

      setSubmitSuccess('Instruction enregistrée.')
      router.refresh()
    })
  }

  return (
    <Box
      component='form'
      sx={{
        p: 2,
        borderTop: '1px solid',
        borderColor,
        backgroundColor: fr.colors.decisions.background.alt.grey.default
      }}
      onSubmit={handleSubmit}
    >
      {conflictMessage && (
        <Box sx={{mb: 2}}>
          <Alert severity='error'>
            {conflictMessage}
          </Alert>
        </Box>
      )}

      {submitError && (
        <Box sx={{mb: 2}}>
          <Alert severity='error'>
            {submitError}
          </Alert>
        </Box>
      )}

      {submitSuccess && (
        <Box sx={{mb: 2}}>
          <Alert severity='success'>
            {submitSuccess}
          </Alert>
        </Box>
      )}

      <Grid container spacing={2}>
        <Grid size={{xs: 12, md: 6}}>
          <FormControl fullWidth size='small'>
            <FormLabel
              sx={{
                mb: 0.75,
                fontWeight: 600,
                fontSize: 14
              }}
            >
              Point de prélèvement associé
            </FormLabel>

            <Autocomplete
              clearOnEscape
              options={pointOptions}
              filterOptions={filterOptions}
              value={selectedPoint}
              getOptionLabel={option => option.label ?? ''}
              isOptionEqualToValue={(option, value) => option.id === value.id}
              disabled={isSubmitting}
              renderInput={params => (
                <TextField
                  {...params}
                  placeholder='Rechercher un point de prélèvement'
                />
              )}
              noOptionsText='Aucun point trouvé'
              onChange={(_, value) => setSelectedPointId(value?.id ?? '')}
            />
          </FormControl>
        </Grid>

        <Grid size={{xs: 12, md: 6}}>
          <FormControl disabled={isSubmitting}>
            <FormLabel
              sx={{
                mb: 0.75,
                fontWeight: 600,
                fontSize: 14
              }}
            >
              Statut
            </FormLabel>

            <RadioGroup
              row
              value={instructionStatus}
              sx={{gap: 2}}
              onChange={event => setInstructionStatus(event.target.value)}
            >
              {INSTRUCTION_OPTIONS.map(option => (
                <FormControlLabel
                  key={option.value}
                  value={option.value}
                  control={<Radio />}
                  label={option.label}
                  sx={{
                    '& .MuiFormControlLabel-label': {
                      fontSize: 14
                    }
                  }}
                />
              ))}
            </RadioGroup>
          </FormControl>
        </Grid>

        <Grid size={12}>
          <Box>
            <Typography
              component='label'
              variant='body2'
              sx={{
                display: 'block',
                mb: 0.75,
                fontWeight: 600
              }}
            >
              Commentaire optionnel
            </Typography>

            <TextField
              fullWidth
              multiline
              minRows={3}
              value={instructionComment}
              placeholder='Ajouter un commentaire d’instruction'
              disabled={isSubmitting}
              onChange={event => setInstructionComment(event.target.value)}
            />
          </Box>
        </Grid>

        <Grid size={12}>
          <Box sx={{display: 'flex'}}>
            <Button
              type='submit'
              disabled={isSubmitting}
              variant='contained'
            >
              {isSubmitting ? 'Validation…' : 'Instruire les données'}
            </Button>
          </Box>
        </Grid>
      </Grid>
    </Box>
  )
}

export default ChunkInstructionForm
