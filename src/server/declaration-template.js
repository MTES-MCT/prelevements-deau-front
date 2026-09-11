import XlsxPopulate from 'xlsx-populate'

import {enrichDeclarationTemplateWorkbook} from '@/lib/declaration-template-workbook.js'

// Only the trusted, versioned template is read here. Unlike the old browser
// bundle, the Node entry resolves its dependencies from the audited lockfile.
export async function createDeclarationTemplateBuffer(template, {points, waterUses}) {
  const workbook = await XlsxPopulate.fromDataAsync(template)
  enrichDeclarationTemplateWorkbook(workbook, {
    pointNames: points.map(point => point?.name).filter(Boolean),
    waterUses
  })
  return workbook.outputAsync({type: 'nodebuffer'})
}
