import {useState} from 'react'

import {fr} from '@codegouvfr/react-dsfr'
import {useTheme} from '@mui/material'
import {alpha} from '@mui/material/styles'

import {legendColors} from './legend-colors.js'

const Legend = () => {
  const {usages} = legendColors
  const theme = useTheme()
  const [isOpen, setIsOpen] = useState(true)

  return (
    <div className='absolute bottom-2 left-2 p-2 text-xs'
      style={{
        backgroundColor: alpha(theme.palette.background.default, 0.85)
      }}
    >
      <button type='button' className={`flex items-center gap-1${isOpen ? ' absolute top-1 right-1' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
      >
        {isOpen
          ? <span className='fr-icon-close-circle-line fr-icon--sm' style={{color: fr.colors.decisions.text.actionHigh.blueFrance.default}} />
          : <>
            <span className='fr-icon-add-circle-line fr-icon--sm' style={{color: fr.colors.decisions.text.actionHigh.blueFrance.default}} />Légende
          </>}
      </button>
      {isOpen && (
        <ul className='p-2'>
          {usages.map(usage => (
            <li key={usage.text} className='flex gap-2'>
              <div style={{background: usage.color}} className='size-4 rounded' />{usage.text}
            </li>
          ))}
        </ul>
      )}

    </div>
  )
}

export default Legend
