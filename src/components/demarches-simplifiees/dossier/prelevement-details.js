import {Colorize, Speed} from '@mui/icons-material'
import {
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper
} from '@mui/material'
import {format} from 'date-fns'

import PrelevementTypeBadge from '@/components/demarches-simplifiees/prelevement-type-badge.js'
import TypeSaisieBadge from '@/components/demarches-simplifiees/type-saisie-badge.js'
import LabelValue from '@/components/ui/label-value.js'

const PrelevementDetails = ({
  typePrelevement,
  typeDonnees,
  relevesIndex,
  volumesPompes,
  compteur
}) => (
  <Box className='mt-2'>
    <Typography gutterBottom variant='h6' className='flex items-center gap-1'>
      <Colorize />
      Prélèvement
    </Typography>
    <Box className='flex flex-col gap-2'>
      <LabelValue label='Type de prélèvement'>
        <PrelevementTypeBadge value={typePrelevement} />
      </LabelValue>

      <LabelValue label='Type de saisie'>
        <TypeSaisieBadge value={typeDonnees} />
      </LabelValue>
    </Box>

    {/* Section Données quantitatives */}
    {volumesPompes && volumesPompes.length > 0 && (
      <Box className='mt-4'>
        <Typography gutterBottom variant='h6'>
          Volumes prélevés
        </Typography>
        <Box className='mt-2'>
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Point de prélèvement</TableCell>
                  <TableCell>Date / Année</TableCell>
                  <TableCell align='right'>Volume (m³)</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {volumesPompes.map(row => (
                  <TableRow key={`${row.pointPrelevement}-${row.datePrelevement || row.anneePrelevement}-${row.volumePompeM3}`}>
                    <TableCell>{row.pointPrelevement}</TableCell>
                    <TableCell>{row.datePrelevement || row.anneePrelevement}</TableCell>
                    <TableCell align='right'>{row.volumePompeM3}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      </Box>
    )}

    {relevesIndex && relevesIndex.length > 0 && (
      <Box className='mt-4'>
        <Typography gutterBottom variant='h6'>
          Historique des relevés
        </Typography>
        <Box className='mt-2'>
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Date</TableCell>
                  <TableCell align='right'>Valeur</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {relevesIndex.map(row => (
                  <TableRow key={`releve-${row.date}-${row.valeur}`}>
                    <TableCell>{format(new Date(row.date), 'dd/MM/yyyy')}</TableCell>
                    <TableCell align='right'>{row.valeur}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      </Box>
    )}

    {/* Section Compteur */}
    {compteur && (
      <Box className='mt-4'>
        <Box className='flex align-center gap-1'>
          <Speed />
          <Typography gutterBottom variant='h6'>
            Compteur
          </Typography>
        </Box>
        <TableContainer component={Paper}>
          <Table>
            <TableBody>
              <TableRow>
                <TableCell><strong>Compteur volumétrique:</strong></TableCell>
                <TableCell>{compteur.compteurVolumetrique ? 'Oui' : 'Non'}</TableCell>
              </TableRow>
              {compteur.numeroSerie && (
                <TableRow>
                  <TableCell><strong>Numéro de série:</strong></TableCell>
                  <TableCell>{compteur.numeroSerie}</TableCell>
                </TableRow>
              )}
              {compteur.lectureDirecte !== undefined && (
                <TableRow>
                  <TableCell><strong>Lecture directe:</strong></TableCell>
                  <TableCell>{compteur.lectureDirecte ? 'Oui' : 'Non'}</TableCell>
                </TableRow>
              )}
              {compteur.signalementPanneOuChangement !== undefined && (
                <TableRow>
                  <TableCell><strong>Signalement panne/changement:</strong></TableCell>
                  <TableCell>{compteur.signalementPanneOuChangement ? 'Oui' : 'Non'}</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>
    )}
  </Box>
)

export default PrelevementDetails
