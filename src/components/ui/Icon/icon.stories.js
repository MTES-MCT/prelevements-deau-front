import {fr} from '@codegouvfr/react-dsfr'
import OilBarrelOutlinedIcon from '@mui/icons-material/OilBarrelOutlined'

import Icon from './index.js'

const storyMeta = {
  title: 'Components/Icon',
  component: Icon,
  tags: ['autodocs'],
  argTypes: {
    iconId: {
      control: 'text',
      description: 'Class CSS pour les icônes tirées du DSFR ou de Remix Icons (ex: "fr-icon-edit-line")'
    },
    iconElement: {
      control: false, // Pas de contrôle direct, utiliser des stories dédiées
      description: 'Composant React pour les icônes SVG venant de MUI (ex: &lt;OilBarrelOutlinedIcon /&gt;)',
      table: {
        type: {summary: 'React.ComponentType'}
      }
    },
    className: {
      control: 'text',
      description: 'Classes CSS supplémentaires (appliquées au &lt;span&gt; ou au composant)'
    }
  },
  parameters: {
    docs: {
      description: {
        component: `
## Utilisation

### Avec une classe CSS (DSFR ou Remix Icons)
\`\`\`jsx
<Icon iconId="fr-icon-edit-line" style={{color: fr.colors.decisions.text.default.grey.default}} />
\`\`\`

### Avec un composant React (MUI)
\`\`\`jsx
<Icon iconElement={SomeSvgComponent} style={{color: fr.colors.decisions.text.default.grey.default}} />
\`\`\`


Si vous utilisez les deux en même temps, seul le iconId sera pris en compte.

## Comportement
- **Props** : Toutes les props supplémentaires sont passées au &lt;span&gt; ou au composant icone.
- **Erreurs** : Loggue en console en cas de configuration invalide.
        `
      }
    }
  },
  args: {
    iconElement: OilBarrelOutlinedIcon
  }
}

export default storyMeta

const renderIcon = ({iconId, iconElement, ...args}) => <Icon iconId={iconId} iconElement={iconElement} {...args} />

export const Default = {render: renderIcon}
export const WithCssClass = {
  args: {
    iconId: 'fr-icon-edit-line',
    className: 'text-blue-500'
  },
  render: renderIcon
}

export const WithReactComponent = {
  args: {
    iconElement: OilBarrelOutlinedIcon,
    style: {color: fr.colors.decisions.background.actionHigh.blueFrance.hover}
  }, render: renderIcon
}
