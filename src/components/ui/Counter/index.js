import {Paper, Typography} from '@mui/material'

const Counter = ({label, number}) => (
  <Paper
    elevation={3}
    sx={{
      margin: '15px',
      padding: '15px',
      maxWidth: '450px',
      border: '1px solid lightgrey',
      borderRadius: '5px'
    }}
  >
    <Typography variant='h6'>
      {label}
    </Typography>
    <Typography variant='h2'>
      {number}
    </Typography>
  </Paper>
)

export default Counter
