import {useEffect, useState} from 'react'

import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem
} from '@mui/material'

import Exploitation from '@/components/exploitation.js'

const PointDetails = ({point, isDialogOpen, setIsDialogOpen}) => {
  const beneficiaires = JSON.parse(point.beneficiaires)
  const exploitations = JSON.parse(point.exploitation)
  const orderedExploitations = exploitations.sort((a, b) => new Date(b.date_debut) - new Date(a.date_debut))
  const [selectedExploitationId, setSelectedExploitationId] = useState()

  useEffect(() => {
    if (point && orderedExploitations.length > 0) {
      setSelectedExploitationId(orderedExploitations[0]?.id_exploitation || '')
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [point])

  return (
    <Dialog
      fullWidth='true'
      maxWidth='true'
      open={isDialogOpen}
      onClose={() => setIsDialogOpen(false)}
    >
      <DialogTitle>{point.nom || 'Pas de nom renseigné'}</DialogTitle>
      <DialogContent>
        {orderedExploitations.length > 0 && (
          <FormControl
            fullWidth
            sx={{
              my: 3
            }}
          >
            <InputLabel id='exploitation'>Exploitation</InputLabel>
            <Select
              labelId='exploitation'
              value={selectedExploitationId}
              label='exploitation'
              onChange={e => setSelectedExploitationId(e.target.value)}
            >
              {orderedExploitations.map(exploitation => (
                <MenuItem key={exploitation.id_exploitation} value={exploitation.id_exploitation}>
                  {exploitation.date_debut} - {exploitation.date_fin}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        )}
        <Exploitation
          key={selectedExploitationId}
          exploitation={orderedExploitations.find(exploitation => exploitation.id_exploitation === selectedExploitationId)}
          beneficiaires={beneficiaires}
        />
      </DialogContent>
      <DialogActions>
        <Button variant='contained' onClick={() => setIsDialogOpen(false)}>Fermer</Button>
      </DialogActions>
    </Dialog>
  )
}

export default PointDetails
