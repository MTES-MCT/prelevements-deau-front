import {Box, Typography} from '@mui/material'

import Map from '@/components/map/index.js'

const LabelValue = ({label, value}) => {
  if (value) {
    return (
      <li className='ml-5'>
        <b>{label} : </b>
        <i>{value}</i>
      </li>
    )
  }
}

const PointLocalisation = ({pointPrelevement}) =>
  (
    <>
      <div>
        <Typography
          gutterBottom
          variant='h5'
        >
          {pointPrelevement.commune.nom} - {pointPrelevement.commune.code}
        </Typography>
        <LabelValue label='Détails de localisation' value={pointPrelevement.detail_localisation} />
        <LabelValue label='Précision géométrique' value={pointPrelevement.precision_geom} />
        {pointPrelevement.type_milieu === 'Eau souterraine' && (
          <>
            {pointPrelevement.profondeur && (
              <Box>
                <b>Profondeur : </b>
                <i>{pointPrelevement.profondeur} m</i>
              </Box>
            )}
            {pointPrelevement.meso && (
              <Box>
                <b>Masse d’eau souterraine (DCE) : </b>
                <span>{pointPrelevement.meso.code} - {pointPrelevement.meso.nom}</span>
              </Box>
            )}
            <LabelValue label='Zone de répartition des eaux' value={pointPrelevement.zre ? 'oui' : null} />
          </>
        )}
        {pointPrelevement.type_milieu === 'Eau de surface' && (
          <>
            {pointPrelevement.meContinentalesBv && (
              <Box>
                <b>Masse d’eau cours d’eau (DCE) : </b>
                <span>{pointPrelevement.meContinentalesBv.code} - {pointPrelevement.meContinentalesBv.nom}</span>
              </Box>
            )}
            <LabelValue label='Cours d’eau (BD Carthage)' value={pointPrelevement.bvBdCarthage?.nom} />
            <LabelValue label='Cours d’eau indiqué dans l’autorisation' value={pointPrelevement.cours_eau} />
            <LabelValue label='Autres noms' value={pointPrelevement.autresNoms} />
            <LabelValue label='Zone de répartition des eaux' value={pointPrelevement.zre ? 'oui' : null} />
            <LabelValue label='Réservoir biologique' value={pointPrelevement.reservoir_biologique ? 'oui' : null} />
          </>
        )}
      </div>
      <div className='h-[360px]'>
        <Map
          showLabels={false}
          points={[pointPrelevement]}
          filteredPoints={[pointPrelevement]}
          selectedPoint={pointPrelevement}
        />
      </div>
    </>
  )

export default PointLocalisation
