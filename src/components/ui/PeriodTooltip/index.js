import {useState, useId} from 'react'

import {Popover, Typography, Box} from '@mui/material'
import {uniqBy} from 'lodash-es'

import CompactAlert from '@/components/ui/CompactAlert/index.js'
import MetasList from '@/components/ui/MetasList/index.js'

const PeriodTooltip = ({periodLabel, parameters, alerts, children}) => {
  const [anchorEl, setAnchorEl] = useState(null)
  const popoverId = useId()

  const handlePopoverOpen = event => setAnchorEl(event.currentTarget)
  const handlePopoverClose = () => setAnchorEl(null)
  const open = Boolean(anchorEl)

  return (
    <>
      <span
        style={{display: 'inline-block'}}
        onMouseEnter={handlePopoverOpen}
        onMouseLeave={handlePopoverClose}
      >
        {children}
      </span>
      <Popover
        disableRestoreFocus
        id={popoverId}
        sx={{
          pointerEvents: 'none',
          '& .MuiPaper-root:focus': {outline: 'none'}
        }}
        open={open}
        anchorEl={anchorEl}
        anchorOrigin={{vertical: 'top', horizontal: 'center'}}
        transformOrigin={{vertical: 'bottom', horizontal: 'center'}}
        onClose={handlePopoverClose}
      >
        <Box sx={{
          p: 1, display: 'flex', flexDirection: 'column', gap: 1
        }}
        >
          <Typography sx={{fontWeight: 'bold'}}>{periodLabel}</Typography>
          <Box sx={{display: 'flex', flexDirection: 'column', gap: 2}}>
            {parameters?.length && <MetasList metas={parameters} />}

            {alerts?.length && (
              <Box>
                {uniqBy(alerts, 'alertLabel').map(alert => (
                  <CompactAlert
                    key={alert.alertLabel}
                    label={alert.alertLabel}
                    alertType={alert.alertType}
                  />
                ))}
              </Box>
            )}
          </Box>
        </Box>
      </Popover>
    </>
  )
}

export default PeriodTooltip
