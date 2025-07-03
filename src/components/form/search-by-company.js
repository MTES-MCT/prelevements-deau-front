/* eslint-disable camelcase */
'use client'

import {useState} from 'react'

import SearchBar from '@codegouvfr/react-dsfr/SearchBar'
import {debounce} from 'lodash-es'

import SearchAutocomplete from '@/components/form/search-autocomplete.js'

const SearchByCompany = ({setPreleveur}) => {
  const [companies, setCompanies] = useState([])
  const [isLoading, setIsLoading] = useState(false)

  const fetchCompanies = debounce(async search => {
    if (search.length > 3) {
      setIsLoading(true)
      const response = await fetch(`https://recherche-entreprises.api.gouv.fr/search?q=${search}`)
      const data = await response.json()

      setCompanies(data.results || [])
      setIsLoading(false)
    }
  }, 300)

  const handleCompanyInfos = value => {
    if (value) {
      setPreleveur(prev => ({
        ...prev,
        raison_sociale: value.nom_raison_sociale,
        code_siren: value.siren,
        nom: value?.dirigeants?.[0]?.nom || '',
        prenom: value?.dirigeants?.[0]?.prenoms || '',
        adresse_1: `${value.siege.numero_voie || ''} ${value.siege.type_voie || ''} ${value.siege.libelle_voie || ''}`,
        adresse_2: value.siege.complement_adresse,
        code_postal: value.siege.code_postal,
        commune: value.siege.libelle_commune
      }))
    }
  }

  return (
    <div>
      <SearchBar
        label='Rechercher l’entreprise'
        renderInput={({className, id, placeholder, type}) => (
          <SearchAutocomplete
            noOptionsText='Pas de résultat'
            options={companies}
            getOptionLabel={company => `${company.nom_complet} (${company.siren})`}
            getOptionKey={c => c.siren}
            renderOption={(props, company) => {
              const {key, ...otherProps} = props
              return (
                <div key={company.siren} {...otherProps} className='p-3 even:bg-[#f5f5fe]'>
                  <div className='flex flex-cols justify-between'>
                    <p>{company.nom_complet}</p>
                    <p>{company.siege.code_postal} - {company.siege.libelle_commune}</p>
                  </div>
                  <small className='text-gray-500'>SIREN {company.siren}</small>
                </div>
              )
            }}
            className={className}
            id={id}
            placeholder={placeholder}
            type={type}
            loading={isLoading}
            onChange={(e, value) => handleCompanyInfos(value)}
          />
        )}
        onChange={e => fetchCompanies(e.target.value)}
      />
    </div>
  )
}

export default SearchByCompany
