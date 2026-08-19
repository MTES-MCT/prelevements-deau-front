'use client'

import {useId, useMemo} from 'react'

import {Button} from '@codegouvfr/react-dsfr/Button'
import {createModal} from '@codegouvfr/react-dsfr/Modal'

const Example = ({children, title}) => (
  <div
    className='p-4'
    style={{
      backgroundColor: 'var(--background-alt-blue-france)',
      borderInlineStart: '4px solid var(--border-action-high-blue-france)'
    }}
  >
    <p className='fr-text--sm fr-text--bold fr-mb-1v'>{title}</p>
    <p className='fr-text--sm fr-mb-0'>{children}</p>
  </div>
)

const DistributedVolumeRuleInfo = () => {
  const instanceId = useId().replaceAll(':', '')
  const ids = useMemo(() => {
    const prefix = `distributed-volume-rule-${instanceId}`

    return {
      calculation: `${prefix}-calculation`,
      display: `${prefix}-display`,
      examples: `${prefix}-examples`,
      modal: createModal({
        id: `${prefix}-modal`,
        isOpenedByDefault: false
      })
    }
  }, [instanceId])
  const {modal} = ids

  return (
    <>
      <span className='inline-flex items-center gap-1'>
        <span className='text-xs text-[var(--text-mention-grey)]'>Volumes répartis</span>
        <Button
          iconId='fr-icon-information-line'
          nativeButtonProps={{
            ...modal.buttonProps,
            'aria-label': 'Consulter la règle de répartition des volumes'
          }}
          priority='tertiary no outline'
          size='small'
        >
          Règle de répartition
        </Button>
      </span>

      <modal.Component
        buttons={{children: 'Fermer'}}
        iconId='fr-icon-information-line'
        size='large'
        title='Comment les volumes sont-ils répartis dans le graphique ?'
        titleAs='h2'
      >
        <p className='fr-text--lg fr-mb-3w'>
          Chaque volume affiché, qu’il soit saisi directement ou calculé à partir d’index, représente une quantité totale rattachée à une période. Pour le faire apparaître dans le graphique, cette quantité est répartie à un rythme constant sur toute la durée couverte.
        </p>

        <section aria-labelledby={ids.calculation}>
          <h3 id={ids.calculation} className='fr-h6 fr-mb-1w'>
            Comment la part affichée est-elle calculée ?
          </h3>
          <ul className='fr-mb-3w'>
            <li>Toutes les journées entièrement couvertes reçoivent la même part.</li>
            <li>Si la période commence ou se termine en cours de journée, la part correspond au temps couvert pendant cette journée.</li>
            <li>Lorsqu’une période est saisie uniquement avec une date de début et une date de fin, le premier et le dernier jour sont tous les deux inclus.</li>
            <li>Pour chaque volume, l’addition des parts sur toute sa période reste égale au volume d’origine, avant l’arrondi à l’écran.</li>
          </ul>
        </section>

        <section aria-labelledby={ids.display}>
          <h3 id={ids.display} className='fr-h6 fr-mb-1w'>
            Que se passe-t-il quand l’affichage change ?
          </h3>
          <ul className='fr-mb-3w'>
            <li>Les vues par semaine, mois, trimestre ou année additionnent les parts des jours concernés.</li>
            <li>Afficher seulement une partie de la période ne répartit pas de nouveau le volume : seules les parts correspondant aux jours visibles sont présentées.</li>
            <li>Lorsque plusieurs volumes couvrent le même jour, leurs parts sont additionnées, qu’ils concernent un seul point ou plusieurs points.</li>
            <li>En dehors des périodes couvertes par un volume, aucune valeur n’est ajoutée.</li>
            <li>Les valeurs sont arrondies au mètre cube à l’écran, mais le calcul conserve sa précision.</li>
          </ul>
        </section>

        <section aria-labelledby={ids.examples}>
          <h3 id={ids.examples} className='fr-h6 fr-mb-2w'>
            Exemples
          </h3>
          <div className='grid gap-3 sm:grid-cols-2'>
            <Example title='Un mois complet'>
              31 000 m³ déclarés du 1er au 31 janvier donnent 1 000 m³ par jour dans le graphique.
            </Example>
            <Example title='Une partie de la période affichée'>
              Pour 45 000 m³ répartis sur 45 jours, afficher dix journées complètes comprises dans cette période montre 10 000 m³.
            </Example>
            <div className='sm:col-span-2'>
              <Example title='Des journées partielles'>
                2 400 m³ du 30 janvier à midi au 1er février à midi donnent 600 m³ le 30 janvier, 1 200 m³ le 31 janvier et 600 m³ le 1er février.
              </Example>
            </div>
          </div>
        </section>
      </modal.Component>
    </>
  )
}

export default DistributedVolumeRuleInfo
