import ZoneExportButton from './zone-export-button.js'

export default {title: 'Exports/Excel', component: ZoneExportButton}

export const Tableau = {
  args: {
    columns: [{label: 'Prélèvement', key: 'point'}, {label: 'Volume', key: 'volume'}],
    rows: [{point: '=SUM(1,2)', volume: 12.5}],
    sheetName: 'Prélèvements',
    filename: 'prélèvements.xlsx'
  }
}

export const GrandTableau = {
  args: {
    columns: Array.from({length: 10}, (_, column) => ({label: `Colonne ${column}`, key: String(column)})),
    resolveRows: () => Array.from({length: 50_000}, (_, index) => Object.fromEntries(
      Array.from({length: 10}, (_, column) => [String(column), column === 9 ? index : `Point ${index} - cellule ${column}`])
    )),
    sheetName: 'Test de charge',
    filename: 'grand-tableau.xlsx'
  }
}
