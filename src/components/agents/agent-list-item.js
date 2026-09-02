import Link from 'next/link'

import CopyableEmail from '@/components/ui/CopyableEmail/index.js'
import {
  getAgentAccountStatusLabel,
  getAgentActiveZoneSummary,
  getAgentName,
  getAgentVisibleZones
} from '@/lib/agents.js'

const rowGridClassName = 'md:grid-cols-[minmax(0,1.35fr)_minmax(0,.9fr)_minmax(0,1.25fr)_minmax(6rem,.55fr)_minmax(5.5rem,auto)]'

const AgentIdentity = ({agent}) => (
  <section className='min-w-0'>
    <div className='flex min-w-0 items-start gap-2'>
      <span
        aria-hidden='true'
        className='ri-user-settings-line mt-0.5 shrink-0 text-[#000091] [&::after]:![--icon-size:0.9rem] [&::before]:![--icon-size:0.9rem]'
      />
      <div className='min-w-0'>
        <div className='break-words text-[0.9rem] font-semibold leading-snug text-gray-900'>
          {getAgentName(agent)}
        </div>
        {agent.email && (
          <div className='mt-1 min-w-0 text-xs leading-snug text-gray-600'>
            <CopyableEmail email={agent.email} />
          </div>
        )}
      </div>
    </div>
  </section>
)

const AgentContact = ({agent}) => (
  <section className='min-w-0 text-xs leading-snug text-gray-700'>
    <span className='mb-1 block text-[0.68rem] font-semibold text-gray-500 md:hidden'>Coordonnées</span>
    {agent.jobTitle && <div className='break-words font-medium'>{agent.jobTitle}</div>}
    {agent.phoneNumber && <div className={agent.jobTitle ? 'mt-0.5' : ''}>{agent.phoneNumber}</div>}
    {!agent.jobTitle && !agent.phoneNumber && <span className='text-gray-500'>Non renseigné</span>}
  </section>
)

const AgentZones = ({agent}) => {
  const {visible, remainingCount} = getAgentVisibleZones(agent)

  return (
    <section className='min-w-0'>
      <span className='mb-1 block text-[0.68rem] font-semibold text-gray-500 md:hidden'>Accès aux zones</span>
      <div className='text-[0.82rem] font-semibold leading-snug text-gray-900'>
        {getAgentActiveZoneSummary(agent)}
      </div>
      {visible.length > 0 && (
        <div className='mt-1 flex min-w-0 flex-wrap items-center gap-1'>
          {visible.map(zone => (
            <span
              key={zone.id}
              className='inline-flex max-w-full bg-gray-100 px-1.5 py-0.5 text-[0.68rem] font-medium leading-none text-gray-700'
            >
              <span className='truncate'>{zone.name}</span>
            </span>
          ))}
          {remainingCount > 0 && (
            <span className='text-[0.68rem] text-gray-500'>+ {remainingCount}</span>
          )}
        </div>
      )}
    </section>
  )
}

const AgentStatus = ({agent}) => {
  const active = agent.accountStatus === 'ACTIVE'

  return (
    <section className='min-w-0'>
      <span className='mb-1 block text-[0.68rem] font-semibold text-gray-500 md:hidden'>État</span>
      <span className={`fr-badge fr-badge--sm ${active ? 'fr-badge--success' : 'fr-badge--warning'}`}>
        {getAgentAccountStatusLabel(agent.accountStatus)}
      </span>
    </section>
  )
}

const AgentListItem = ({agent}) => (
  <article className={`grid gap-3 bg-white px-3 py-3 transition-colors hover:bg-[#f7f7ff] ${rowGridClassName} md:items-center`}>
    <AgentIdentity agent={agent} />
    <AgentContact agent={agent} />
    <AgentZones agent={agent} />
    <AgentStatus agent={agent} />
    <Link
      className='fr-link fr-icon-arrow-right-line fr-link--icon-right whitespace-nowrap text-sm font-medium'
      href={`/agents/${agent.id}`}
    >
      Consulter
    </Link>
  </article>
)

export const AgentListHeader = () => (
  <div className={`hidden gap-3 border-b border-gray-200 bg-white px-3 py-1.5 text-[0.74rem] font-semibold leading-none text-gray-600 md:grid ${rowGridClassName} md:items-center`}>
    <div>Agent</div>
    <div>Coordonnées</div>
    <div>Accès aux zones</div>
    <div>État</div>
    <div aria-hidden='true' />
  </div>
)

export default AgentListItem
