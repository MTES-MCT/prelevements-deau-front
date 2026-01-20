import {
  useCallback, useEffect, useMemo, useRef, useState
} from 'react'

import Button from '@codegouvfr/react-dsfr/Button'
import Notice from '@codegouvfr/react-dsfr/Notice'
import {Card} from '@mui/material'
import {Box} from '@mui/system'
import {orderBy} from 'lodash-es'

import DeclarationFileDetails from '../dossier/prelevements/declaration-file-details.js'

import PrelevementsAccordion from '@/components/declarations/dossier/prelevements/prelevements-accordion.js'
import FileValidationErrors from '@/components/declarations/file-validation-errors.js'
import {normalizePointId, getPointPrelevementName} from '@/utils/point-prelevement.js'
import {coerceNumericValue} from '@/utils/number.js'
import {normalizeString} from '@/utils/string.js'

const findPointById = (points = [], pointId) => {
  if (pointId === null || pointId === undefined) {
    return null
  }

  return points.find(point => (
    point.id_point === pointId
    || String(point.id_point) === String(pointId)
    || point.id_point_de_prelevement_ou_rejet === pointId
    || String(point.id_point_de_prelevement_ou_rejet) === String(pointId)
    || point.id_point_de_prelevement === pointId
    || String(point.id_point_de_prelevement) === String(pointId)
  )) || null
}

const getPointSiret = point => {
  if (!point || typeof point !== 'object') {
    return null
  }

  return point.siret || point.siret_preleveur || null
}

const getPreleveurKey = (preleveur, index) => {
  if (!preleveur || typeof preleveur !== 'object') {
    return `preleveur-${index + 1}`
  }

  return preleveur.siret || preleveur.raison_sociale || `preleveur-${index + 1}`
}

const formatPreleveurLabel = preleveur => {
  if (!preleveur || typeof preleveur !== 'object') {
    return 'Préleveur inconnu'
  }

  const name = preleveur.raison_sociale || 'Préleveur'
  return preleveur.siret ? `${name} (${preleveur.siret})` : name
}

const isVolumePreleveParameter = parameter => {
  if (typeof parameter !== 'string') {
    return false
  }

  const normalized = normalizeString(parameter) ?? ''
  return normalized.includes('volume') && normalized.includes('prelev')
}

const isVolumeRejeteParameter = parameter => {
  if (typeof parameter !== 'string') {
    return false
  }

  const normalized = normalizeString(parameter) ?? ''
  return normalized.includes('volume') && normalized.includes('rejet')
}

const sumSeriesVolume = (series = [], getSeriesValues, predicate) => async () => {
  let total = 0
  let hasValue = false

  for (const serie of series) {
    if (typeof predicate === 'function' && !predicate(serie?.parameter)) {
      continue
    }

    const valuesResult = typeof getSeriesValues === 'function'
      ? await getSeriesValues(serie._id)
      : null
    const values = valuesResult?.values || serie?.data || []

    for (const entry of values) {
      const value = coerceNumericValue(entry?.value)
      if (value === null || value === undefined) {
        continue
      }

      total += value
      hasValue = true
    }
  }

  return hasValue ? total : null
}

const FileValidationResult = ({
  attachmentId,
  fileName,
  typePrelevement,
  pointsPrelevement = [],
  preleveurs = [],
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

    const sectionsWithOrder = sectionsOrder.map((sectionKey, index) => {
      const section = sectionsMap.get(sectionKey)
      const pointInfo = section.pointPrelevement || findPointById(pointsPrelevement, section.pointId)

      const accordionId = section.pointId ?? `unknown-point-${index + 1}`

      return {
        ...section,
        pointPrelevement: pointInfo || null,
        accordionId,
        orderIndex: index
      }
    })

    const sortedSections = orderBy(
      sectionsWithOrder,
      [
        section => String(getPointPrelevementName(section.pointPrelevement)).toLowerCase(),
        section => String(section.pointId ?? ''),
        section => section.orderIndex
      ],
      ['asc', 'asc', 'asc']
    )

    return sortedSections.map(({orderIndex, ...section}) => section)
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
  const [volumeByPoint, setVolumeByPoint] = useState(new Map())

  useEffect(() => {
    let cancelled = false
    const computeTotals = async () => {
      const nextMap = new Map()

      for (const section of pointSections) {
        const key = section.pointId ?? section.accordionId
        const computePreleve = sumSeriesVolume(section.series, getSeriesValues, isVolumePreleveParameter)
        const computeRejete = sumSeriesVolume(section.series, getSeriesValues, isVolumeRejeteParameter)
        const [totalPreleve, totalRejete] = await Promise.all([computePreleve(), computeRejete()])
        nextMap.set(key, {totalPreleve, totalRejete})
      }

      if (!cancelled) {
        setVolumeByPoint(nextMap)
      }
    }

    if (pointSections.length > 0) {
      computeTotals()
    } else {
      setVolumeByPoint(new Map())
    }

    return () => {
      cancelled = true
    }
  }, [pointSections, getSeriesValues])

  const preleveurSections = useMemo(() => {
    if (!Array.isArray(preleveurs) || preleveurs.length === 0) {
      return [{key: 'all', label: null, sections: pointSections}]
    }

    const preleveurMap = new Map()
    for (const [index, preleveur] of preleveurs.entries()) {
      const key = getPreleveurKey(preleveur, index)
      preleveurMap.set(key, {
        key,
        preleveur,
        label: formatPreleveurLabel(preleveur),
        sections: []
      })
    }

    const unknownKey = '__unknown__'
    preleveurMap.set(unknownKey, {
      key: unknownKey,
      preleveur: null,
      label: 'Préleveur inconnu',
      sections: []
    })
    for (const section of pointSections) {
      const siret = getPointSiret(section.pointPrelevement)
      const target = [...preleveurMap.values()].find(group => group.preleveur?.siret && group.preleveur.siret === siret)
      if (target) {
        target.sections.push(section)
      } else {
        preleveurMap.get(unknownKey).sections.push(section)
      }
    }

    const ordered = [...preleveurMap.values()].filter(group => group.sections.length > 0)
    return orderBy(
      ordered,
      [group => String(group.label ?? '').toLowerCase()],
      ['asc']
    )
  }, [preleveurs, pointSections])

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
            preleveurSections.map(group => (
              <div key={group.key} className='flex flex-col gap-2'>
                {group.label && (
                  <div className='rounded-md bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-700'>
                    {group.label}
                  </div>
                )}
                {group.sections.map(section => (
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
                      volumePreleveTotal={volumeByPoint.get(section.pointId ?? section.accordionId)?.totalPreleve ?? null}
                      volumeRejeteTotal={volumeByPoint.get(section.pointId ?? section.accordionId)?.totalRejete ?? null}
                      status={status}
                      typePrelevement={typePrelevement}
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
                ))}
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
