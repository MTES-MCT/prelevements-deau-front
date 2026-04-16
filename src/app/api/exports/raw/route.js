/* eslint-disable no-await-in-loop */
import {NextResponse} from 'next/server'

import {getPointsPrelevementAction} from '@/server/actions/points-prelevement.js'
import {
  getSeriesValuesAction,
  searchSeriesAction
} from '@/server/actions/series.js'

function addMapValue(map, key, value) {
  if (key === null || key === undefined || key === '') {
    return
  }

  map.set(String(key), value)
}

function buildPointNameMap(points) {
  const map = new Map()

  for (const point of points || []) {
    const label = point.nom || ''
    addMapValue(map, point._id, label)
    addMapValue(map, point.id_point, label)
  }

  return map
}

function mergeSeriesEntries(entries) {
  const map = new Map()

  for (const entry of entries) {
    const seriesId = String(entry.series?._id || '')
    if (!seriesId) {
      continue
    }

    if (!map.has(seriesId)) {
      map.set(seriesId, entry)
    }
  }

  return [...map.values()]
}

function buildDateHeure(date, time) {
  if (!date) {
    return ''
  }

  if (!time) {
    return date
  }

  return `${date} ${time}`
}

function flattenSeriesValues(series, payload, {pointNameById}) {
  const rows = []
  const values = payload?.values || []

  const pointId = series.pointPrelevement ?? ''
  const pointNom = pointNameById.get(String(pointId)) || ''

  for (const entry of values) {
    const baseRow = {
      pointId,
      pointNom,
      parameter: series.parameter || '',
      unit: series.unit || '',
      frequency: series.frequency || '',
      valueType: series.valueType || '',
      date: entry.date || ''
    }

    if (Array.isArray(entry.values)) {
      for (const subValue of entry.values) {
        const time = subValue.time || ''

        rows.push({
          ...baseRow,
          time,
          dateHeure: buildDateHeure(baseRow.date, time),
          metric: 'value',
          value: subValue.value ?? '',
          remark: subValue.remark || ''
        })
      }

      continue
    }

    const entryWithoutDate = {...entry}
    delete entryWithoutDate.date

    const metricEntries = Object.entries(entryWithoutDate)

    if (metricEntries.length === 0) {
      rows.push({
        ...baseRow,
        time: '',
        dateHeure: buildDateHeure(baseRow.date, ''),
        metric: '',
        value: '',
        remark: ''
      })
      continue
    }

    for (const [metricName, metricValue] of metricEntries) {
      if (metricValue && typeof metricValue === 'object' && !Array.isArray(metricValue)) {
        rows.push({
          ...baseRow,
          time: '',
          dateHeure: buildDateHeure(baseRow.date, ''),
          metric: metricName,
          value: metricValue.value ?? '',
          remark: metricValue.remark || ''
        })
      } else {
        rows.push({
          ...baseRow,
          time: '',
          dateHeure: buildDateHeure(baseRow.date, ''),
          metric: metricName,
          value: metricValue ?? '',
          remark: ''
        })
      }
    }
  }

  return rows
}

function escapeCsvValue(value) {
  if (value === null || value === undefined) {
    return ''
  }

  const stringValue = String(value)

  if (
    stringValue.includes(';')
    || stringValue.includes('"')
    || stringValue.includes('\n')
  ) {
    return `"${stringValue.replaceAll('"', '""')}"`
  }

  return stringValue
}

function buildCsv(rows) {
  const headers = [
    'pointId',
    'pointNom',
    'parameter',
    'unit',
    'frequency',
    'valueType',
    'date',
    'time',
    'dateHeure',
    'metric',
    'value',
    'remark'
  ]

  const lines = [
    headers.join(';'),
    ...rows.map(row => headers.map(header => escapeCsvValue(row[header])).join(';'))
  ]

  return lines.join('\n')
}

export async function GET(request) {
  const {searchParams} = new URL(request.url)

  const pointIds = searchParams.getAll('pointIds').filter(Boolean)
  const preleveurIds = searchParams.getAll('preleveurIds').filter(Boolean)
  const startDate = searchParams.get('startDate') || undefined
  const endDate = searchParams.get('endDate') || undefined

  if (pointIds.length === 0 && preleveurIds.length === 0) {
    return NextResponse.json(
      {error: 'Veuillez fournir au moins un point ou un préleveur.'},
      {status: 400}
    )
  }

  if (startDate && endDate && startDate > endDate) {
    return NextResponse.json(
      {error: 'La date de début doit être antérieure ou égale à la date de fin.'},
      {status: 400}
    )
  }

  const pointsResult = await getPointsPrelevementAction()
  const points = pointsResult?.data || []
  const pointNameById = buildPointNameMap(points)

  const seriesEntries = []

  for (const pointId of pointIds) {
    const result = await searchSeriesAction({
      pointId,
      from: startDate,
      to: endDate
    })

    const series = result?.data?.series || result?.series || []

    for (const item of series) {
      seriesEntries.push({series: item})
    }
  }

  for (const preleveurId of preleveurIds) {
    const result = await searchSeriesAction({
      preleveurId,
      from: startDate,
      to: endDate
    })

    const series = result?.data?.series || result?.series || []

    for (const item of series) {
      seriesEntries.push({series: item})
    }
  }

  const mergedSeriesEntries = mergeSeriesEntries(seriesEntries)

  const allRows = []

  for (const {series} of mergedSeriesEntries) {
    const valuesResult = await getSeriesValuesAction(series._id, {
      start: startDate,
      end: endDate
    })

    const payload = valuesResult?.data || valuesResult
    const rows = flattenSeriesValues(series, payload, {
      pointNameById
    })

    allRows.push(...rows)
  }

  const csv = buildCsv(allRows)

  const fileNameParts = ['export-series-brutes']
  if (startDate) {
    fileNameParts.push(`from-${startDate}`)
  }

  if (endDate) {
    fileNameParts.push(`to-${endDate}`)
  }

  const fileName = `${fileNameParts.join('-')}.csv`

  return new NextResponse(csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${fileName}"`
    }
  })
}
