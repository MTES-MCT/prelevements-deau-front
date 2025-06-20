import ChevronRight from '@mui/icons-material/ChevronRight'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import {
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Typography
} from '@mui/material'

const AccordionCentered = ({isExpanded, setIsExpanded, label, children}) => (
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
          {isExpanded ? `Masquer ${label}` : `Afficher ${label}`}
          {isExpanded ? <ExpandMoreIcon /> : <ChevronRight />}
        </Typography>
      </AccordionSummary>
      <AccordionDetails>
        {children}
      </AccordionDetails>
    </Accordion>
  </div>
)

export default AccordionCentered
