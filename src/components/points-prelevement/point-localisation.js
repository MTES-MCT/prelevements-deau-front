import Map from '@/components/map/index.js'

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
    const [lon, lat] = hasCoordinates ? coordinates : []

    return (
        <>
            <ul>
                {hasCoordinates && (
                    <LabelValue label='Coordonnées'>
                        <i>{lat}, {lon}</i>
                        {geoportailUrl && (
                            <>
                                {' '}
                                (
                                <a
                                    href={geoportailUrl}
                                    target='_blank'
                                    rel='noopener noreferrer'
                                >
                                    voir sur Géoportail
                                </a>
                                )
                            </>
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
