import AdminSubNavigation from '@/components/admin/admin-sub-navigation.js'

const AdminPageShell = ({
  actions = null,
  children,
  description,
  title
}) => (
  <main className='min-h-screen bg-[var(--background-alt-grey)] pb-12'>
    <div className='fr-container pt-8 md:pt-10'>
      <header className='mb-5 flex flex-col gap-4 md:flex-row md:items-start md:justify-between'>
        <div className='min-w-0'>
          <h1 className='fr-h2 fr-mb-1w'>{title}</h1>
          {description && (
            <p className='fr-text--sm fr-mb-0 text-[var(--text-default-grey)]'>{description}</p>
          )}
        </div>
        {actions && <div className='shrink-0'>{actions}</div>}
      </header>

      <AdminSubNavigation />
      {children}
    </div>
  </main>
)

export default AdminPageShell
