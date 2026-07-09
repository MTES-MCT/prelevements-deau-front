import Alert from '@codegouvfr/react-dsfr/Alert'
import Link from 'next/link'
import {redirect} from 'next/navigation'

import {StartDsfrOnHydration} from '@/dsfr-bootstrap/index.js'
import {getCurrentUser} from '@/server/actions/user.js'

export const metadata = {
  title: 'Aide export'
}

export const dynamic = 'force-dynamic'

const fieldDescriptions = [
  {
    name: 'ID du point de prélèvement',
    description: 'Identifiant technique du point de prélèvement exporté.'
  },
  {
    name: 'Nom du point de prélèvement',
    description: 'Nom du point tel qu’il est connu dans Partageons l’Eau.'
  },
  {
    name: 'Commune',
    description: 'Nom de la commune du point de prélèvement, lorsque l’information est disponible.'
  },
  {
    name: 'Code commune',
    description: 'Code INSEE de la commune du point de prélèvement, lorsque l’information est disponible.'
  },
  {
    name: 'Code BSS',
    description: 'Code BSS du point de prélèvement, lorsque l’information est disponible.'
  },
  {
    name: 'Code OPR',
    description: 'Code OPR du point de prélèvement, lorsque l’information est disponible.'
  },
  {
    name: 'Type de milieu',
    description: 'Milieu associé au point de prélèvement : eau superficielle, eau souterraine ou eau de transition.'
  },
  {
    name: 'Code usage SANDRE',
    description: 'Code de l’usage principal SANDRE associé à la valeur.'
  },
  {
    name: 'Usage SANDRE',
    description: 'Libellé de l’usage principal SANDRE associé à la valeur.'
  },
  {
    name: 'Code sous-usage SANDRE',
    description: 'Code du sous-usage SANDRE lorsque la valeur est rattachée à un sous-usage.'
  },
  {
    name: 'Sous-usage SANDRE',
    description: 'Libellé du sous-usage SANDRE lorsque la valeur est rattachée à un sous-usage.'
  },
  {
    name: 'ID du préleveur',
    description: 'Identifiant du préleveur rattaché à la valeur lorsque l’information est disponible.'
  },
  {
    name: 'Nom du préleveur',
    description: 'Nom, sigle ou raison sociale du préleveur rattaché à la valeur.'
  },
  {
    name: 'Email du préleveur',
    description: 'Adresse e-mail du compte préleveur rattaché à la valeur.'
  },
  {
    name: 'ID du collecteur',
    description: 'Identifiant du collecteur lorsqu’une valeur est déposée via un collecteur.'
  },
  {
    name: 'Nom du collecteur',
    description: 'Nom, sigle ou raison sociale du collecteur lorsqu’il existe.'
  },
  {
    name: 'Email du collecteur',
    description: 'Adresse e-mail du compte collecteur lorsqu’il existe.'
  },
  {
    name: 'Type de donnée',
    description: 'Nature de la valeur : index compteur, volume prélevé, volume rejeté, etc.'
  },
  {
    name: 'Unité',
    description: 'Unité de la valeur exportée, par exemple m3.'
  },
  {
    name: 'Date de mesure',
    description: 'Date UTC de la valeur instantanée, par exemple un index ou un débit. Vide pour les volumes.'
  },
  {
    name: 'Heure de mesure',
    description: 'Heure UTC de la valeur instantanée lorsque l’information est disponible. Vide pour les volumes.'
  },
  {
    name: 'DateHeure de mesure',
    description: 'Date et heure UTC de la valeur instantanée. Vide pour les volumes.'
  },
  {
    name: 'Date de début de période',
    description: 'Date UTC de début pour une valeur cumulative, notamment un volume. Vide pour les index.'
  },
  {
    name: 'Heure de début de période',
    description: 'Heure UTC de début de période lorsque l’information est disponible. Vide pour les index.'
  },
  {
    name: 'DateHeure de début de période',
    description: 'Date et heure UTC de début de période. Vide pour les index.'
  },
  {
    name: 'Date de fin de période',
    description: 'Date UTC de fin affichée pour une valeur cumulative. Pour les fréquences journalières ou supérieures, c’est le dernier jour inclus. Vide pour les index.'
  },
  {
    name: 'Heure de fin de période',
    description: 'Heure UTC de fin de période lorsque l’information est disponible. Vide pour les index.'
  },
  {
    name: 'DateHeure de fin de période',
    description: 'Date et heure UTC de fin de période. Vide pour les index.'
  },
  {
    name: 'Valeur',
    description: 'Valeur numérique exportée.'
  },
  {
    name: 'Remarque',
    description: 'Champ réservé aux remarques métier, vide lorsque la donnée source n’en contient pas.'
  },
  {
    name: 'Fréquence',
    description: 'Pas de temps de la valeur source.'
  },
  {
    name: 'Type de valeur',
    description: 'Type de valeur issu du référentiel interne : cumulatif, instantané ou autre qualification disponible.'
  },
  {
    name: 'Origine de la donnée',
    description: 'Indique si la ligne provient directement d’une déclaration ou d’un calcul de post-traitement.'
  }
]

const NoExportAccess = () => (
  <section className='border border-gray-200 bg-white p-4 md:p-5'>
    <Alert
      severity='info'
      title='Aide non disponible'
      description='La documentation des exports est réservée aux agents et aux administrateurs.'
    />
  </section>
)

const Page = async () => {
  const userResult = await getCurrentUser()
  if (userResult.code === 401) {
    redirect('/login')
  }

  const role = userResult.success ? userResult.data?.role : null
  const canExport = ['ADMIN', 'INSTRUCTOR'].includes(role)

  return (
    <>
      <StartDsfrOnHydration />

      <main className='min-h-screen bg-[#f7f7fb] pb-12'>
        <div className='fr-container pt-8 md:pt-10'>
          <div className='mb-6 flex flex-col gap-4 md:flex-row md:items-start md:justify-between'>
            <div>
              <h1 className='fr-h2 fr-mb-2w'>
                Documentation de l’export
              </h1>

              <p className='fr-text--sm fr-mb-0 text-gray-700'>
                Le fichier Excel contient les colonnes suivantes, dans l’ordre d’apparition du fichier.
              </p>
            </div>

            <Link
              className='fr-link fr-icon-arrow-left-line fr-link--icon-left shrink-0'
              href='/exports'
            >
              Retour aux exports
            </Link>
          </div>

          {canExport ? (
            <section className='border border-gray-200 bg-white p-4 md:p-5'>
              <div className='grid grid-cols-1 gap-3 md:grid-cols-2'>
                {fieldDescriptions.map(field => (
                  <div key={field.name} className='border border-gray-200 bg-gray-50 p-3'>
                    <h2 className='fr-mb-1v text-base font-bold text-gray-900'>
                      {field.name}
                    </h2>

                    <p className='fr-text--sm fr-mb-0 text-gray-700'>
                      {field.description}
                    </p>
                  </div>
                ))}
              </div>
            </section>
          ) : (
            <NoExportAccess />
          )}
        </div>
      </main>
    </>
  )
}

export default Page
