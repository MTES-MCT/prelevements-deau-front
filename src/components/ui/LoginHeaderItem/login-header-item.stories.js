import LoginHeaderItem from './index.js'

const meta = {
  title: 'Components/LoginHeaderItem',
  component: LoginHeaderItem,
  tags: ['autodocs'],
  argTypes: {
    user: {
      control: 'object',
      description: `Objet utilisateur connecté ou non.
- \`prenom\` (string) : prénom de l'utilisateur
- \`nom\` (string) : nom de l'utilisateur
- \`role\` (string) : rôle de l'utilisateur (affiché en Chip)
Si \`user\` est null ou indéfini, affiche le bouton "Se connecter".`
    }
  },
  args: {
    user: null
  }
}

export default meta

export const NonConnecté = {
  args: {
    user: null
  }
}

export const AdministrateurConnecté = {
  args: {
    user: {
      role: 'administrateur'
    }
  }
}

export const AvecNomEtPrenom = {
  args: {
    user: {
      prenom: 'Maxine',
      nom: 'Le Pennec'
    }
  }
}

export const AvecNomPrenomEtRole = {
  args: {
    user: {
      prenom: 'Maxine',
      nom: 'Le Pennec',
      role: 'administrateur'
    }
  }
}

export const AvecRoleSeulement = {
  args: {
    user: {
      role: 'administrateur'
    }
  }
}
