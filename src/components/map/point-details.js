import {ExpandMore} from '@mui/icons-material'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Typography
} from '@mui/material'

import Beneficiaire from '@/components/beneficiaire.js'
import Exploitation from '@/components/exploitation.js'

const PointDetails = ({point, isDialogOpen, setIsDialogOpen}) => {
  const beneficiaires = JSON.parse(point.beneficiaires)
  const exploitations = JSON.parse(point.exploitation)
  const orderedExploitations = exploitations.sort((a, b) => new Date(b.date_debut) - new Date(a.date_debut))

  return (
    <Dialog
      fullWidth='true'
      maxWidth='true'
      open={isDialogOpen}
      onClose={() => setIsDialogOpen(false)}
    >
      <DialogTitle>{point.nom || 'Pas de nom renseigné'}</DialogTitle>
      <DialogContent>
        <Accordion>
          <AccordionSummary expandIcon={<ExpandMore />}>
            <Typography variant='h6'>Bénéficiaires :</Typography>
          </AccordionSummary>
          <AccordionDetails>
            {beneficiaires.map(beneficiaire => (
              <Beneficiaire
                key={beneficiaire.id_beneficiaire}
                beneficiaire={beneficiaire}
              />
            ))}
          </AccordionDetails>
        </Accordion>
        <Accordion>
          <AccordionSummary expandIcon={<ExpandMore />}>
            <Typography variant='h6'>Exploitations :</Typography>
          </AccordionSummary>
          <AccordionDetails>
            {orderedExploitations.map(exploitation => (
              <Exploitation
                key={exploitation.id_exploitation}
                exploitation={exploitation}
                beneficiaires={beneficiaires}
              />
            ))}
          </AccordionDetails>
        </Accordion>
      </DialogContent>
      <DialogActions>
        <Button variant='contained' onClick={() => setIsDialogOpen(false)}>Fermer</Button>
      </DialogActions>
    </Dialog>
  )
}

export default PointDetails
