import Map from '@/components/map/index.js'
import {formatCoordinateLabel, wgs84ToLambert93} from '@/lib/coordinates.js'

const getLambert93Label = coordinates => {
  const lambertCoordinates = wgs84ToLambert93(coordinates)

  if (!lambertCoordinates) {
    return null
  }

  const [x, y] = lambertCoordinates

  return `X ${formatCoordinateLabel(x)} / Y ${formatCoordinateLabel(y)}`
}

const LabelValue = ({label, value, children}) => {
  if (!value && !children) {
    return null
  }

  return (
    <li className='ml-5'>
      <b>{label} : </b>
      {value ? <i>{value}</i> : children}
    </li>
  )
}

const getGeoportailUrl = coordinates => {
  if (!Array.isArray(coordinates) || coordinates.length !== 2) {
    return null
  }

  const [lon, lat] = coordinates

  const params = new URLSearchParams({
    c: `${lon},${lat}`,
    z: '15',
    l0: 'GEOGRAPHICALGRIDSYSTEMS.MAPS::GEOPORTAIL:OGC:WMTS(1)',
    permalink: 'yes'
  })

  return `https://www.geoportail.gouv.fr/carte?${params.toString()}`
}

const surfaceFields = [
  {key: 'watershed', label: 'Bassin versant'},
  {key: 'underWatershed', label: 'Sous-bassin versant'},
  {key: 'resourceName', label: 'Ressource / cours d’eau'}
]

const groundwaterFields = [
  {key: 'managementUnit', label: 'Unité de gestion des volumes prélevables'},
  {key: 'managementSubUnit', label: 'Sous-unité de gestion des volumes prélevables'},
  {key: 'aquiferName', label: 'Nappe'}
]

const codeFields = [
  {key: 'codeEUMasseDEau', label: 'Code masse d’eau (EU)'},
  {key: 'codeSISEAUX', label: 'Code SISEAUX'},
  {key: 'codeINSEE', label: 'Code INSEE'},
  {key: 'codeROE', label: 'Code ROE'},
  {key: 'codeBSS', label: 'Code BSS (Banque du Sous-Sol)'},
  {key: 'codePTP', label: 'Code point de prélèvement (PTP)'},
  {key: 'codeOPR', label: 'Code ouvrage de prélèvement (OPR)'},
  {key: 'codeBDLISA', label: 'Code BDLISA (entité hydrogéologique)'},
  {key: 'codeAIOT', label: 'Code AIOT'},
  {key: 'codeBDCarthage', label: 'Code BD Carthage (hydrographie)'},
  {key: 'codeBDTopage', label: 'Code BD Topage'},
  {key: 'codeSISPEA', label: 'Code SISPEA (collectivité)'},
  {key: 'codeBNPE', label: 'Code BNPE'},
  {key: 'codeMESO', label: 'Code MESO'},
  {key: 'codeMEContinentalesBV', label: 'Code masse d’eau de surface continentale'}
]

const hasAnyValue = (point, fields) => fields.some(({key}) => point[key])

const PointLocalisation = ({pointPrelevement}) => {
  const coordinates = pointPrelevement.coordinates?.coordinates
  const geoportailUrl = getGeoportailUrl(coordinates)

  const hasCoordinates = Array.isArray(coordinates) && coordinates.length === 2

  return (
    <>
      <ul>
        {hasCoordinates && (
          <LabelValue label='Coordonnées'>
            <i>{getLambert93Label(coordinates)}</i>
            {geoportailUrl && (
              <span>
                { ' ('}
                <a
                  href={geoportailUrl}
                  target='_blank'
                  rel='noopener noreferrer'
                >
                  voir sur Géoportail
                </a>
                { ')' }
              </span>
            )}
          </LabelValue>
        )}

        <LabelValue label='Commune' value={pointPrelevement.communeName} />
        <LabelValue label='Code commune' value={pointPrelevement.communeCode} />

        {hasAnyValue(pointPrelevement, surfaceFields) && (
          <li className='ml-5 list-none mt-3'>
            <b>Eaux superficielles</b>
            <ul>
              {surfaceFields.map(({key, label}) => (
                <LabelValue
                  key={key}
                  label={label}
                  value={pointPrelevement[key]}
                />
              ))}
            </ul>
          </li>
        )}

        {hasAnyValue(pointPrelevement, groundwaterFields) && (
          <li className='ml-5 list-none mt-3'>
            <b>Eaux souterraines</b>
            <ul>
              {groundwaterFields.map(({key, label}) => (
                <LabelValue
                  key={key}
                  label={label}
                  value={pointPrelevement[key]}
                />
              ))}
            </ul>
          </li>
        )}

        {codeFields.map(({key, label}) => (
          <LabelValue
            key={key}
            label={label}
            value={pointPrelevement[key]}
          />
        ))}
      </ul>

      {hasCoordinates && (
        <div className='h-[360px]'>
          <Map
            showLabels={false}
            points={[pointPrelevement]}
            filteredPoints={[pointPrelevement]}
            selectedPoint={pointPrelevement}
          />
        </div>
      )}
    </>
  )
}

export default PointLocalisation
