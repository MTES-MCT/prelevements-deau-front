'use client'
import {useMemo} from 'react'

import {Alert} from '@codegouvfr/react-dsfr/Alert'
import {Button} from '@codegouvfr/react-dsfr/Button'
import Tag from '@codegouvfr/react-dsfr/Tag'
import {Box} from '@mui/material'

import ParameterTrendChart from '@/components/declarations/dossier/prelevements/parameter-trend-chart.js'
import PrelevementsCalendar from '@/components/declarations/prelevements-calendar/index.js'
import DividerSection from '@/components/ui/DividerSection/index.js'

const DeclarationFileDetails = ({
  moisDeclaration,
  data = {},
  typePrelevement = 'aep-zre'
}) => {
  // Vérifie si les dates de prélèvement (minDate / maxDate) se situent dans le mois déclaré
  const isInDeclarationMonth = date => {
    const declarationDate = new Date(moisDeclaration)
    const d = new Date(date)
    return d.getMonth() === declarationDate.getMonth()
           && d.getFullYear() === declarationDate.getFullYear()
  }

  const {minDate, maxDate} = data

  const hasDatesOutsideDeclMonth = (() => {
    if (!minDate || !maxDate || !moisDeclaration) {
      return false
    }

    return !isInDeclarationMonth(minDate) || !isInDeclarationMonth(maxDate)
  })()

  const dataWithDatesOnly = useMemo(() => ({
    ...data,
    dailyValues: data.dailyValues.filter(({date}) => Boolean(date)),
    fifteenMinutesValues: data?.fifteenMinutesValues?.filter(({date}) => Boolean(date)) || undefined
  }), [data])

  return (
    <Box className='flex flex-col gap-6'>
      <div className='flex justify-end p-3'>
        <Button
          priority='secondary'
          size='small'
          iconId='fr-icon-external-link-line'
          linkProps={{
            href: `/points-prelevement/${data.pointPrelevement}`
          }}
        >
          Consulter la fiche
        </Button>
      </div>

      <DividerSection title='Paramètres par pas de temps'>
        <Box className='flex flex-col gap-2'>
          {data.dailyParameters ? (
            <Box className='flex flex-wrap gap-1 items-center'>
              Journalier : {data.dailyParameters.map(param => (
                <Tag key={param.paramIndex} sx={{m: 1}}>
                  {param.nom_parametre} ({param.unite})
                </Tag>
              ))}
            </Box>
          ) : (
            <Alert severity='warning' description='Aucun paramètre journalier renseigné.' />
          )}

          {data.fifteenMinutesParameters && (
            <Box className='flex flex-wrap gap-1 items-center'>
              Quinze minutes : {data.fifteenMinutesParameters.map(param => (
                <Tag key={param.paramIndex} sx={{m: 1}}>
                  {param.nom_parametre} ({param.unite})
                </Tag>
              ))}
            </Box>
          )}
        </Box>
      </DividerSection>

      {Object.keys(data).length > 0 && (
        <DividerSection title='Calendrier des prélèvements'>
          {hasDatesOutsideDeclMonth && (
            <Alert
              severity='warning'
              className='mb-2'
              description={
                <>
                  Certaines dates de prélèvement ne sont pas situées dans le mois déclaré : {new Intl.DateTimeFormat('fr-FR', {month: 'long', year: 'numeric'}).format(new Date(moisDeclaration))}
                </>
              }
            />
          )}

          <PrelevementsCalendar data={dataWithDatesOnly} />
          <ParameterTrendChart data={dataWithDatesOnly} connectNulls={typePrelevement === 'camion-citerne'} />
        </DividerSection>
      )}
    </Box>
  )
}

export default DeclarationFileDetails
