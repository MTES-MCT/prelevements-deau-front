/* eslint-disable no-await-in-loop */
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
import {coerceNumericValue} from '@/utils/number.js'
import {normalizePointId, getPointPrelevementName} from '@/utils/point-prelevement.js'
import {normalizeString} from '@/utils/string.js'
import {getPreleveurTitle} from "@/lib/preleveurs.js";

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

  return preleveur.siret || preleveur.socialReason || `preleveur-${index + 1}`
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

const PRELEVEUR_PAGE_SIZE = 10

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
  const [currentPage, setCurrentPage] = useState(1)
  const preleveurIndex = useMemo(() => {
    if (!Array.isArray(preleveurs) || preleveurs.length === 0) {
      return null
    }

    const bySiret = new Map()
    for (const [index, preleveur] of preleveurs.entries()) {
      if (!preleveur?.siret) {
        continue
      }

      bySiret.set(preleveur.siret, {
        key: getPreleveurKey(preleveur, index),
        preleveur,
        label: getPreleveurTitle(preleveur)
      })
    }

    return {
      bySiret,
      unknown: {
        key: '__unknown__',
        preleveur: null,
        label: 'Préleveur inconnu'
      }
    }
  }, [preleveurs])

  const preleveurSections = useMemo(() => {
    if (!preleveurIndex) {
      return [{key: 'all', label: null, sections: pointSections}]
    }

    const grouped = new Map()

    for (const section of pointSections) {
      const siret = getPointSiret(section.pointPrelevement)
      const info = siret ? preleveurIndex.bySiret.get(siret) : null
      const target = info ?? preleveurIndex.unknown
      if (!grouped.has(target.key)) {
        grouped.set(target.key, {...target, sections: []})
      }

      grouped.get(target.key).sections.push(section)
    }

    const ordered = [...grouped.values()]
    return orderBy(
      ordered,
      [group => String(group.label ?? '').toLowerCase()],
      ['asc']
    )
  }, [preleveurIndex, pointSections])

  const totalPages = Math.max(1, Math.ceil(preleveurSections.length / PRELEVEUR_PAGE_SIZE))
  const safePage = Math.min(currentPage, totalPages)
  const visiblePreleveurSections = useMemo(() => {
    const startIndex = (safePage - 1) * PRELEVEUR_PAGE_SIZE
    return preleveurSections.slice(startIndex, startIndex + PRELEVEUR_PAGE_SIZE)
  }, [preleveurSections, safePage])
  const visiblePointSections = useMemo(() => (
    visiblePreleveurSections.flatMap(group => group.sections)
  ), [visiblePreleveurSections])
  const [volumeByPoint, setVolumeByPoint] = useState(new Map())

  const volumeCacheRef = useRef(new Map())

  useEffect(() => {
    volumeCacheRef.current = new Map()
    setVolumeByPoint(new Map())
  }, [pointSections])

  useEffect(() => {
    let cancelled = false
    const computeTotals = async () => {
      const nextCache = new Map(volumeCacheRef.current)

      for (const section of visiblePointSections) {
        const key = section.pointId ?? section.accordionId
        if (nextCache.has(key)) {
          continue
        }

        const computePreleve = sumSeriesVolume(section.series, getSeriesValues, isVolumePreleveParameter)
        const computeRejete = sumSeriesVolume(section.series, getSeriesValues, isVolumeRejeteParameter)
        const [totalPreleve, totalRejete] = await Promise.all([computePreleve(), computeRejete()])
        nextCache.set(key, {totalPreleve, totalRejete})
      }

      if (!cancelled) {
        volumeCacheRef.current = nextCache
        setVolumeByPoint(new Map(nextCache))
      }
    }

    if (visiblePointSections.length > 0) {
      const schedule = typeof window !== 'undefined' && 'requestIdleCallback' in window
        ? window.requestIdleCallback
        : (cb => setTimeout(cb, 0))

      const cancel = typeof window !== 'undefined' && 'cancelIdleCallback' in window
        ? window.cancelIdleCallback
        : (handle => clearTimeout(handle))

      const idleHandle = schedule(() => {
        computeTotals()
      })

      return () => {
        cancelled = true
        cancel(idleHandle)
      }
    }

    return () => {
      cancelled = true
    }
  }, [visiblePointSections, getSeriesValues])

  useEffect(() => {
    if (currentPage !== safePage) {
      setCurrentPage(safePage)
    }
  }, [currentPage, safePage])

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
            visiblePreleveurSections.map(group => (
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
                      {selectedAccordionId === section.accordionId && (
                        <>
                          <DeclarationFileDetails
                            pointId={section.pointId}
                            series={section.series}
                            typePrelevement={typePrelevement}
                            getSeriesValues={getSeriesValues}
                          />

                          {errors.length > 0 && (
                            <FileValidationErrors errors={errors} />
                          )}
                        </>
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

        {hasDataToDisplay && preleveurSections.length > PRELEVEUR_PAGE_SIZE && (
          <div className='mt-3 flex flex-wrap items-center justify-between gap-2'>
            <span className='text-sm text-slate-600'>
              Page {safePage} / {totalPages} — {preleveurSections.length} préleveur(s), {pointSections.length} point(s)
            </span>
            <div className='flex gap-2'>
              <Button
                priority='secondary'
                disabled={safePage <= 1}
                onClick={() => {
                  setCurrentPage(page => Math.max(1, page - 1))
                }}
              >
                Précédent
              </Button>
              <Button
                priority='secondary'
                disabled={safePage >= totalPages}
                onClick={() => {
                  setCurrentPage(page => Math.min(totalPages, page + 1))
                }}
              >
                Suivant
              </Button>
            </div>
          </div>
        )}
      </Card>
    </Box>
  )
}

export default FileValidationResult
