import {useState} from 'react'

import {Select} from '@codegouvfr/react-dsfr/Select'
import {
  useTheme
} from '@mui/material'
import {alpha} from '@mui/material/styles'
import {useRouter, useSearchParams} from 'next/navigation.js'

import Map from '@/components/map/index.js'
import Legend from '@/components/map/legend.js'
import useEvent from '@/hook/use-event.js'
import {getPointPrelevementURL} from '@/lib/urls.js'

export const RichMap = ({points, filteredPoints}) => {
  const theme = useTheme()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [style, setStyle] = useState('plan-ign')

  const selectedPointId = searchParams.get('point-prelevement')

  // Gestion de la sélection d'un point sur la carte
  const handleSelectedPoint = useEvent(point => {
    router.push(getPointPrelevementURL(point))
  })

  return (
    <>
      <Map
        points={points}
        filteredPoints={filteredPoints}
        selectedPoint={selectedPointId ? points.find(point => selectedPointId === point.id_point) : null}
        handleSelectedPoint={handleSelectedPoint}
        style={style}
        setStyle={setStyle}
      />
      <div className='absolute top-2 left-2 p-4'
        style={{
          backgroundColor: alpha(theme.palette.background.default, 0.85)
        }}
      >
        <Select
          label=''
          nativeSelectProps={{
            onChange: e => setStyle(e.target.value),
            value: style
          }}
        >
          <option value='vector'>Plan OpenMapTiles</option>
          <option value='plan-ign'>Plan IGN</option>
          <option value='photo'>Photographie aérienne</option>
          <option value='vector-ign'>IGN vectoriel</option>
        </Select>
      </div>
      <Legend />
    </>
  )
}
