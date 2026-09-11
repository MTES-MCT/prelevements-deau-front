import {useState} from 'react'

import PreleveurMoralForm from './preleveur-moral-form.js'

export default {id: 'formulaires-preleveur-personne-morale', title: 'Formulaires/Préleveur personne morale', component: PreleveurMoralForm}

const Formulaire = () => {
  const [preleveur, setPreleveur] = useState({socialReason: '', siret: ''})
  return <PreleveurMoralForm preleveur={preleveur} setPreleveur={setPreleveur} />
}

export const Creation = {render: () => <Formulaire />}
