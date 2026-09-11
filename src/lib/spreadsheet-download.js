export const SPREADSHEET_CONTENT_TYPE = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'

export async function readSpreadsheetDownload(response) {
  const contentType = response.headers.get('content-type')?.split(';', 1)[0].trim().toLowerCase()
  // An expired session may redirect a fetch to the login page with status 200.
  // Never save that HTML page as an apparently successful Excel download.
  if (!response.ok || response.redirected || contentType !== SPREADSHEET_CONTENT_TYPE) {
    throw new Error('Impossible de récupérer le fichier Excel.')
  }

  return response.blob()
}
