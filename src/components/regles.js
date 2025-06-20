'use client'

import {Box, Tooltip} from '@mui/material'
import {DataGrid, GridToolbar} from '@mui/x-data-grid'
import {frFR} from '@mui/x-data-grid/locales'

import formatDate, {formatPeriodeDate} from '@/lib/format-date.js'

const API_URL = process.env.NEXT_PUBLIC_STORAGE_URL

const reglesColumns = [
  {
    field: 'parametre',
    headerName: 'Paramètre',
    width: 200
  },
  {
    field: 'valeur',
    headerName: 'Valeur',
    width: 90,
    renderCell(params) {
      return (
        params.row.valeur.toLocaleString('fr-FR')
      )
    }
  },
  {
    field: 'unite',
    headerName: 'Unité',
    width: 80
  },
  {
    field: 'contrainte',
    headerName: 'Contrainte',
    width: 100
  },
  {
    field: 'debut_validite',
    headerName: 'Début validité',
    width: 110,
    renderCell(params) {
      return (
        formatDate(params.row.debut_validite)
      )
    }
  },
  {
    field: 'fin_validite',
    headerName: 'Fin validité',
    width: 110,
    renderCell(params) {
      return (
        formatDate(params.row.fin_validite)
      )
    }
  },
  {
    field: 'debut_periode',
    headerName: 'Début période',
    width: 120,
    renderCell(params) {
      return (
        <Tooltip
          arrow
          title='Début de période d’application de la règle, lorsque celle-ci ne s’applique que sur une période de l’année'
        >
          {formatPeriodeDate(params.row.debut_periode)}
        </Tooltip>
      )
    }
  },
  {
    field: 'fin_periode',
    headerName: 'Fin période',
    width: 120,
    renderCell(params) {
      return (
        <Tooltip
          arrow
          title='Fin de période d’application de la règle, lorsque celle-ci ne s’applique que sur une période de l’année'
        >
          {formatPeriodeDate(params.row.fin_periode)}
        </Tooltip>
      )
    }
  },
  {
    field: 'document',
    headerName: 'Document',
    width: 250,
    renderCell(params) {
      return params.row.document ? (
        <a
          href={`${API_URL}/document/${params.row.document.nom_fichier}`}
          target='_blank'
          rel='noreferrer'
        >
          {params.row.document.nature}
        </a>
      ) : ''
    },
    valueGetter: params => params ? `${API_URL}/document/${params.nom_fichier}` : ''
  },
  {field: 'remarque', headerName: 'Remarque', width: 400}
]

const Regles = ({regles, documents}) => {
  const reglesWithDocuments = regles.map(r => ({
    ...r,
    document: documents.find(d => d.id_document === r.id_document)
  }))

  return (
    <Box sx={{p: 2}}>
      <DataGrid
        disableSelectionOnClick
        hideFooterPagination
        slots={{toolbar: GridToolbar}}
        localeText={frFR.components.MuiDataGrid.defaultProps.localeText}
        rows={reglesWithDocuments}
        columns={reglesColumns}
        getRowId={row => row.id_regle}
      />
    </Box>
  )
}

export default Regles
