import {useState} from 'react'

import {Box} from '@mui/material'

import AccordionCentered from './index.js'

const meta = {
  title: 'Components/AccordionCentered',
  component: AccordionCentered,
  tags: ['autodocs'],
  argTypes: {
    label: {control: 'text', description: 'Libellé affiché dans le résumé.'},
    isExpanded: {control: 'boolean', description: 'État initial développé.'},
    setIsExpanded: {
      action: 'setIsExpanded',
      description: 'Callback appelé pour changer l’état (fourni ici pour documentation/action dans Storybook).'
    },
    children: {
      control: false,
      description: `Contenu affiché dans l’accordéon (nœud React). Dans la story on accepte du texte pour faciliter l’édition.
**Type**: \`ReactNode\``
    }
  },
  args: {
    label: 'Informations',
    isExpanded: false,
    children: (
      <Box>
        Contenu de l’accordéon. Remplacez par vos composants.
      </Box>
    )
  }
}

const RenderAccordion = args => {
  const [isExpanded, setIsExpanded] = useState(Boolean(args.isExpanded))

  const content = args.children || (
    <div style={{padding: 16}}>
      Ceci est le contenu de l’accordéon. Remplacez par vos composants.
    </div>
  )

  return (
    <AccordionCentered
      {...args}
      isExpanded={isExpanded}
      setIsExpanded={setIsExpanded}
    >
      {content}
    </AccordionCentered>
  )
}

export default meta

export const Défaut = {render: RenderAccordion}

export const Développé = {args: {isExpanded: true}, render: RenderAccordion}
