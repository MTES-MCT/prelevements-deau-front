const colors = {
  index: 'var(--text-action-high-blue-france, #000091)',
  direct: 'var(--text-label-brown-caramel, #845d48)',
  computed: 'var(--text-label-green-emeraude, #297254)'
}

export default function ReadingLegend({type, children}) {
  const color = colors[type] ?? 'var(--text-mention-grey, #666)'
  return (
    <span className='inline-flex items-center gap-1.5' style={{color}}>
      <span aria-hidden='true' className='shrink-0' style={{border: `1.5px solid ${color}`, width: type === 'index' ? 9 : 18, height: 9, borderRadius: type === 'index' ? '50%' : 1,
        background: type === 'computed' ? `repeating-linear-gradient(-45deg, transparent, transparent 3px, ${color} 3px, ${color} 4px)` : type === 'direct' ? `color-mix(in srgb, ${color} 22%, transparent)` : 'var(--background-default-grey, #fff)'}} />
      {children}
    </span>
  )
}
