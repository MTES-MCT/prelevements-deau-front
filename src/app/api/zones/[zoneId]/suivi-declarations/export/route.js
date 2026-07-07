import {NextResponse} from 'next/server'

import {authenticatedFetch} from '@/server/api-wrapper.js'

export async function GET(request, {params}) {
  const {zoneId} = await params
  const {searchParams} = new URL(request.url)
  const upstreamSearch = new URLSearchParams()

  for (const key of ['periodType', 'periodKey', 'to', 'periodCount', 'periods', 'months']) {
    const value = searchParams.get(key)

    if (value) {
      upstreamSearch.set(key, value)
    }
  }

  const response = await authenticatedFetch(
    `api/zones/${zoneId}/suivi-declarations/export?${upstreamSearch.toString()}`
  )
  const buffer = await response.arrayBuffer()

  if (!response.ok) {
    return NextResponse.json(
      {message: 'Export impossible'},
      {status: response.status}
    )
  }

  return new NextResponse(buffer, {
    status: 200,
    headers: {
      'Content-Type': response.headers.get('Content-Type') || 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': response.headers.get('Content-Disposition') || 'attachment; filename="non-declarants.xlsx"'
    }
  })
}
