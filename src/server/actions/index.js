// Server Actions - Centralized exports
// All server actions for API calls with NextAuth authentication

export {
  getDossiersAction,
  getDossiersByStatusAction,
  getDossiersStatsAction,
  getDossierAction,
  getFileAction,
  getFileSeriesAction,
  getFileIntegrationsAction,
  getFileBlobAction,
  validateFileAction,
  revalidateDossierPaths
} from './dossiers.js'

export {
  getPointsPrelevementAction,
  getPointPrelevementAction,
  createPointPrelevementAction,
  editPointPrelevementAction,
  deletePointPrelevementAction,
  getExploitationsByPointIdAction,
  getBnpeAction,
  getBssAction,
  getMesoAction,
  getMeContinentalesAction,
  getBvBdcarthageAction
} from './points-prelevement.js'

export {
  getPreleveursAction,
  getPreleveurAction,
  createPreleveurAction,
  updatePreleveurAction,
  deletePreleveurAction,
  getPointsFromPreleveurAction,
  getExploitationFromPreleveurAction
} from './preleveurs.js'

export {
  getExploitationAction,
  createExploitationAction,
  updateExploitationAction,
  deleteExploitationAction,
  getExploitationDocumentsAction
} from './exploitations.js'

export {
  getDocumentsFromPreleveurAction,
  createDocumentAction,
  uploadDocumentAction,
  updateDocumentAction,
  deleteDocumentAction
} from './documents.js'

export {
  getReglesFromPreleveurAction,
  getRegleAction,
  createRegleAction,
  updateRegleAction,
  deleteRegleAction
} from './regles.js'

export {
  getSeriesMetadataAction,
  getSeriesValuesAction,
  searchSeriesAction,
  buildAggregatedSeriesQuery,
  getAggregatedSeriesAction,
  getAggregatedSeriesOptionsAction
} from './series.js'

export {
  getStatsAction
} from './stats.js'
