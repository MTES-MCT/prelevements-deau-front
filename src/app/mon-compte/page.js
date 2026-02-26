
import {Box, Chip, Typography} from '@mui/material'
import moment from 'moment'
import 'moment/locale/fr'

import {StartDsfrOnHydration} from '@/dsfr-bootstrap/index.js'
import {getCurrentUser} from '@/server/actions/user.js'
import {getZonesActions} from '@/server/actions/zones.js'

moment.locale('fr')

const InfoLine = ({label, value}) => (
  <Box className='flex flex-wrap gap-2 items-center'>
    <Typography fontWeight='medium' className='fr-text--sm'>{label}</Typography>
    <Box className='flex gap-1'>
      <Typography fontWeight='light' className='fr-text--sm'>{value || '-'}</Typography>
    </Box>
  </Box>
)

const MonComptePage = async () => {
  const userResult = await getCurrentUser()
  const user = userResult?.data?.user ?? null
  const role = userResult?.data?.role ?? null

  let zones = []

  if (role === 'INSTRUCTOR') {
    const zonesResult = await getZonesActions()
    zones = zonesResult?.data || []
  }

  return (
    <>
      <StartDsfrOnHydration />

      <div className='fr-container fr-my-6w'>
        <div className='flex flex-col gap-6'>
          <div className='flex justify-between md:items-center sm:items-start gap-4 pb-2'>
            <Typography variant='h3'>
              Mon compte
            </Typography>
          </div>

          {/* Infos + RGPD */}
          <div className='flex flex-col gap-8'>
            {/* Informations */}
            <div className='flex flex-col gap-3'>
              <Typography gutterBottom variant='h6'>
                Informations
              </Typography>

              <div className='flex flex-col gap-2'>
                <InfoLine label='Prénom' value={user?.firstName} />
                <InfoLine label='Nom' value={user?.lastName} />
                <InfoLine label='Email' value={user?.email} />
                <InfoLine label='Rôle' value={role} />
              </div>

              {user?.role && (
                <div>
                  <small className='fr-badge fr-badge--info fr-badge--no-icon'>
                    {user.role}
                  </small>
                </div>
              )}
            </div>

            <div className='flex flex-col gap-2'>
              <Typography gutterBottom variant='h6'>
                Données personnelles
              </Typography>

              <Typography variant='body2'>
                Les informations affichées sont utilisées pour la gestion de votre compte
                et de vos habilitations.
              </Typography>

              <Typography variant='body2'>
                Conformément au RGPD, vous disposez d’un droit d’accès, de rectification
                et d’effacement de vos données.
              </Typography>

              <Typography variant='body2'>
                Pour exercer vos droits : <a href='mailto:prelevements-deau@beta.gouv.fr'>prelevements-deau@beta.gouv.fr</a>
              </Typography>
            </div>

            {role === 'INSTRUCTOR' && (
              <div className='flex flex-col gap-3'>
                <div className='flex justify-between md:items-center sm:items-start gap-4 pb-2'>
                  <Typography variant='h6'>
                    Mes droits par zone
                  </Typography>
                </div>

                {zones.length === 0 ? (
                  <Typography variant='body2'>
                    Aucun droit à afficher.
                  </Typography>
                ) : (
                  <Box className='fr-table '>
                    <table>
                      <thead>
                        <tr>
                          <th>Type</th>
                          <th>Zone</th>
                          <th>Période</th>
                          <th>Rôles</th>
                        </tr>
                      </thead>
                      <tbody>
                        {zones.map(z => (
                          <tr key={z.id}>
                            <td>{z.type}</td>
                            <td>
                              <div className='flex flex-col'>
                                <span className='fr-text--bold'>{z.name}</span>
                                <span className='fr-hint-text'>Code : {z.code}</span>
                              </div>
                            </td>
                            <td>
                              {z.startDate ? moment(z.startDate).format('DD/MM/YYYY') : '—'}{' '}
                              →{' '}
                              {z.endDate ? moment(z.endDate).format('DD/MM/YYYY') : '∞'}
                            </td>
                            <td>
                              <Chip
                                label='Admin'
                                size='small'
                              />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </Box>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}

export default MonComptePage
