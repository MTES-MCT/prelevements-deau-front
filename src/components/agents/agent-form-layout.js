import Link from 'next/link'

const AgentFormLayout = ({agentId = null, children, description, title}) => (
  <main className='min-h-screen bg-[var(--background-alt-grey)] pb-12'>
    <div className='fr-container pt-6 md:pt-8'>
      <nav aria-label='Fil d’Ariane' className='fr-mb-3w text-sm'>
        <Link className='fr-link' href='/agents'>Agents</Link>
        {agentId && <span aria-hidden='true'> / </span>}
        {agentId && <Link className='fr-link' href={`/agents/${agentId}`}>Fiche de l’agent</Link>}
      </nav>
      <header className='mb-6'>
        <h1 className='fr-h2 fr-mb-1w'>{title}</h1>
        {description && <p className='fr-text--sm fr-mb-0 max-w-3xl text-gray-700'>{description}</p>}
      </header>
      {children}
    </div>
  </main>
)

export default AgentFormLayout
