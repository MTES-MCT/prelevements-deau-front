/* eslint-disable camelcase */

import Input from '@codegouvfr/react-dsfr/Input'
import SearchBar from '@codegouvfr/react-dsfr/SearchBar'
import Select from '@codegouvfr/react-dsfr/SelectNext'
import {Typography} from '@mui/material'
import dynamic from 'next/dynamic'

import SearchAutocomplete from '@/components/form/search-autocomplete.js'

const DynamicCheckbox = dynamic(
  () => import('@codegouvfr/react-dsfr/Checkbox'),
  {ssr: false}
)

const OptionalPointFieldsForm = (
  {
    point,
    setPoint,
    bnpeList,
    mesoList,
    meContinentalesBvList
  }
) => (
  <div>
    <Typography variant='h5' sx={{pb: 5}}>
      Informations d’identification
    </Typography>
    <Input
      label='Autres noms'
      nativeInputProps={{
        placeholder: 'Entrer les autres noms',
        onChange: e => setPoint({...point, autresNoms: e.target.value})
      }}
    />
    <Input
      label='Code AIOT'
      nativeInputProps={{
        placeholder: 'Entrer le code AIOT',
        onChange: e => setPoint({...point, code_aiot: e.target.value})
      }}
    />
    <Select
      label='Code mésorégion hydrographique'
      placeholder='Sélectionner le code MESO'
      nativeSelectProps={{
        onChange: e => setPoint(
          {
            ...point,
            meso: mesoList.find(() => e.target.value).code
          }
        )
      }}
      options={mesoList.map(meso => ({
        value: meso.nom_provis,
        label: meso.nom_provis
      }))}
    />
    <Typography variant='h5' sx={{py: 5}}>
      Caractéristique du point d’eau
    </Typography>
    <div className='w-full grid grid-cols-2 gap-4'>
      <Input
        label='Cours d’eau'
        nativeInputProps={{
          placeholder: 'Entrer le nom du cours d’eau',
          onChange: e => setPoint({...point, cours_eau: e.target.value})
        }}
      />
      <Input
        label='Profondeur'
        type='number'
        nativeInputProps={{
          type: 'number',
          placeholder: 'Entrer la profondeur',
          onChange: e => setPoint({...point, profondeur: Number(e.target.value)})
        }}
      />
    </div>
    <div className='pb-5'>
      <p className='pb-2'>Banque Nationale des prélèvements d’eau</p>
      <SearchBar
        label='Rechercher la BNPE'
        renderInput={({className, id, placeholder, type}) => (
          <SearchAutocomplete
            options={bnpeList.map(bnpe => ({
              bnpe,
              label: bnpe.code_point_prelevement
            }))}
            className={className}
            id={id}
            placeholder={placeholder}
            type={type}
            onChange={(e, value) => setPoint({
              ...point,
              bnpe: value?.bnpe?.code_point_prelevement || null
            })}
          />
        )}
      />
    </div>
    <div className='pb-5'>
      <p className='pb-2'>Masse d’eau continentale</p>
      <SearchBar
        label='Rechercher le code masse d’eau continentale'
        renderInput={({className, id, placeholder, type}) => (
          <SearchAutocomplete
            options={meContinentalesBvList.map(meContinentales => ({
              meContinentales,
              label: meContinentales.code_dce
            }))}
            className={className}
            id={id}
            placeholder={placeholder}
            type={type}
            onChange={(e, value) => setPoint({
              ...point,
              meContinentalesBv: value?.meContinentales?.code_dce || null
            })}
          />
        )}
      />
    </div>
    <Input
      label='Bassin versant BD Carthage'
      nativeInputProps={{
        placeholder: 'Entrer le bassin versant BD Carthage',
        onChange: e => setPoint({...point, bvBdCarthage: e.target.value})
      }}
    />
    <div className='w-full grid grid-cols-2 gap-4 py-5'>
      <DynamicCheckbox
        options={[
          {
            label: 'Zone reglementée (ZRE)'
          }
        ]}
        checked={point.zre}
        onChange={e => setPoint({...point, zre: e.target.checked})}
      />
      <DynamicCheckbox
        options={[
          {
            label: 'Réservoir biologique'
          }
        ]}
        checked={point.reservoir_biologique}
        onChange={e => setPoint({...point, reservoir_biologique: e.target.checked})}
      />
    </div>
    <Typography variant='h5' sx={{pb: 5}}>
      Autre
    </Typography>
    <Input
      textArea
      label='Remarques'
      nativeInputProps={{
        onChange: e => setPoint({...point, remarques: e.target.value})
      }}
    />
  </div>
)

export default OptionalPointFieldsForm
