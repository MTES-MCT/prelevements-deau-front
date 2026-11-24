'use client'

import dynamic from 'next/dynamic'

const QuickDeclarationMap = dynamic(() => import('./quick-declaration-map.js'), {
  ssr: false,
  loading: () => <div className='flex h-full items-center justify-center bg-gray-100' role='status'>Chargement de la carte…</div>
})

export function QuickDeclarationLayout({toolbar, map, children}) {
  return (
    <div className='grid grid-cols-1 gap-x-3 gap-y-3 xl:grid-cols-[minmax(0,1fr)_minmax(300px,0.72fr)] xl:items-start xl:gap-y-0'>
      <div className='contents xl:col-start-1 xl:row-start-1 xl:block xl:min-w-0'>
        <div className='order-1'>{toolbar}</div>
        <section className='order-3 min-w-0'>{children}</section>
      </div>
      {map}
    </div>
  )
}

export default function QuickDeclarationMapPanel({contactHref, ...mapProps}) {
  return (
    <aside aria-label='Carte des points de la déclaration' className='sticky top-0 z-20 order-2 self-start bg-white pb-2 shadow-xs xl:order-none xl:col-start-2 xl:row-start-1 xl:top-3 xl:pb-0 xl:shadow-none'>
      {contactHref && (
        <div className='fr-mb-1v text-center'>
          <a className='fr-link text-xs' href={contactHref} rel='noreferrer' target='_blank'>Signaler une modification sur mes points</a>
        </div>
      )}
      <div className='h-[220px] sm:h-[260px] md:h-[300px] xl:h-[calc(100vh-4rem)]'>
        <QuickDeclarationMap {...mapProps} />
      </div>
    </aside>
  )
}
