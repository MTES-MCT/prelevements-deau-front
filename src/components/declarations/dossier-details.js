'use client'

import {
  useCallback, useEffect, useState, useRef,
  useMemo
} from 'react'

import {Box} from '@mui/material'

import {getDownloadableFile} from '@/app/api/dossiers.js'
import {getPointPrelevement} from '@/app/api/points-prelevement.js'
import DossierInfos from '@/components/declarations/dossier/infos.js'
import MandataireDetails from '@/components/declarations/dossier/mandataire-details.js'
import PointsPrelevementDetails from '@/components/declarations/dossier/points-prelevement-details.js'
import PrelevementsDetails from '@/components/declarations/dossier/prelevements-details.js'
import PreleveurDetails from '@/components/declarations/dossier/preleveur-details.js'

const DossierDetails = ({dossier, preleveur, files, idPoints}) => {
  const [pointsPrelevement, setPointsPrelevement] = useState(null)
  const [selectedPointId, setSelectedPointId] = useState(idPoints.length === 1 ? idPoints[0] : null)

  const listRefs = useRef({})

  useEffect(() => {
    const fetchPointsPrelevement = async () => {
      const points = await Promise.all(idPoints.map(idPoint => getPointPrelevement(idPoint)))
      setPointsPrelevement(points.filter(point => point._id)) // Filtre 404 not found
    }

    if (idPoints.length > 0) {
      fetchPointsPrelevement()
    } else {
      setPointsPrelevement([])
    }
  }, [idPoints])

  const downloadFile = async storageKey => {
    const [hash, filename] = storageKey.split('-')
    try {
      const file = await getDownloadableFile(dossier._id, hash)
      const url = URL.createObjectURL(file)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      a.click()
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Failed to download file', error)
    }
  }

  const onClickPointPrelevementMarker = useCallback(id => {
    setSelectedPointId(id)
    const ref = listRefs.current[id]
    if (ref) {
      ref.scrollIntoView({behavior: 'smooth', block: 'start'})
    }
  }, [])

  // Compute disabled points (no available prélèvement)
  const pointIdsWithNoPrelevement = useMemo(() => {
    if (files && files.length > 0) {
      // Compute disabled points (no available prélèvement)
      const filePointIds = files?.flatMap(file => file.pointsPrelevements) || []
      const uniqueFilePointIds = new Set(new Set(filePointIds))
      return idPoints.filter(id => !uniqueFilePointIds.has(id))
    }

    return []
  }, [files, idPoints])

  return (
    <Box className='flex flex-col gap-2 mb-4'>
      <DossierInfos
        numeroArreteAot={dossier.numeroArreteAot}
        typePrelevement={dossier.typePrelevement}
        typeDonnees={dossier.typeDonnees}
        commentaires={dossier.commentaires}
      />

      <div className='flex flex-wrap gap-2'>
        {(dossier.demandeur || preleveur) && (
          <PreleveurDetails preleveur={preleveur || dossier.demandeur} />
        )}
        {dossier.declarant && dossier.declarant.type !== 'particulier' && (
          <MandataireDetails mandataire={dossier.declarant} />
        )}
      </div>

      <PointsPrelevementDetails
        pointsPrelevementId={idPoints}
        pointsPrelevement={pointsPrelevement}
        handleClick={onClickPointPrelevementMarker}
        disabledPointIds={pointIdsWithNoPrelevement}
      />

      <PrelevementsDetails
        tableauSuiviPrelevements={dossier.tableauSuiviPrelevements}
        pointsPrelevementId={idPoints}
        pointsPrelevement={pointsPrelevement}
        selectedPointId={selectedPointId}
        relevesIndex={dossier.relevesIndex}
        volumesPompes={dossier.volumesPompes}
        files={files}
        compteur={dossier.compteur}
        selectedPoint={idPoint => setSelectedPointId(prev => prev === idPoint ? null : idPoint)}
        listRefs={listRefs}
        handleDownload={downloadFile}
      />
    </Box>
  )
}

export default DossierDetails
