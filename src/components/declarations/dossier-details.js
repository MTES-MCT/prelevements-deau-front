'use client'

import {
  useCallback, useEffect, useState, useRef,
  useMemo
} from 'react'

import {Box} from '@mui/material'
import {sumBy} from 'lodash'

import {getFileBlob} from '@/app/api/dossiers.js'
import {getPointPrelevement} from '@/app/api/points-prelevement.js'
import DossierInfos from '@/components/declarations/dossier/infos.js'
import MandataireDetails from '@/components/declarations/dossier/mandataire-details.js'
import PointsPrelevementDetails from '@/components/declarations/dossier/points-prelevement-details.js'
import PrelevementsDetails from '@/components/declarations/dossier/prelevements-details.js'
import PreleveurDetails from '@/components/declarations/dossier/preleveur-details.js'

function getVolumePrelevementTotal(dossier, files) {
  const {relevesIndex, volumesPompes} = dossier

  // 1. Priorité aux fichiers si présents
  if (files?.length) {
    return sumBy(files, f => f.result?.data?.volumePreleveTotal ?? 0)
  }

  // 2. Sinon, on regarde les relevés index
  if (relevesIndex?.length) {
    return sumBy(relevesIndex, r => r.valeur ?? 0)
  }

  // 3. Enfin, on se rabat sur les volumes pompés
  if (volumesPompes?.length) {
    return sumBy(volumesPompes, v => v.volumePompeM3 ?? 0)
  }

  // 4. Aucune donnée disponible
  return null
}

const DossierDetails = ({dossier, preleveur, files, idPoints}) => {
  const [pointsPrelevement, setPointsPrelevement] = useState(null)
  const [selectedPointId, setSelectedPointId] = useState(idPoints.length === 1 ? idPoints[0] : null)

  const listRefs = useRef({})

  useEffect(() => {
    const fetchPointsPrelevement = async () => {
      const points = await Promise.all(idPoints.map(idPoint => getPointPrelevement(idPoint)))
      setPointsPrelevement(points.filter(Boolean)) // Filtre 404 not found
    }

    if (idPoints.length > 0) {
      fetchPointsPrelevement()
    } else {
      setPointsPrelevement([])
    }
  }, [idPoints])

  const downloadFile = async storageKey => {
    const [hash, ...filenameParts] = storageKey.split('-')
    const filename = filenameParts.join('-')
    try {
      const file = await getFileBlob(dossier._id, hash)
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

  const volumePrelevementTotal = useMemo(() => getVolumePrelevementTotal(dossier, files), [dossier, files])

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
        volumePrelevementTotal={volumePrelevementTotal}
        handleClick={onClickPointPrelevementMarker}
        disabledPointIds={pointIdsWithNoPrelevement}
      />

      <PrelevementsDetails
        volumePrelevementTotal={volumePrelevementTotal}
        moisDeclaration={dossier.moisDeclaration}
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
