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
    bvBdCarthageList,
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
        defaultValue: point?.autresNoms,
        placeholder: 'Entrer les autres noms, séparés par une virgule',
        onChange: e => setPoint(prev => ({...prev, autresNoms: e.target.value}))
      }}
    />
    <Input
      label='Code AIOT'
      nativeInputProps={{
        defaultValue: point?.code_aiot,
        placeholder: 'Entrer le code AIOT',
        onChange: e => setPoint(prev => ({...prev, code_aiot: e.target.value}))
      }}
    />
    <Select
      label='Code mésorégion hydrographique'
      placeholder='Sélectionner le code MESO'
      nativeSelectProps={{
        defaultValue: point?.meso?.nom,
        onChange: e => setPoint(prev =>
          ({
            ...prev,
            meso: mesoList.find(() => e.target.value).code
          })
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
          defaultValue: point?.cours_eau,
          placeholder: 'Entrer le nom du cours d’eau',
          onChange: e => setPoint(prev => ({...prev, cours_eau: e.target.value}))
        }}
      />
      <Input
        label='Profondeur'
        type='number'
        nativeInputProps={{
          type: 'number',
          defaultValue: point?.profondeur,
          placeholder: 'Entrer la profondeur',
          onChange: e => setPoint(prev => ({...prev, profondeur: Number(e.target.value)}))
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
              label: `${bnpe.code_point_prelevement} - ${bnpe.nom_ouvrage}`
            }))}
            defaultValue={point?.bnpe?.nom}
            className={className}
            id={id}
            placeholder={placeholder}
            type={type}
            onChange={(e, value) => setPoint(prev => ({
              ...prev,
              bnpe: value?.bnpe?.code_point_prelevement
            }))}
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
              label: `${meContinentales.code_dce} - ${meContinentales.nom}`
            }))}
            defaultValue={point?.meContinentalesBv?.nom}
            className={className}
            id={id}
            placeholder={placeholder}
            type={type}
            onChange={(e, value) => setPoint(prev => ({
              ...prev,
              meContinentalesBv: value?.meContinentales?.code_dce
            }))}
          />
        )}
      />
    </div>
    <div className='pb-5'>
      <p className='pb-2'>Bassin versant BD Carthage</p>
      <SearchBar
        label='Rechercher un BV BD Carthage'
        renderInput={({className, id, placeholder, type}) => (
          <SearchAutocomplete
            options={bvBdCarthageList.map(bvBdCarthage => ({
              bvBdCarthage,
              label: `${bvBdCarthage.code_cours} - ${bvBdCarthage.toponyme_t}`
            }))}
            defaultValue={point?.bvBdCarthage?.nom}
            className={className}
            id={id}
            placeholder={placeholder}
            type={type}
            onChange={(e, value) => setPoint(prev => ({
              ...prev,
              bvBdCarthage: value?.bvBdCarthage?.code_cours
            }))}
          />
        )}
      />
    </div>
    <div className='w-full grid grid-cols-2 gap-4 py-5'>
      <DynamicCheckbox
        options={[
          {
            label: 'Zone règlementée (ZRE)',
            nativeInputProps: {
              defaultChecked: point.zre || false,
              onChange: e => setPoint(prev => ({...prev, zre: e.target.checked}))
            }
          }
        ]}
      />
      <DynamicCheckbox
        options={[
          {
            label: 'Réservoir biologique',
            nativeInputProps: {
              defaultChecked: point.reservoir_biologique || false,
              onChange: e => setPoint(prev => ({...prev, reservoir_biologique: e.target.checked}))
            }
          }
        ]}
      />
    </div>
    <Typography variant='h5' sx={{pb: 5}}>
      Autre
    </Typography>
    <Input
      textArea
      label='Remarque'
      nativeTextAreaProps={{
        placeholder: 'Entrer une remarque',
        defaultValue: point?.remarque
      }}
      onChange={e => setPoint(prev => ({...prev, remarque: e.target.value}))}
    />
  </div>
)

export default OptionalPointFieldsForm
