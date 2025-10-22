import {
  useCallback, useEffect, useMemo, useRef, useState
} from 'react'

import Button from '@codegouvfr/react-dsfr/Button'
import Notice from '@codegouvfr/react-dsfr/Notice'
import {Card} from '@mui/material'
import {Box} from '@mui/system'

import DeclarationFileDetails from '../dossier/prelevements/declaration-file-details.js'

import PrelevementsAccordion from '@/components/declarations/dossier/prelevements/prelevements-accordion.js'
import FileValidationErrors from '@/components/declarations/file-validation-errors.js'
import {normalizePointId} from '@/utils/point-prelevement.js'

const findPointById = (points = [], pointId) => {
  if (pointId === null || pointId === undefined) {
    return null
  }

  return points.find(point => (
    point.id_point === pointId
    || String(point.id_point) === String(pointId)
  )) || null
}

const FileValidationResult = ({
  attachmentId,
  fileName,
  typePrelevement,
  pointsPrelevement = [],
  series = [],
  integrations = [],
  validationStatus,
  errors = [],
  totalVolumePreleve,
  scrollIntoView,
  downloadFile,
  getSeriesValues
}) => {
  const [selectedAccordionId, setSelectedAccordionId] = useState(null)
  const pointRefs = useRef({})

  const hasError = validationStatus === 'error' || errors.some(({severity}) => severity === 'error')
  const hasWarning = validationStatus === 'warning' || errors.some(({severity}) => severity === 'warning')
  const status = hasError ? 'error' : (hasWarning ? 'warning' : 'success')
  const subtitle = hasError
    ? `Le fichier contient ${errors.length} erreur${errors.length > 1 ? 's' : ''}`
    : (hasWarning
      ? `Le fichier contient ${errors.length} avertissement${errors.length > 1 ? 's' : ''}`
      : 'Le fichier est valide'
    )

  const handleSelectAccordion = useCallback(accordionId => {
    setSelectedAccordionId(prevPoint => prevPoint === accordionId ? null : accordionId)
  }, [])

  const pointSections = useMemo(() => {
    const sectionsOrder = []
    const sectionsMap = new Map()

    const ensureSection = rawPointId => {
      const normalizedId = normalizePointId(rawPointId)

      if (!sectionsMap.has(normalizedId)) {
        sectionsMap.set(normalizedId, {
          pointId: normalizedId,
          rawPointId,
          series: [],
          pointPrelevement: undefined
        })
        sectionsOrder.push(normalizedId)
      }

      return sectionsMap.get(normalizedId)
    }

    for (const integration of integrations) {
      const section = ensureSection(integration.pointInfo?.id_point)
      if (integration.pointInfo) {
        section.pointPrelevement ??= integration.pointInfo
      }
    }

    for (const serie of series) {
      const section = ensureSection(serie.pointPrelevement)
      section.series.push(serie)
    }

    return sectionsOrder.map((sectionKey, index) => {
      const section = sectionsMap.get(sectionKey)
      const pointInfo = section.pointPrelevement || findPointById(pointsPrelevement, section.pointId)

      const accordionId = section.pointId ?? `unknown-point-${index + 1}`

      return {
        ...section,
        pointPrelevement: pointInfo || null,
        accordionId
      }
    })
  }, [integrations, series, pointsPrelevement])

  useEffect(() => {
    if (scrollIntoView) {
      const targetSection = pointSections.find(section => section.pointId === scrollIntoView || section.accordionId === scrollIntoView)

      if (targetSection) {
        setSelectedAccordionId(targetSection.accordionId)
        setTimeout(() => {
          const pointRef = pointRefs.current[targetSection.accordionId]
          if (pointRef) {
            pointRef.scrollIntoView({behavior: 'smooth', block: 'center'})
          }
        }, 0)
      }
    }
  }, [scrollIntoView, pointSections])

  const hasDataToDisplay = pointSections.length > 0

  return (
    <Box className='flex flex-col gap-4'>
      <Card variant='outlined'>
        <div className={`flex justify-between gap-2 sm:flex-wrap fr-alert ${`fr-alert--${status}`}`}>
          <div>
            <h3 className='fr-alert__title'>{fileName}</h3>
            <p>{subtitle}</p>
          </div>

          {downloadFile && attachmentId && (
            <Button
              priority='tertiary no outline'
              iconId='fr-icon-download-line'
              onClick={() => downloadFile(attachmentId)}
            />
          )}
        </div>

        {errors.length > 0 && !hasDataToDisplay && (
          <FileValidationErrors errors={errors} />
        )}

        <div className='mt-1'>
          {hasDataToDisplay ? (
            pointSections.map(section => (
              <div
                key={section.accordionId}
                ref={element => {
                  pointRefs.current[section.accordionId] = element
                }}
              >
                <PrelevementsAccordion
                  isOpen={selectedAccordionId === section.accordionId}
                  idPoint={section.pointId}
                  pointPrelevement={section.pointPrelevement}
                  volumePreleveTotal={totalVolumePreleve}
                  status={status}
                  handleSelect={() => handleSelectAccordion(section.accordionId)}
                >
                  <DeclarationFileDetails
                    pointId={section.pointId}
                    series={section.series}
                    typePrelevement={typePrelevement}
                    getSeriesValues={getSeriesValues}
                  />

                  {errors.length > 0 && (
                    <FileValidationErrors errors={errors} />
                  )}
                </PrelevementsAccordion>
              </div>
            ))
          ) : (
            <div key='no-data'>
              <Notice
                small
                severity='alert'
                title='Aucune donnée'
                description='n’a été trouvée dans le fichier.'
              />

              {errors.length > 0 && (
                <FileValidationErrors errors={errors} />
              )}
            </div>
          )}
        </div>
      </Card>
    </Box>
  )
}

export default FileValidationResult
