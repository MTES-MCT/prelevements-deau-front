import proj4 from 'proj4'

import Map from '@/components/map/index.js'

const wgs84Projection = 'EPSG:4326'
const lambert93Projection = 'EPSG:2154'

proj4.defs(
  wgs84Projection,
  '+proj=longlat +datum=WGS84 +no_defs +type=crs'
)

proj4.defs(
  lambert93Projection,
  '+proj=lcc +lat_0=46.5 +lon_0=3 +lat_1=49 +lat_2=44 +x_0=700000 +y_0=6600000 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs +type=crs'
)

const formatCoordinate = value => new Intl.NumberFormat('fr-FR', {
  maximumFractionDigits: 3
}).format(value)

const getLambert93Label = coordinates => {
  const [x, y] = proj4(wgs84Projection, lambert93Projection, coordinates)

  return `X ${formatCoordinate(x)} / Y ${formatCoordinate(y)}`
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

const codeFields = [
  {key: 'codeEUMasseDEau', label: 'Code masse d’eau (EU)'},
  {key: 'codePTP', label: 'Code point de prélèvement (PTP)'},
  {key: 'codeOPR', label: 'Code ouvrage de prélèvement (OPR)'},
  {key: 'codeBDLISA', label: 'Code BDLISA (entité hydrogéologique)'},
  {key: 'codeBSS', label: 'Code BSS (Banque du Sous-Sol)'},
  {key: 'codeAIOT', label: 'Code AIOT'},
  {key: 'codeBDCarthage', label: 'Code BD Carthage (hydrographie)'},
  {key: 'codeBDTopage', label: 'Code BD Topage'},
  {key: 'codeSISPEA', label: 'Code SISPEA (collectivité)'}
]

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
