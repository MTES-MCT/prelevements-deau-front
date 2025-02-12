'use client'

import {Box} from '@mui/material'
import {DataGrid} from '@mui/x-data-grid'

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
  {field: 'debut_periode', headerName: 'Début période', width: 110},
  {field: 'fin_periode', headerName: 'Fin période', width: 110},
  {field: 'debut_validite', headerName: 'Début validité', width: 110},
  {field: 'fin_validite', headerName: 'Fin validité', width: 110},
  {
    field: 'document',
    headerName: 'Document',
    width: 130,
    renderCell(params) {
      return (
        <a
          href={`${API_URL}/document/${params.row.document.nom_fichier}`}
          target='_blank'
          rel='noreferrer'
        >
          {params.row.document.nature}
        </a>
      )
    }
  },
  {field: 'remarque', headerName: 'Remarque', width: 250}
]

const Regles = ({regles}) => (
  <Box sx={{p: 2}}>
    <DataGrid
      disableSelectionOnClick
      hideFooterPagination
      rows={regles}
      columns={reglesColumns}
      getRowId={row => row.id_regle}
    />
  </Box>
)

export default Regles
