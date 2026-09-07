'use client'

import {
  useEffect,
  useMemo,
  useState
} from 'react'

import {useRouter} from '@bprogress/next/app'
import {Alert} from '@codegouvfr/react-dsfr/Alert'
import Breadcrumb from '@codegouvfr/react-dsfr/Breadcrumb'
import {Button} from '@codegouvfr/react-dsfr/Button'
import {
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle
} from '@mui/material'
import Link from 'next/link'

import ImpersonateUserButton from '@/components/auth/impersonate-user-button.js'
import CopyableEmail from '@/components/ui/CopyableEmail/index.js'
import {
  getAgentAccessStatusLabel,
  getAgentAccountStatusLabel,
  getAgentHabilitations,
  getAgentName
} from '@/lib/agents.js'
import {
  formatAccessPeriod
} from '@/lib/zone-instructors.js'
import {
  disableAgentAction,
  restoreAgentAction,
  sendAgentAccountCreationNotificationAction
} from '@/server/actions/agents.js'
import {
  deleteZoneInstructorAction,
  sendZoneInstructorAttachmentNotificationAction
} from '@/server/actions/zones.js'

const MESSAGE_CONTENT = {
  agent: {
    severity: 'success',
    title: 'Agent créé',
    description: 'Le compte et son premier accès ont bien été créés.'
  },
  'agent-warning': {
    severity: 'warning',
    title: 'Agent créé',
    description: 'Le compte a bien été créé, mais au moins un email n’a pas pu être envoyé.'
  },
  profile: {
    severity: 'success',
    title: 'Profil mis à jour',
    description: 'Les informations de l’agent ont bien été enregistrées.'
  },
  email: {
    severity: 'success',
    title: 'Email modifié',
    description: 'La nouvelle adresse email est utilisable. Les anciennes sessions ont été révoquées.'
  },
  'email-warning': {
    severity: 'warning',
    title: 'Email modifié',
    description: 'La nouvelle adresse est enregistrée, mais l’email d’information n’a pas pu être envoyé.'
  },
  access: {
    severity: 'success',
    title: 'Accès ajouté',
    description: 'Le nouvel accès territorial a bien été enregistré.'
  },
  'access-warning': {
    severity: 'warning',
    title: 'Accès ajouté',
    description: 'Le nouvel accès territorial a bien été enregistré, mais l’email de rattachement n’a pas pu être envoyé.'
  },
  'access-updated': {
    severity: 'success',
    title: 'Accès mis à jour',
    description: 'La période et les droits ont bien été enregistrés.'
  }
}

const ZONE_TYPE_LABELS = {
  REGION: 'Région',
  DEPARTEMENT: 'Département',
  SAGE: 'SAGE'
}

function formatDateTime(value, fallback = 'Jamais') {
  if (!value) {
    return fallback
  }

  return new Intl.DateTimeFormat('fr-FR', {
    dateStyle: 'medium',
    timeStyle: 'short'
  }).format(new Date(value))
}

const Field = ({label, children, value}) => {
  const content = children ?? value

  return (
    <div className='min-w-0'>
      <dt className='fr-text--xs fr-mb-1v font-semibold text-[var(--text-mention-grey)]'>{label}</dt>
      <dd className='fr-text--sm fr-mb-0 min-w-0 break-words'>{content || 'Non renseigné'}</dd>
    </div>
  )
}

const StatusBadge = ({status, type = 'access'}) => {
  const classNames = type === 'account'
    ? {
      ACTIVE: 'fr-badge--success',
      DISABLED: 'fr-badge--warning'
    }
    : {
      ACTIVE: 'fr-badge--success',
      FUTURE: 'fr-badge--info',
      ENDED: 'fr-badge--warning',
      NONE: 'fr-badge--grey'
    }
  const label = type === 'account'
    ? getAgentAccountStatusLabel(status)
    : getAgentAccessStatusLabel(status)

  return <span className={`fr-badge fr-badge--sm ${classNames[status] || ''}`}>{label}</span>
}

function getPermissionLabels(catalog, permissions) {
  const labels = new Map((catalog?.groups ?? [])
    .flatMap(group => group.permissions)
    .map(permission => [permission.code, permission.label]))

  return permissions.map(permission => labels.get(permission) ?? permission)
}

const HabilitationPermissions = ({catalog, habilitation}) => {
  const labels = useMemo(
    () => getPermissionLabels(catalog, habilitation.permissions ?? []),
    [catalog, habilitation.permissions]
  )

  return (
    <details className='mt-3'>
      <summary className='cursor-pointer text-xs font-medium text-[#000091]'>
        {habilitation.isAdmin
          ? 'Accès complet'
          : `${labels.length} droit${labels.length > 1 ? 's' : ''}`}
      </summary>
      <ul className='fr-text--xs fr-mb-0 mt-2 grid list-disc grid-cols-1 gap-x-6 pl-5 lg:grid-cols-2'>
        {labels.map(label => <li key={label}>{label}</li>)}
      </ul>
    </details>
  )
}

const ZoneAttachmentNotificationButton = ({agent, habilitation}) => {
  const router = useRouter()
  const [error, setError] = useState(null)
  const [isPending, setIsPending] = useState(false)
  const [sentAt, setSentAt] = useState(habilitation.zoneAttachmentMailSentAt)

  const send = async () => {
    setError(null)
    setIsPending(true)

    const result = await sendZoneInstructorAttachmentNotificationAction(
      habilitation.zone.id,
      agent
    )

    if (!result.success) {
      setError(result.error || 'Impossible d’envoyer cet email.')
      setIsPending(false)
      return
    }

    const currentHabilitation = result.data?.habilitations
      ?.find(item => item.zoneId === habilitation.zone.id)

    setSentAt(currentHabilitation?.zoneAttachmentMailSentAt ?? new Date().toISOString())
    setIsPending(false)
    router.refresh({showProgress: false})
  }

  return (
    <div className='flex flex-col items-start gap-1'>
      <Button
        disabled={isPending}
        priority='tertiary no outline'
        size='small'
        onClick={send}
      >
        {isPending ? 'Envoi…' : 'Envoyer l’email de rattachement'}
      </Button>
      <span className='text-xs text-[var(--text-mention-grey)]'>
        Dernier envoi : {formatDateTime(sentAt).toLowerCase()}
      </span>
      {error && <span className='fr-error-text fr-mb-0'>{error}</span>}
    </div>
  )
}

const RemoveHabilitationButton = ({agent, habilitation}) => {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [error, setError] = useState(null)
  const [isPending, setIsPending] = useState(false)

  const remove = async () => {
    setError(null)
    setIsPending(true)

    const result = await deleteZoneInstructorAction(habilitation.zone.id, agent.id)

    if (!result.success) {
      setError(result.error || 'Impossible de retirer cet accès.')
      setIsPending(false)
      return
    }

    setOpen(false)
    setIsPending(false)
    router.refresh({showProgress: false})
  }

  return (
    <>
      <Button priority='tertiary no outline' size='small' onClick={() => setOpen(true)}>
        Retirer l’accès
      </Button>
      <Dialog fullWidth maxWidth='sm' open={open} onClose={isPending ? undefined : () => setOpen(false)}>
        <DialogTitle>Retirer l’accès à {habilitation.zone.name}&nbsp;?</DialogTitle>
        <DialogContent dividers>
          <p className='fr-text--sm'>
            L’agent ne sera plus rattaché à cette zone. Son compte et ses autres accès seront conservés.
          </p>
          <p className='fr-text--sm fr-mb-0'>
            Le retrait sera refusé si cet agent est le dernier gestionnaire actif de la zone.
          </p>
          {error && <p className='fr-error-text fr-mt-2w fr-mb-0'>{error}</p>}
        </DialogContent>
        <DialogActions className='m-3'>
          <Button disabled={isPending} priority='secondary' onClick={() => setOpen(false)}>Annuler</Button>
          <Button disabled={isPending} onClick={remove}>
            {isPending ? 'Retrait…' : 'Confirmer le retrait'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  )
}

const AgentHabilitations = ({agent, permissionCatalog}) => {
  const habilitations = getAgentHabilitations(agent)
  const accountActive = agent.accountStatus === 'ACTIVE'

  return (
    <section className='border border-gray-200 bg-white p-5 md:p-6'>
      <div className='mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between'>
        <div>
          <h2 className='fr-h4 fr-mb-1w'>Accès aux zones</h2>
          <p className='fr-text--sm fr-mb-0 text-[var(--text-mention-grey)]'>
            Les droits sont datés et gérés indépendamment pour chaque zone.
          </p>
        </div>
        {accountActive && (
          <Button
            iconId='fr-icon-add-line'
            priority='secondary'
            size='small'
            linkProps={{href: `/agents/${agent.id}/zones/ajouter`}}
          >
            Ajouter une zone
          </Button>
        )}
      </div>

      {!accountActive && (
        <Alert
          description='Ces accès sont conservés sans être modifiables. Ils redeviendront effectifs selon leurs dates si le compte est restauré.'
          severity='info'
          title='Accès conservés'
        />
      )}

      {habilitations.length === 0
        ? <p className='fr-text--sm fr-mb-0 mt-4'><i>Aucun accès territorial.</i></p>
        : (
          <div className='mt-4 flex flex-col gap-3'>
            {habilitations.map(habilitation => (
              <article key={habilitation.id} className='border border-[var(--border-default-grey)] p-4'>
                <div className='flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between'>
                  <div className='min-w-0'>
                    <div className='flex flex-wrap items-center gap-2'>
                      <h3 className='fr-h6 fr-mb-0 break-words'>{habilitation.zone?.name || 'Zone sans nom'}</h3>
                      <StatusBadge status={habilitation.status} />
                    </div>
                    <p className='fr-text--xs fr-mb-0 mt-1 text-[var(--text-mention-grey)]'>
                      {ZONE_TYPE_LABELS[habilitation.zone?.type] || 'Zone'}
                      {habilitation.zone?.code ? ` · ${habilitation.zone.code}` : ''}
                    </p>
                    <p className='fr-text--sm fr-mb-0 mt-2'>
                      {formatAccessPeriod(habilitation.startDate, habilitation.endDate)}
                    </p>
                    <HabilitationPermissions catalog={permissionCatalog} habilitation={habilitation} />
                  </div>

                  {accountActive && (
                    <div className='flex shrink-0 flex-col items-start gap-2 lg:items-end'>
                      <div className='flex flex-wrap gap-2 lg:justify-end'>
                        <Button
                          priority='secondary'
                          size='small'
                          linkProps={{href: `/agents/${agent.id}/zones/${habilitation.zone.id}/modifier`}}
                        >
                          Modifier
                        </Button>
                        <RemoveHabilitationButton agent={agent} habilitation={habilitation} />
                      </div>
                      {habilitation.status !== 'ENDED' && (
                        <ZoneAttachmentNotificationButton agent={agent} habilitation={habilitation} />
                      )}
                    </div>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
    </section>
  )
}

const AccountNotificationControl = ({agent, openDialog}) => {
  if (agent.accountStatus !== 'ACTIVE') {
    return null
  }

  if (!agent.email) {
    return (
      <p className='fr-text--sm fr-mb-0'>
        <Link className='fr-link' href={`/agents/${agent.id}/modifier`}>Renseignez d’abord un email</Link> pour envoyer l’invitation.
      </p>
    )
  }

  return (
    <Button priority='secondary' size='small' onClick={() => openDialog('notify')}>
      Envoyer l’email de compte
    </Button>
  )
}

const AccountStateControl = ({agent, openDialog}) => {
  const accountActive = agent.accountStatus === 'ACTIVE'

  return (
    <div>
      <p className='fr-text--sm fr-text--bold fr-mb-1w'>État du compte</p>
      <p className='fr-text--sm fr-mb-2w text-[var(--text-mention-grey)]'>
        {accountActive
          ? 'La désactivation révoque les accès de connexion sans supprimer les habilitations.'
          : 'La restauration ne recrée ni mot de passe, ni session, ni ancienne adresse de connexion.'}
      </p>
      <Button
        disabled={!agent.email}
        priority={accountActive ? 'tertiary no outline' : 'secondary'}
        size='small'
        onClick={() => openDialog(accountActive ? 'disable' : 'restore')}
      >
        {accountActive ? 'Désactiver le compte' : 'Restaurer le compte'}
      </Button>
      {!agent.email && (
        <p className='fr-text--sm fr-mb-0 mt-2'>
          <Link className='fr-link' href={`/agents/${agent.id}/modifier`}>Renseignez d’abord un email</Link> pour pouvoir {accountActive ? 'désactiver' : 'restaurer'} le compte.
        </p>
      )}
    </div>
  )
}

const AccountActionDialog = ({
  agent,
  close,
  dialog,
  disable,
  error,
  isPending,
  notify,
  restore
}) => {
  const titles = {
    disable: 'Désactiver ce compte ?',
    restore: 'Restaurer ce compte ?',
    notify: 'Envoyer l’email de création de compte ?'
  }

  return (
    <Dialog fullWidth maxWidth='sm' open={Boolean(dialog)} onClose={close}>
      <DialogTitle>{titles[dialog]}</DialogTitle>
      <DialogContent dividers>
        {dialog === 'disable' && (
          <>
            <p className='fr-text--sm'>
              Les sessions, alias et accès par mot de passe seront révoqués. L’email principal et les habilitations seront conservés.
            </p>
            <p className='fr-text--sm'>
              La désactivation sera refusée si cet agent est le dernier gestionnaire actif d’une zone.
            </p>
          </>
        )}
        {dialog === 'restore' && (
          <p className='fr-text--sm fr-mb-0'>
            Les habilitations conservées redeviendront effectives selon leurs dates. L’agent devra recréer son accès de connexion si nécessaire.
          </p>
        )}
        {dialog === 'notify' && (
          <p className='fr-text--sm fr-mb-0'>
            Un nouvel email de création de compte sera envoyé à <strong>{agent.email}</strong>.
          </p>
        )}
        {error && <p className='fr-error-text fr-mt-2w fr-mb-0'>{error}</p>}
      </DialogContent>
      <DialogActions className='m-3'>
        <Button disabled={isPending} priority='secondary' onClick={close}>Annuler</Button>
        {dialog === 'disable' && (
          <Button disabled={isPending} onClick={disable}>
            {isPending ? 'Désactivation…' : 'Confirmer la désactivation'}
          </Button>
        )}
        {dialog === 'restore' && (
          <Button disabled={isPending} onClick={restore}>
            {isPending ? 'Restauration…' : 'Confirmer la restauration'}
          </Button>
        )}
        {dialog === 'notify' && (
          <Button disabled={isPending} onClick={notify}>
            {isPending ? 'Envoi…' : 'Confirmer l’envoi'}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  )
}

const AccountManagement = ({agent, onAgentChange, onFeedback}) => {
  const [dialog, setDialog] = useState(null)
  const [error, setError] = useState(null)
  const [isPending, setIsPending] = useState(false)

  const closeDialog = () => {
    if (!isPending) {
      setDialog(null)
      setError(null)
    }
  }

  const applyResult = (result, successDescription) => {
    if (!result.success) {
      setError(result.error || 'Cette opération n’a pas pu aboutir.')
      setIsPending(false)
      return false
    }

    onAgentChange(result.data)
    onFeedback({
      severity: result.data?.warnings?.length > 0 ? 'warning' : 'success',
      title: result.data?.warnings?.length > 0 ? 'Opération effectuée avec un avertissement' : 'Opération effectuée',
      description: result.data?.warnings?.length > 0
        ? `${successDescription} L’email d’information n’a toutefois pas pu être envoyé.`
        : successDescription
    })
    setDialog(null)
    setError(null)
    setIsPending(false)
    return true
  }

  const disable = async () => {
    setError(null)
    setIsPending(true)
    const result = await disableAgentAction(agent.id, {
      expectedUpdatedAt: agent.updatedAt
    })

    applyResult(result, 'Le compte est désactivé. Ses accès territoriaux ont été conservés.')
  }

  const restore = async () => {
    setError(null)
    setIsPending(true)
    const result = await restoreAgentAction(agent.id, agent.updatedAt)

    applyResult(result, 'Le compte est restauré. Ses accès datés sont de nouveau pris en compte.')
  }

  const notify = async () => {
    setError(null)
    setIsPending(true)
    const result = await sendAgentAccountCreationNotificationAction(agent.id)

    if (applyResult(result, 'L’email de création de compte a bien été envoyé.')) {
      setDialog(null)
    }
  }

  return (
    <section className='border border-gray-200 bg-white p-5 md:p-6'>
      <h2 className='fr-h4 fr-mb-3w'>Gestion du compte</h2>
      <div className='grid grid-cols-1 gap-5 lg:grid-cols-2'>
        <div>
          <p className='fr-text--sm fr-text--bold fr-mb-1w'>Email de création de compte</p>
          <p className='fr-text--sm fr-mb-2w text-[var(--text-mention-grey)]'>
            Dernier envoi : {formatDateTime(agent.accountCreationMailSentAt).toLowerCase()}
          </p>
          <AccountNotificationControl agent={agent} openDialog={setDialog} />
        </div>
        <AccountStateControl agent={agent} openDialog={setDialog} />
      </div>

      <AccountActionDialog
        agent={agent}
        close={closeDialog}
        dialog={dialog}
        disable={disable}
        error={error}
        isPending={isPending}
        notify={notify}
        restore={restore}
      />
    </section>
  )
}

const AgentDetail = ({agent: initialAgent, messageKey, permissionCatalog}) => {
  const router = useRouter()
  const [agent, setAgent] = useState(initialAgent)
  const [feedback, setFeedback] = useState(MESSAGE_CONTENT[messageKey] ?? null)

  useEffect(() => {
    setAgent(initialAgent)
  }, [initialAgent])

  const updateAgent = nextAgent => {
    setAgent(nextAgent)
    router.refresh({showProgress: false})
  }

  return (
    <main className='min-h-screen bg-[#f7f7fb] pb-12'>
      <div className='fr-container pt-6 md:pt-8'>
        <Breadcrumb
          currentPageLabel={getAgentName(agent)}
          homeLinkProps={{href: '/'}}
          segments={[{
            label: 'Agents',
            linkProps: {href: '/agents'}
          }]}
        />

        {feedback && (
          <div className='fr-mb-3w'>
            <Alert
              closable
              description={feedback.description}
              severity={feedback.severity}
              title={feedback.title}
              onClose={() => setFeedback(null)}
            />
          </div>
        )}

        <header className='mb-6 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between'>
          <div className='min-w-0'>
            <div className='mb-2 flex flex-wrap items-center gap-2'>
              <StatusBadge status={agent.accountStatus} type='account' />
              <StatusBadge status={agent.accessStatus} />
            </div>
            <h1 className='fr-h2 fr-mb-1w break-words'>{getAgentName(agent)}</h1>
            {agent.email && <CopyableEmail email={agent.email} />}
          </div>
          <div className='flex flex-wrap gap-2'>
            {agent.accountStatus === 'ACTIVE' && (
              <ImpersonateUserButton
                label='Prendre sa place'
                priority='secondary'
                size='small'
                targetLabel={getAgentName(agent)}
                targetUserId={agent.id}
              />
            )}
            <Button
              iconId='fr-icon-edit-line'
              priority='secondary'
              size='small'
              linkProps={{href: `/agents/${agent.id}/modifier`}}
            >
              Modifier
            </Button>
          </div>
        </header>

        <div className='flex flex-col gap-5'>
          <section className='border border-gray-200 bg-white p-5 md:p-6'>
            <h2 className='fr-h4 fr-mb-3w'>Informations</h2>
            <dl className='grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3'>
              <Field label='Prénom' value={agent.firstName} />
              <Field label='Nom' value={agent.lastName} />
              <Field label='Email'>
                {agent.email ? <CopyableEmail email={agent.email} /> : 'Non renseigné'}
              </Field>
              <Field label='Fonction' value={agent.jobTitle} />
              <Field label='Téléphone' value={agent.phoneNumber} />
              <Field label='Dernière connexion' value={formatDateTime(agent.lastLoginAt)} />
              <Field label='Compte créé le' value={formatDateTime(agent.createdAt)} />
              <Field label='Accès territorial' value={getAgentAccessStatusLabel(agent.accessStatus)} />
            </dl>
          </section>

          <AgentHabilitations agent={agent} permissionCatalog={permissionCatalog} />
          <AccountManagement
            agent={agent}
            onAgentChange={updateAgent}
            onFeedback={setFeedback}
          />
        </div>
      </div>
    </main>
  )
}

export default AgentDetail
