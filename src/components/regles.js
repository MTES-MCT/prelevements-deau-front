'use client'

import {Button} from '@codegouvfr/react-dsfr/Button'
import {Box} from '@mui/material'
import {Grid} from '@mui/system'

import Regle from '@/components/regle.js'
import {downloadCsv} from '@/lib/export-csv.js'

const Regles = ({regles}) => {
  const isSingle = regles.length === 1

  return (
    <Box>
      <Box className='flex justify-end mb-3'>
        <Button
          priority='secondary'
          iconId='fr-icon-download-line'
          size='small'
          onClick={() => downloadCsv(regles, 'regles.csv')}
        >
          Télécharger au format csv
        </Button>
      </Box>

      <Grid
        display='grid'
        gridTemplateColumns={{
          xs: '1fr',
          md: isSingle ? '1fr' : '1fr 1fr'
        }}
        sx={{alignItems: 'start'}}
        gap={{xs: 2, md: 3}}
      >
        {regles.map(regle => (
          <Regle
            key={`regle-${regle.debut_validite}-${regle.valeur}-${regle.unite}`}
            regle={regle}
          />
        ))}
      </Grid>
    </Box>
  )
}

export default Regles
