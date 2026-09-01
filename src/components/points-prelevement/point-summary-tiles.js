const PointSummaryTiles = ({presentation}) => (
  <div className='flex flex-wrap items-stretch gap-1 text-[0.625rem] leading-[0.875rem] text-gray-700'>
    <span
      className='inline-flex min-w-0 items-center gap-1 break-words border border-gray-200 bg-white px-1.5 py-0.5'
      title={presentation.usage.accessibleLabel}
    >
      <span className='sr-only'>{presentation.usage.accessibleLabel}</span>
      <span
        aria-hidden='true'
        className='h-2.5 w-2.5 shrink-0 rounded-full ring-1 ring-gray-300'
        style={{background: presentation.usage.markerBackground}}
      />
      <span aria-hidden='true'>{presentation.usage.label}</span>
    </span>
    <span
      className='inline-flex items-center border border-gray-200 bg-gray-100 px-1.5 py-0.5'
      title={presentation.flowType.accessibleLabel}
    >
      <span className='sr-only'>Type de point : </span>
      {presentation.flowType.label}
    </span>
    {presentation.withdrawalType && (
      <span
        className='inline-flex items-center border border-gray-200 bg-gray-100 px-1.5 py-0.5'
        title={presentation.withdrawalType.accessibleLabel}
      >
        <span className='sr-only'>Type de prélèvement / rejet : </span>
        {presentation.withdrawalType.label}
      </span>
    )}
    {presentation.nature && (
      <span
        className='inline-flex items-center border border-gray-200 bg-gray-100 px-1.5 py-0.5'
        title={presentation.nature.accessibleLabel}
      >
        <span className='sr-only'>Origine prélèvement / rejet : </span>
        {presentation.nature.label}
      </span>
    )}
  </div>
)

export default PointSummaryTiles
