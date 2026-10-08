const DeclarantManagementCard = ({id, title, description, children}) => (
  <section
    aria-labelledby={`${id}-title`}
    className='min-w-0 border border-[var(--border-default-grey)] bg-[var(--background-default-grey)] p-5 md:p-6'
  >
    <h2 id={`${id}-title`} className='fr-h5 fr-mb-2w'>{title}</h2>
    {description && (
      <p className='fr-text--sm fr-mb-3w text-[var(--text-mention-grey)]'>{description}</p>
    )}
    {children}
  </section>
)

export default DeclarantManagementCard
