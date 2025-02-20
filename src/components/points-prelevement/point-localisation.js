import {Box, Chip, Typography} from '@mui/material'

const LabelValue = ({label, value}) => {
  if (value) {
    return (
      <Box>
        <b>{label} : </b>
        <i>{value}</i>
      </Box>
    )
  }
}

const PointLocalistation = ({pointPrelevement}) => (
  <Box sx={{m: 2, p: 3}}>
    <Typography
      gutterBottom
      variant='h3'
    >
      {pointPrelevement.libelleCommune} - {pointPrelevement.insee_com}
    </Typography>
    <LabelValue label='Détails de localisation' value={pointPrelevement.detail_localisation} />
    <LabelValue label='Précision géométrique' value={pointPrelevement.precision_geom} />
    <LabelValue label='Type de milieu' value={pointPrelevement.type_milieu} />
    <Box><b>Type de milieu :</b> <Chip label={pointPrelevement.type_milieu} /></Box>
    {pointPrelevement.type_milieu === 'Eau souterraine' && (
      <>
        <LabelValue label='Profondeur' value={pointPrelevement.profondeur} />
        <LabelValue label='Meso' value={pointPrelevement.code_meso} />
      </>
    )}
    {pointPrelevement.type_milieu === 'Eau de surface' && (
      <>
        <LabelValue label='Code bdCarthage' value={pointPrelevement.code_bv_bdcarthage} />
        <LabelValue label='Code me continental' value={pointPrelevement.code_me_continental_bv} />
        <LabelValue label='Cours d’eau' value={pointPrelevement.cours_eau} />
        <LabelValue label='ZRE' value={pointPrelevement.zre} />
        <LabelValue label='Réservoir biologique' value={pointPrelevement.reservoir_bio} />
      </>
    )}
  </Box>
)

export default PointLocalistation
