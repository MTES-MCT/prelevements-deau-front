import test from 'ava'

import {readSpreadsheetDownload, SPREADSHEET_CONTENT_TYPE} from './spreadsheet-download.js'

test('un téléchargement Excel valide conserve les octets et le type', async t => {
  const response = new Response('synthetic workbook', {headers: {'Content-Type': SPREADSHEET_CONTENT_TYPE}})
  const blob = await readSpreadsheetDownload(response)
  t.is(await blob.text(), 'synthetic workbook')
  t.is(blob.type, SPREADSHEET_CONTENT_TYPE)
})

test('une session expirée, un refus ou une page HTML ne deviennent jamais un faux fichier Excel', async t => {
  const responses = [
    new Response('<html>Connexion</html>', {headers: {'Content-Type': 'text/html'}}),
    new Response('Forbidden', {status: 403}),
    {
      ok: true, redirected: true, headers: new Headers({'Content-Type': SPREADSHEET_CONTENT_TYPE}), blob() {throw new Error('Ne pas lire')}
    }
  ]
  await Promise.all(responses.map(async response => {
    await t.throwsAsync(readSpreadsheetDownload(response), {message: 'Impossible de récupérer le fichier Excel.'})
  }))
})
