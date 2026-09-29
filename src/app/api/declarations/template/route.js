import {readFile} from 'node:fs/promises'
import path from 'node:path'

import {fetchJSON} from '@/server/api-wrapper.js'
import {SPREADSHEET_CONTENT_TYPE} from '@/lib/spreadsheet-download.js'
import {createDeclarationTemplateBuffer} from '@/server/declaration-template.js'

export const runtime = 'nodejs'

export async function GET() {
  try {
    // Both reads use the existing authenticated API and its point permissions.
    const signal = AbortSignal.timeout(30_000)
    const [points, reference] = await Promise.all([
      fetchJSON('api/points-prelevement/options', {signal}),
      fetchJSON('api/referentiels/usages-eau', {signal}).catch(() => null)
    ])
    const template = await readFile(path.join(process.cwd(), 'public/images/assets/modele_declaration_volumes.xlsx'))
    const buffer = await createDeclarationTemplateBuffer(template, {
      points: Array.isArray(points) ? points : [],
      waterUses: Array.isArray(reference?.items) ? reference.items : []
    })
    return new Response(buffer, {
      headers: {
        'Content-Type': SPREADSHEET_CONTENT_TYPE,
        'Content-Disposition': 'attachment; filename="template_declaration_prelevements_enrichi.xlsx"',
        'Cache-Control': 'private, no-store',
        'X-Content-Type-Options': 'nosniff'
      }
    })
  } catch (error) {
    return Response.json({message: 'Impossible de générer le modèle de déclaration.'}, {
      status: [401, 403].includes(error.status ?? error.code) ? (error.status ?? error.code) : 500,
      headers: {'Cache-Control': 'private, no-store'}
    })
  }
}
