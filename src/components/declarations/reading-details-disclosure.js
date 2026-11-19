export default function ReadingDetailsDisclosure({children}) {
  return (
    <details className='group mt-3 border-t border-[var(--border-default-grey)]'>
      <summary className='flex w-fit cursor-pointer list-none items-center gap-1.5 py-2 text-sm font-medium text-[var(--text-action-high-blue-france)] [&::-webkit-details-marker]:hidden'>
        <span aria-hidden='true' className='fr-icon-arrow-down-s-line fr-icon--sm shrink-0 group-open:rotate-180' />
        Détail des données
      </summary>
      {children}
    </details>
  )
}
