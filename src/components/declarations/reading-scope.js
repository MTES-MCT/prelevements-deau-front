const blue = 'var(--text-action-high-blue-france, #000091)'

// Put the single caption on the widest visible span. Individual readings keep
// their own tick when there is no measured interval between them.
export default function ReadingScope({ranges, position, label}) {
  if (!ranges.length) return null
  const segments = ranges.map(({start, end}) => ({start, end, left: position(start), right: position(end)}))
  const main = segments.reduce((a, b) => b.right - b.left >= a.right - a.left ? b : a)
  return <div data-reading-scope='' className='relative mx-px h-8 min-w-0' style={{color: blue}}>
    <span className='absolute top-0 -translate-x-1/2 whitespace-nowrap text-xs font-semibold'
      style={{left: `clamp(3rem, ${(main.left + main.right) / 2}%, calc(100% - 3rem))`}}>{label}</span>
    {segments.map(({start, end, left, right}) =>
      <span key={start} data-scope-range='' data-start={start} data-end={end} aria-hidden='true'
        className={start === end ? 'absolute top-[1.05rem] h-2 w-1.5 -translate-x-1/2 border-t-2 after:mx-auto after:block after:h-1.5 after:w-px after:bg-current'
          : 'absolute top-[1.05rem] h-1.5 border-x border-t-2'}
        style={{left: left + '%', width: start === end ? undefined : (right - left) + '%', borderColor: 'currentColor'}} />)}
  </div>
}
