'use client'

import {Box} from '@mui/material'
import {DataGrid} from '@mui/x-data-grid'

const reglesColumns = [
  {
    field: 'parametre',
    headerName: 'Paramètre',
    width: 200,
    valueGetter(value) {
      return parametres[value] || <i>Non renseigné</i>
    }
  },
  {field: 'valeur', headerName: 'Valeur', width: 90},
  {
    field: 'unite',
    headerName: 'Unité',
    width: 80,
    valueGetter(value) {
      return unites[value] || <i>Non renseigné</i>
    }
  },
  {
    field: 'contrainte',
    headerName: 'Contrainte',
    width: 100,
    valueGetter(value) {
      return contraintes[value] || <i>Non renseigné</i>
    }
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
          href={`https://prelevementdeau-public.s3.fr-par.scw.cloud/document/${params.row.document.nom_fichier}`}
          target='_blank'
          rel='noreferrer'
        >
          {params.row.document.nom_fichier}
        </a>
      )
    }
  },
  {field: 'remarque', headerName: 'Remarque', width: 250}
]

const unites = {
  1: 'm3',
  2: 'L/s',
  3: 'm3/h',
  4: 'mg/L',
  5: 'degré Celsius',
  6: 'm NGR',
  7: 'µS/cm'
}

const contraintes = {
  1: 'minimum',
  2: 'maximum',
  3: 'moyenne'
}

const parametres = {
  1: 'Volume journalier',
  2: 'Volume mensuel',
  3: 'Volume annuel',
  4: 'Relevé d’index',
  5: 'Débit prélevé',
  6: 'Débit réservé',
  7: 'Chlorure',
  8: 'Nitrates',
  9: 'Sulfates',
  10: 'Température',
  11: 'Niveau piézométrique',
  12: 'Conductivité électrique',
  13: 'pH'
}

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
