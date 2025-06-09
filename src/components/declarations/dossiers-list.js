'use client'

import {Badge} from '@codegouvfr/react-dsfr/Badge'
import {Tooltip} from '@mui/material'
import {DataGrid, GridToolbar} from '@mui/x-data-grid'
import {frFR} from '@mui/x-data-grid/locales'
import {format} from 'date-fns'
import {deburr} from 'lodash-es'
import {useRouter} from 'next/navigation'

import DossierStateBadge from '@/components/declarations/dossier-state-badge.js'
import PrelevementTypeBadge from '@/components/declarations/prelevement-type-badge.js'
import TypeSaisieBadge from '@/components/declarations/type-saisie-badge.js'
import {getDossierURL} from '@/lib/urls.js'
import {normalizeName} from '@/utils/string.js'

const convertDossierToRow = dossier => ({
  id: dossier._id,
  numero: dossier.numero,
  status: dossier.status,
  errorsCount: dossier.errorsCount,
  dateDepot: dossier.dateDepot ? new Date(dossier.dateDepot) : null,
  dateTraitement: dossier.dateTraitement ? new Date(dossier.dateTraitement) : null,
  typePrelevement: dossier.typePrelevement,
  declarant: dossier.declarant.raisonSociale ? dossier.declarant : dossier.demandeur,
  commentaires: dossier.commentaires,
  numeroArreteAot: dossier.numeroArreteAot,
  typeDonnees: dossier.typeDonnees
})

function renderErrorsCount({field, row}) {
  const value = row[field]

  if (value === 0) {
    return null
  }

  return <Badge severity='error'>{value} Erreurs</Badge>
}

function renderDateCell(value) {
  return value ? format(new Date(value), 'dd/MM/yyyy') : '-'
}

const DossiersList = ({dossiers}) => {
  const router = useRouter()

  return (
    <div className='flex'>
      <DataGrid
        disableRowSelectionOnClick
        slots={{toolbar: GridToolbar}}
        localeText={frFR.components.MuiDataGrid.defaultProps.localeText}
        rows={dossiers.map(d => convertDossierToRow(d))}
        sx={{
          '& .MuiDataGrid-virtualScroller': {
            overflowY: 'hidden'
          },
          '&:hover': {
            cursor: 'pointer'
          }
        }}
        columns={[
          {field: 'numero', headerName: 'Numéro'},
          {field: 'numeroArreteAot', headerName: 'Numéro AOT', width: 120},
          {
            field: 'declarant',
            headerName: 'Déclarant',
            width: 300,
            renderCell({row}) {
              return (
                row.declarant?.raisonSociale
                  || `${normalizeName(row.declarant.nom)} ${normalizeName(row.declarant.prenom)}`
              )
            },
            valueGetter: params => params && params.raisonSociale
              ? deburr(params.raisonSociale)
              : `${deburr(params.nom)} ${deburr(params.prenom)}`
          },
          {
            field: 'typePrelevement',
            headerName: 'Type de prélèvement',
            renderCell: PrelevementTypeBadge,
            width: 200,
            filterable: true,
            type: 'singleSelect',
            valueOptions: [
              {value: 'aep-zre', label: 'Prélèvement AEP ou en ZRE'},
              {value: 'icpe-hors-zre', label: 'Prélèvement ICPE hors ZRE'},
              {value: 'camion-citerne', label: 'Prélèvement par camion citerne'},
              {value: 'autre', label: 'Extrait de registre'}
            ]
          },
          {
            field: 'typeDonnees',
            headerName: 'Type de saisie',
            renderCell: TypeSaisieBadge,
            width: 150,
            filterable: true,
            type: 'singleSelect',
            valueOptions: [
              {value: 'vide', label: 'Vide (pas de données)'},
              {value: 'tableur', label: 'Saisie via un tableur Excel ou ODS'},
              {value: 'saisie-manuelle', label: 'Saisie manuelle dans le formulaire'}
            ]
          },
          {
            field: 'status',
            headerName: 'État',
            renderCell: DossierStateBadge,
            width: 180,
            filterable: true,
            type: 'singleSelect',
            valueOptions: [
              {value: 'accepte', label: 'Accepté'},
              {value: 'en-instruction', label: 'En instruction'}
            ]
          },
          {
            field: 'errorsCount',
            headerName: 'Erreurs détectées',
            type: 'number',
            renderCell: renderErrorsCount,
            width: 180,
            filterable: true
          },
          {
            field: 'dateDepot',
            headerName: 'Date de dépôt',
            type: 'date',
            width: 150,
            valueFormatter: renderDateCell
          },
          {
            field: 'dateTraitement',
            headerName: 'Date de traitement',
            type: 'date',
            width: 150,
            valueFormatter: renderDateCell
          },
          {
            field: 'commentaires',
            headerName: 'Commentaire',
            width: 300,
            renderCell: params => (
              <Tooltip arrow title={params.value || ''}>
                <span className='truncate-text'>{params.value}</span>
              </Tooltip>
            )
          }
        ]}
        initialState={{
          pagination: {
            paginationModel: {
              pageSize: 20,
              page: 0
            }
          },
          sorting: {
            sortModel: [{field: 'dateDepot', sort: 'desc'}]
          }
        }}
        pageSizeOptions={[20, 50, 100]}
        onRowClick={params => router.push(getDossierURL({_id: params.row.id}))}
      />
    </div>
  )
}

export default DossiersList
