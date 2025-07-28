import {
  useCallback, useEffect, useRef, useState
} from 'react'

import Button from '@codegouvfr/react-dsfr/Button'
import {Card} from '@mui/material'
import {Box} from '@mui/system'

import DeclarationFileDetails from '@/components/declarations/dossier/prelevements/declaration-file-details.js'
import PrelevementsAccordion from '@/components/declarations/dossier/prelevements/prelevements-accordion.js'
import FileValidationErrors from '@/components/declarations/file-validation-errors.js'

const FileValidationResult = ({
  storageKey,
  fileName,
  typePrelevement,
  pointsPrelevement,
  data,
  errors = [],
  scrollIntoView,
  downloadFile
}) => {
  const [selectedPointId, setSelectedPointId] = useState(null)
  const pointRefs = useRef({})

  const hasError = errors.some(({severity}) => severity === 'error')
  const hasWarning = errors.some(({severity}) => severity === 'warning')
  const status = hasError ? 'error' : (hasWarning ? 'warning' : 'success')
  const subtitle = hasError
    ? `Le fichier contient ${errors.length} erreur${errors.length > 1 ? 's' : ''}`
    : (hasWarning
      ? `Le fichier contient ${errors.length} avertissement${errors.length > 1 ? 's' : ''}`
      : 'Le fichier est valide'
    )

  const handleSelectPoint = useCallback(pointId => {
    setSelectedPointId(prevPoint => prevPoint === pointId ? null : pointId)
  }, [])

  useEffect(() => {
    if (scrollIntoView) {
      setSelectedPointId(scrollIntoView)
      setTimeout(() => {
        const pointRef = pointRefs.current[scrollIntoView]
        if (pointRef) {
          pointRef.scrollIntoView({behavior: 'smooth', block: 'center'})
        }
      }, 0)
    }
  }, [scrollIntoView])

  return (
    <Box className='flex flex-col gap-4'>
      <Card variant='outlined'>
        <div className={`flex justify-between gap-2 sm:flex-wrap fr-alert ${`fr-alert--${status}`}`}>
          <div>
            <h3 className='fr-alert__title'>{fileName}</h3>
            <p>{subtitle}</p>
          </div>

          {downloadFile && storageKey && (
            <Button
              priority='tertiary no outline'
              iconId='fr-icon-download-line'
              onClick={() => downloadFile(storageKey)}
            />
          )}
        </div>

        {errors.length > 0 && !data && (
          <FileValidationErrors errors={errors} />
        )}

        {data && (
          <div className='mt-1'>
            {data.map(d => {
              const poinPrelevementId = d?.pointPrelevement || pointsPrelevement[0]

              return (
                <div
                  key={d.pointPrelevement}
                  ref={element => {
                    pointRefs.current[poinPrelevementId] = element
                  }}
                >
                  <PrelevementsAccordion
                    isOpen={selectedPointId === poinPrelevementId}
                    idPoint={d.pointPrelevement}
                    pointPrelevement={pointsPrelevement.find(p => p.id_point === d.pointPrelevement)}
                    volumePreleveTotal={d.volumePreleveTotal}
                    status={status}
                    handleSelect={() => handleSelectPoint(poinPrelevementId)}
                  >
                    <DeclarationFileDetails
                      data={d}
                      typePrelevement={typePrelevement}
                    />

                    {errors && (
                      <FileValidationErrors errors={errors} />
                    )}
                  </PrelevementsAccordion>
                </div>
              )
            })}
          </div>
        )}
      </Card>
    </Box>
  )
}

export default FileValidationResult
