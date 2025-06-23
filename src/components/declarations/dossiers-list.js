'use client'

import {useEffect, useState} from 'react'

import {Tooltip} from '@mui/material'
import {DataGrid, GridToolbar} from '@mui/x-data-grid'
import {frFR} from '@mui/x-data-grid/locales'
import {format} from 'date-fns'
import {fr} from 'date-fns/locale'
import {deburr} from 'lodash-es'
import {useRouter} from 'next/navigation'

import DossierStateBadge from '@/components/declarations/dossier-state-badge.js'
import PrelevementTypeBadge from '@/components/declarations/prelevement-type-badge.js'
import TypeSaisieBadge from '@/components/declarations/type-saisie-badge.js'
import {getDossierURL} from '@/lib/urls.js'
import {normalizeName} from '@/utils/string.js'

const convertDossierToRow = dossier => ({
  id: dossier._id,
  number: dossier.number,
  status: dossier.status,
  dateDepot: dossier.dateDepot ? new Date(dossier.dateDepot) : null,
  dateTraitement: dossier.dateTraitement ? new Date(dossier.dateTraitement) : null,
  typePrelevement: dossier.typePrelevement,
  declarant: dossier.declarant.raisonSociale ? dossier.declarant : dossier.demandeur,
  commentaires: dossier.commentaires,
  numeroArreteAot: dossier.numeroArreteAot,
  typeDonnees: dossier.typeDonnees,
  moisDeclaration: dossier.moisDeclaration
})

function renderMonthCell(value) {
  return value ? format(new Date(value), 'MMMM yyyy', {locale: fr}) : '-'
}

function renderDateCell(value) {
  return value ? format(new Date(value), 'dd/MM/yyyy') : '-'
}

const DossiersList = ({dossiers}) => {
  const router = useRouter()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return null
  }

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
          {field: 'number', headerName: 'Numéro'},
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
            width: 200,
            filterable: true,
            type: 'singleSelect',
            valueOptions: [
              {value: 'accepte', label: 'Accepté'},
              {value: 'en-instruction', label: 'En instruction'},
              {value: 'en-construction', label: 'En construction'}
            ]
          },
          {
            field: 'moisDeclaration',
            headerName: 'Mois de déclaration',
            width: 150,
            type: 'date',
            valueFormatter: renderMonthCell
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
